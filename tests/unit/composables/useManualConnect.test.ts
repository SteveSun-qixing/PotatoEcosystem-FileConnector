/**
 * useManualConnect 组合式函数测试
 * @module tests/unit/composables/useManualConnect
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useManualConnect, type ManualMode, type BindingConfig } from '@renderer/composables/useManualConnect';
import { useCardsStore } from '@renderer/stores/cards';
import { useFilesStore } from '@renderer/stores/files';
import { useConnectorStore } from '@renderer/stores/connector';
import {
  createCardInfo,
  mockVideoCards,
  mockNumberedCards
} from '../../fixtures/cards';
import {
  createFileInfo,
  mockVideoFiles,
  mockNumberedFiles
} from '../../fixtures/files';
import { createBindingItem } from '../../fixtures/bindings';

describe('useManualConnect', () => {
  beforeEach(() => {
    // 为每个测试创建新的 Pinia 实例
    setActivePinia(createPinia());

    // 模拟 window.electronAPI
    vi.stubGlobal('window', {
      electronAPI: {
        loadCardsFromBox: vi.fn(),
        loadFilesFromFolder: vi.fn(),
        openFileDialog: vi.fn(),
        openFolderDialog: vi.fn()
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ===== 初始状态测试 =====
  describe('初始状态', () => {
    it('应该返回正确的初始状态', () => {
      const { cards, files, bindings, mode, loading, error } = useManualConnect();

      expect(cards.value).toEqual([]);
      expect(files.value).toEqual([]);
      expect(bindings.value).toEqual([]);
      expect(mode.value).toBe('table');
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
    });

    it('应该初始化计算属性', () => {
      const { selectedCards, selectedFiles, boundCount, unboundCount, usedFilePaths } = useManualConnect();

      expect(selectedCards.value).toEqual([]);
      expect(selectedFiles.value).toEqual([]);
      expect(boundCount.value).toBe(0);
      expect(unboundCount.value).toBe(0);
      expect(usedFilePaths.value).toEqual([]);
    });
  });

  // ===== 绑定操作测试 =====
  describe('绑定操作', () => {
    describe('addBinding', () => {
      it('应该添加绑定', () => {
        const cardsStore = useCardsStore();
        const { addBinding, bindings } = useManualConnect();

        // 先添加卡片
        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);

        // 添加绑定
        addBinding('card-1', '/files/video.mp4');

        expect(bindings.value).toHaveLength(1);
        expect(bindings.value[0].cardId).toBe('card-1');
        expect(bindings.value[0].filePath).toBe('/files/video.mp4');
      });

      it('不存在的卡片不应该添加绑定', () => {
        const { addBinding, bindings } = useManualConnect();

        // 尝试绑定不存在的卡片
        addBinding('non-existent-card', '/files/video.mp4');

        expect(bindings.value).toHaveLength(0);
      });

      it('应该自动确定资源字段', () => {
        const cardsStore = useCardsStore();
        const { addBinding, bindings } = useManualConnect();

        // 添加带有资源字段的卡片
        const cardWithFields = createCardInfo({
          id: 'card-1',
          baseCards: [
            {
              id: 'base-1',
              pluginType: 'video',
              resourceFields: [
                { name: 'video_file', type: 'file', required: true },
                { name: 'cover_image', type: 'file', required: false }
              ]
            }
          ]
        });
        cardsStore.setCards([cardWithFields]);

        addBinding('card-1', '/files/video.mp4');

        expect(bindings.value[0].resourceField).toBe('video_file');
      });

      it('应该使用提供的资源字段', () => {
        const cardsStore = useCardsStore();
        const { addBinding, bindings } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        addBinding('card-1', '/files/video.mp4', 'custom_field');

        expect(bindings.value[0].resourceField).toBe('custom_field');
      });

      it('应该标记文件为已使用', () => {
        const cardsStore = useCardsStore();
        const filesStore = useFilesStore();
        const { addBinding, usedFilePaths } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        filesStore.setFiles([createFileInfo({ path: '/files/video.mp4' })]);

        addBinding('card-1', '/files/video.mp4');

        expect(usedFilePaths.value).toContain('/files/video.mp4');
      });
    });

    describe('removeBinding', () => {
      it('应该移除绑定', () => {
        const cardsStore = useCardsStore();
        const { addBinding, removeBinding, bindings } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        addBinding('card-1', '/files/video.mp4');

        expect(bindings.value).toHaveLength(1);

        removeBinding('card-1');

        expect(bindings.value).toHaveLength(0);
      });

      it('应该解除文件的使用标记', () => {
        const cardsStore = useCardsStore();
        const filesStore = useFilesStore();
        const { addBinding, removeBinding, usedFilePaths } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        filesStore.setFiles([createFileInfo({ path: '/files/video.mp4' })]);

        addBinding('card-1', '/files/video.mp4');
        expect(usedFilePaths.value).toContain('/files/video.mp4');

        removeBinding('card-1');
        expect(usedFilePaths.value).not.toContain('/files/video.mp4');
      });

      it('移除不存在的绑定不应该出错', () => {
        const { removeBinding, bindings } = useManualConnect();

        expect(() => removeBinding('non-existent')).not.toThrow();
        expect(bindings.value).toHaveLength(0);
      });
    });

    describe('updateBinding', () => {
      it('应该更新现有绑定', () => {
        const cardsStore = useCardsStore();
        const { addBinding, updateBinding, bindings } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        addBinding('card-1', '/files/old-video.mp4');

        updateBinding('card-1', '/files/new-video.mp4');

        expect(bindings.value).toHaveLength(1);
        expect(bindings.value[0].filePath).toBe('/files/new-video.mp4');
      });

      it('不存在的绑定应该创建新绑定', () => {
        const cardsStore = useCardsStore();
        const { updateBinding, bindings } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        updateBinding('card-1', '/files/video.mp4');

        expect(bindings.value).toHaveLength(1);
        expect(bindings.value[0].cardId).toBe('card-1');
      });

      it('应该正确更新文件使用状态', () => {
        const cardsStore = useCardsStore();
        const filesStore = useFilesStore();
        const { addBinding, updateBinding, usedFilePaths } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        filesStore.setFiles([
          createFileInfo({ path: '/files/old.mp4' }),
          createFileInfo({ path: '/files/new.mp4' })
        ]);

        addBinding('card-1', '/files/old.mp4');
        expect(usedFilePaths.value).toContain('/files/old.mp4');

        updateBinding('card-1', '/files/new.mp4');
        expect(usedFilePaths.value).not.toContain('/files/old.mp4');
        expect(usedFilePaths.value).toContain('/files/new.mp4');
      });
    });

    describe('clearBindings', () => {
      it('应该清空所有绑定', () => {
        const cardsStore = useCardsStore();
        const { addBinding, clearBindings, bindings } = useManualConnect();

        cardsStore.setCards(mockVideoCards);
        mockVideoCards.forEach((card, index) => {
          addBinding(card.id, `/files/video${index}.mp4`);
        });

        expect(bindings.value.length).toBeGreaterThan(0);

        clearBindings();

        expect(bindings.value).toHaveLength(0);
      });

      it('应该解除所有文件的使用标记', () => {
        const cardsStore = useCardsStore();
        const filesStore = useFilesStore();
        const { addBinding, clearBindings, usedFilePaths } = useManualConnect();

        cardsStore.setCards(mockVideoCards);
        filesStore.setFiles(mockVideoFiles);
        
        addBinding(mockVideoCards[0].id, mockVideoFiles[0].path);
        addBinding(mockVideoCards[1].id, mockVideoFiles[1].path);

        expect(usedFilePaths.value.length).toBe(2);

        clearBindings();

        expect(usedFilePaths.value).toHaveLength(0);
      });
    });
  });

  // ===== 验证逻辑测试 =====
  describe('验证逻辑', () => {
    describe('validateBindings', () => {
      it('没有绑定应该返回错误', () => {
        const { validateBindings } = useManualConnect();

        const result = validateBindings();

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.code === 'NO_BINDINGS')).toBe(true);
      });

      it('卡片不存在应该返回错误', () => {
        const connectorStore = useConnectorStore();
        const { validateBindings } = useManualConnect();

        // 直接设置一个绑定，但不添加对应的卡片
        connectorStore.addBinding(createBindingItem({ cardId: 'missing-card' }));

        const result = validateBindings();

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.code === 'CARD_NOT_FOUND')).toBe(true);
      });

      it('文件路径为空应该返回错误', () => {
        const cardsStore = useCardsStore();
        const connectorStore = useConnectorStore();
        const { validateBindings } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        connectorStore.addBinding(createBindingItem({ cardId: 'card-1', filePath: '' }));

        const result = validateBindings();

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.code === 'FILE_NOT_SET')).toBe(true);
      });

      it('文件不存在应该返回错误', () => {
        const cardsStore = useCardsStore();
        const connectorStore = useConnectorStore();
        const filesStore = useFilesStore();
        const { validateBindings } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        filesStore.setFiles([]); // 没有文件
        connectorStore.addBinding(createBindingItem({ 
          cardId: 'card-1', 
          filePath: '/files/missing.mp4' 
        }));

        const result = validateBindings();

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.code === 'FILE_NOT_FOUND')).toBe(true);
      });

      it('重复文件绑定应该返回错误', () => {
        const cardsStore = useCardsStore();
        const connectorStore = useConnectorStore();
        const filesStore = useFilesStore();
        const { validateBindings } = useManualConnect();

        cardsStore.setCards([
          createCardInfo({ id: 'card-1' }),
          createCardInfo({ id: 'card-2' })
        ]);
        filesStore.setFiles([createFileInfo({ path: '/files/shared.mp4' })]);
        
        // 同一文件绑定到两个卡片
        connectorStore.addBinding(createBindingItem({ 
          cardId: 'card-1', 
          filePath: '/files/shared.mp4' 
        }));
        connectorStore.addBinding(createBindingItem({ 
          cardId: 'card-2', 
          filePath: '/files/shared.mp4' 
        }));

        const result = validateBindings();

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.code === 'DUPLICATE_FILE')).toBe(true);
      });

      it('有效的绑定应该通过验证', () => {
        const cardsStore = useCardsStore();
        const filesStore = useFilesStore();
        const { addBinding, validateBindings } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        filesStore.setFiles([createFileInfo({ path: '/files/video.mp4' })]);
        addBinding('card-1', '/files/video.mp4');

        const result = validateBindings();

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  // ===== 模式切换测试 =====
  describe('模式切换', () => {
    it('应该正确切换到图形模式', () => {
      const { mode, setMode } = useManualConnect();

      expect(mode.value).toBe('table');

      setMode('graph');

      expect(mode.value).toBe('graph');
    });

    it('应该正确切换到表格模式', () => {
      const { mode, setMode } = useManualConnect();

      setMode('graph');
      expect(mode.value).toBe('graph');

      setMode('table');
      expect(mode.value).toBe('table');
    });

    it('应该同步到 connectorStore', () => {
      const connectorStore = useConnectorStore();
      const { setMode } = useManualConnect();

      setMode('graph');

      expect(connectorStore.view).toBe('graph');
    });
  });

  // ===== 卡片操作测试 =====
  describe('卡片操作', () => {
    describe('selectCard / deselectCard / toggleCard', () => {
      it('应该选择卡片', () => {
        const cardsStore = useCardsStore();
        const { selectCard, selectedCards } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        selectCard('card-1');

        expect(selectedCards.value).toHaveLength(1);
        expect(selectedCards.value[0].id).toBe('card-1');
      });

      it('应该取消选择卡片', () => {
        const cardsStore = useCardsStore();
        const { selectCard, deselectCard, selectedCards } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        selectCard('card-1');
        expect(selectedCards.value).toHaveLength(1);

        deselectCard('card-1');
        expect(selectedCards.value).toHaveLength(0);
      });

      it('应该切换卡片选择状态', () => {
        const cardsStore = useCardsStore();
        const { toggleCard, selectedCards } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);

        toggleCard('card-1');
        expect(selectedCards.value).toHaveLength(1);

        toggleCard('card-1');
        expect(selectedCards.value).toHaveLength(0);
      });
    });

    describe('selectAllCards / deselectAllCards', () => {
      it('应该全选卡片', () => {
        const cardsStore = useCardsStore();
        const { selectAllCards, selectedCards } = useManualConnect();

        cardsStore.setCards(mockVideoCards);
        selectAllCards();

        expect(selectedCards.value).toHaveLength(mockVideoCards.length);
      });

      it('应该取消全选卡片', () => {
        const cardsStore = useCardsStore();
        const { selectAllCards, deselectAllCards, selectedCards } = useManualConnect();

        cardsStore.setCards(mockVideoCards);
        selectAllCards();
        expect(selectedCards.value).toHaveLength(mockVideoCards.length);

        deselectAllCards();
        expect(selectedCards.value).toHaveLength(0);
      });
    });

    describe('loadCardsFromBox', () => {
      it('应该从卡盒加载卡片', async () => {
        const mockCards = mockVideoCards;
        (window.electronAPI?.loadCardsFromBox as ReturnType<typeof vi.fn>).mockResolvedValue(mockCards);

        const { loadCardsFromBox, cards, loading } = useManualConnect();

        const promise = loadCardsFromBox('/path/to/box');

        expect(loading.value).toBe(true);

        await promise;

        expect(loading.value).toBe(false);
        expect(cards.value).toEqual(mockCards);
      });

      it('加载失败应该设置错误', async () => {
        const errorMessage = '加载失败';
        (window.electronAPI?.loadCardsFromBox as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

        const { loadCardsFromBox, error, loading } = useManualConnect();

        await loadCardsFromBox('/path/to/box');

        expect(loading.value).toBe(false);
        expect(error.value).toBe(errorMessage);
      });
    });
  });

  // ===== 文件操作测试 =====
  describe('文件操作', () => {
    describe('addFiles / removeFile / clearFiles', () => {
      it('应该添加文件', () => {
        const { addFiles, files } = useManualConnect();

        addFiles(mockVideoFiles);

        expect(files.value).toHaveLength(mockVideoFiles.length);
      });

      it('应该移除文件', () => {
        const filesStore = useFilesStore();
        const { removeFile, files } = useManualConnect();

        const testFiles = [
          createFileInfo({ path: '/files/video1.mp4' }),
          createFileInfo({ path: '/files/video2.mp4' }),
          createFileInfo({ path: '/files/video3.mp4' })
        ];

        filesStore.setFiles(testFiles);
        expect(files.value).toHaveLength(3);

        removeFile(testFiles[0].path);

        expect(files.value).toHaveLength(2);
      });

      it('移除已绑定的文件应该同时移除绑定', () => {
        const cardsStore = useCardsStore();
        const filesStore = useFilesStore();
        const { addBinding, removeFile, bindings } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        filesStore.setFiles([createFileInfo({ path: '/files/video.mp4' })]);
        
        addBinding('card-1', '/files/video.mp4');
        expect(bindings.value).toHaveLength(1);

        removeFile('/files/video.mp4');

        expect(bindings.value).toHaveLength(0);
      });

      it('应该清空所有文件', () => {
        const filesStore = useFilesStore();
        const { clearFiles, files } = useManualConnect();

        filesStore.setFiles(mockVideoFiles);
        expect(files.value.length).toBeGreaterThan(0);

        clearFiles();

        expect(files.value).toHaveLength(0);
      });
    });

    describe('selectFile / deselectFile', () => {
      it('应该选择文件', () => {
        const filesStore = useFilesStore();
        const { selectFile, selectedFiles } = useManualConnect();

        filesStore.setFiles([createFileInfo({ path: '/files/video.mp4' })]);
        selectFile('/files/video.mp4');

        expect(selectedFiles.value).toHaveLength(1);
      });

      it('应该取消选择文件', () => {
        const filesStore = useFilesStore();
        const { selectFile, deselectFile, selectedFiles } = useManualConnect();

        filesStore.setFiles([createFileInfo({ path: '/files/video.mp4' })]);
        selectFile('/files/video.mp4');
        expect(selectedFiles.value).toHaveLength(1);

        deselectFile('/files/video.mp4');
        expect(selectedFiles.value).toHaveLength(0);
      });
    });

    describe('addFilesFromFolder', () => {
      it('应该从文件夹加载文件', async () => {
        (window.electronAPI?.loadFilesFromFolder as ReturnType<typeof vi.fn>).mockResolvedValue(mockVideoFiles);

        const { addFilesFromFolder, files, loading } = useManualConnect();

        const promise = addFilesFromFolder('/path/to/folder');
        expect(loading.value).toBe(true);

        await promise;

        expect(loading.value).toBe(false);
        expect(files.value.length).toBeGreaterThan(0);
      });

      it('加载失败应该设置错误', async () => {
        const errorMessage = '加载失败';
        (window.electronAPI?.loadFilesFromFolder as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

        const { addFilesFromFolder, error, loading } = useManualConnect();

        await addFilesFromFolder('/path/to/folder');

        expect(loading.value).toBe(false);
        expect(error.value).toBe(errorMessage);
      });
    });
  });

  // ===== 工具方法测试 =====
  describe('工具方法', () => {
    describe('getBindingByCardId', () => {
      it('应该返回指定卡片的绑定', () => {
        const cardsStore = useCardsStore();
        const { addBinding, getBindingByCardId } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        addBinding('card-1', '/files/video.mp4');

        const binding = getBindingByCardId('card-1');

        expect(binding).toBeDefined();
        expect(binding?.filePath).toBe('/files/video.mp4');
      });

      it('不存在的绑定应该返回 undefined', () => {
        const { getBindingByCardId } = useManualConnect();

        const binding = getBindingByCardId('non-existent');

        expect(binding).toBeUndefined();
      });
    });

    describe('getCardById', () => {
      it('应该返回指定ID的卡片', () => {
        const cardsStore = useCardsStore();
        const { getCardById } = useManualConnect();

        const card = createCardInfo({ id: 'card-1', name: 'Test Card' });
        cardsStore.setCards([card]);

        const result = getCardById('card-1');

        expect(result).toBeDefined();
        expect(result?.name).toBe('Test Card');
      });

      it('不存在的卡片应该返回 undefined', () => {
        const { getCardById } = useManualConnect();

        const result = getCardById('non-existent');

        expect(result).toBeUndefined();
      });
    });

    describe('getFileByPath', () => {
      it('应该返回指定路径的文件', () => {
        const filesStore = useFilesStore();
        const { getFileByPath } = useManualConnect();

        const file = createFileInfo({ path: '/files/video.mp4', name: 'video.mp4' });
        filesStore.setFiles([file]);

        const result = getFileByPath('/files/video.mp4');

        expect(result).toBeDefined();
        expect(result?.name).toBe('video.mp4');
      });

      it('不存在的文件应该返回 undefined', () => {
        const { getFileByPath } = useManualConnect();

        const result = getFileByPath('/non/existent/path');

        expect(result).toBeUndefined();
      });
    });

    describe('isCardBound', () => {
      it('已绑定的卡片应该返回 true', () => {
        const cardsStore = useCardsStore();
        const { addBinding, isCardBound } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        addBinding('card-1', '/files/video.mp4');

        expect(isCardBound('card-1')).toBe(true);
      });

      it('未绑定的卡片应该返回 false', () => {
        const cardsStore = useCardsStore();
        const { isCardBound } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);

        expect(isCardBound('card-1')).toBe(false);
      });
    });

    describe('isFileBound', () => {
      it('已绑定的文件应该返回 true', () => {
        const cardsStore = useCardsStore();
        const filesStore = useFilesStore();
        const { addBinding, isFileBound } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        filesStore.setFiles([createFileInfo({ path: '/files/video.mp4' })]);
        addBinding('card-1', '/files/video.mp4');

        expect(isFileBound('/files/video.mp4')).toBe(true);
      });

      it('未绑定的文件应该返回 false', () => {
        const filesStore = useFilesStore();
        const { isFileBound } = useManualConnect();

        filesStore.setFiles([createFileInfo({ path: '/files/video.mp4' })]);

        expect(isFileBound('/files/video.mp4')).toBe(false);
      });
    });
  });

  // ===== 导入导出测试 =====
  describe('导入导出', () => {
    describe('exportConfig', () => {
      it('应该导出配置', () => {
        const cardsStore = useCardsStore();
        const { addBinding, exportConfig } = useManualConnect();

        cardsStore.setCards([
          createCardInfo({ id: 'card-1' }),
          createCardInfo({ id: 'card-2' })
        ]);
        addBinding('card-1', '/files/video1.mp4');
        addBinding('card-2', '/files/video2.mp4');

        const config = exportConfig();

        expect(config.version).toBe('1.0.0');
        expect(config.created).toBeDefined();
        expect(config.bindings).toHaveLength(2);
      });

      it('导出的配置应该包含正确的绑定信息', () => {
        const cardsStore = useCardsStore();
        const { addBinding, exportConfig } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        addBinding('card-1', '/files/video.mp4', 'video_file');

        const config = exportConfig();

        expect(config.bindings[0]).toEqual({
          cardId: 'card-1',
          filePath: '/files/video.mp4',
          resourceField: 'video_file'
        });
      });
    });

    describe('importConfig', () => {
      it('应该导入配置', () => {
        const cardsStore = useCardsStore();
        const filesStore = useFilesStore();
        const { importConfig, bindings } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        filesStore.setFiles([createFileInfo({ path: '/files/video.mp4' })]);

        const config: BindingConfig = {
          version: '1.0.0',
          created: new Date().toISOString(),
          bindings: [
            { cardId: 'card-1', filePath: '/files/video.mp4', resourceField: 'video_file' }
          ]
        };

        importConfig(config);

        expect(bindings.value).toHaveLength(1);
        expect(bindings.value[0].cardId).toBe('card-1');
      });

      it('导入应该清空现有绑定', () => {
        const cardsStore = useCardsStore();
        const filesStore = useFilesStore();
        const { addBinding, importConfig, bindings } = useManualConnect();

        cardsStore.setCards([
          createCardInfo({ id: 'card-1' }),
          createCardInfo({ id: 'card-2' })
        ]);
        filesStore.setFiles([
          createFileInfo({ path: '/files/old.mp4' }),
          createFileInfo({ path: '/files/new.mp4' })
        ]);

        addBinding('card-1', '/files/old.mp4');
        expect(bindings.value).toHaveLength(1);

        const config: BindingConfig = {
          version: '1.0.0',
          created: new Date().toISOString(),
          bindings: [
            { cardId: 'card-2', filePath: '/files/new.mp4', resourceField: 'video_file' }
          ]
        };

        importConfig(config);

        expect(bindings.value).toHaveLength(1);
        expect(bindings.value[0].cardId).toBe('card-2');
      });

      it('无效的绑定应该被跳过', () => {
        const cardsStore = useCardsStore();
        const filesStore = useFilesStore();
        const { importConfig, bindings } = useManualConnect();

        cardsStore.setCards([createCardInfo({ id: 'card-1' })]);
        filesStore.setFiles([createFileInfo({ path: '/files/video.mp4' })]);

        const config: BindingConfig = {
          version: '1.0.0',
          created: new Date().toISOString(),
          bindings: [
            { cardId: 'card-1', filePath: '/files/video.mp4', resourceField: 'video_file' },
            { cardId: 'missing-card', filePath: '/files/missing.mp4', resourceField: 'video_file' } // 无效
          ]
        };

        importConfig(config);

        // 只有有效的绑定被导入
        expect(bindings.value).toHaveLength(1);
        expect(bindings.value[0].cardId).toBe('card-1');
      });
    });
  });

  // ===== 计算属性测试 =====
  describe('计算属性', () => {
    describe('boundCount / unboundCount', () => {
      it('应该正确计算已绑定数量', () => {
        const cardsStore = useCardsStore();
        const { addBinding, boundCount, unboundCount } = useManualConnect();

        cardsStore.setCards(mockVideoCards);
        
        expect(boundCount.value).toBe(0);
        expect(unboundCount.value).toBe(mockVideoCards.length);

        addBinding(mockVideoCards[0].id, '/files/video1.mp4');

        expect(boundCount.value).toBe(1);
        expect(unboundCount.value).toBe(mockVideoCards.length - 1);
      });
    });

    describe('usedFilePaths', () => {
      it('应该返回所有已使用的文件路径', () => {
        const cardsStore = useCardsStore();
        const filesStore = useFilesStore();
        const { addBinding, usedFilePaths } = useManualConnect();

        cardsStore.setCards([
          createCardInfo({ id: 'card-1' }),
          createCardInfo({ id: 'card-2' })
        ]);
        filesStore.setFiles([
          createFileInfo({ path: '/files/video1.mp4' }),
          createFileInfo({ path: '/files/video2.mp4' })
        ]);

        addBinding('card-1', '/files/video1.mp4');
        addBinding('card-2', '/files/video2.mp4');

        expect(usedFilePaths.value).toContain('/files/video1.mp4');
        expect(usedFilePaths.value).toContain('/files/video2.mp4');
      });
    });
  });
});
