/**
 * 手动连接组合式函数
 * @description 管理手动连接模式的状态和操作
 * @module renderer/composables/useManualConnect
 */

import { ref, computed, watch } from 'vue';
import type { Ref } from 'vue';
import { useCardsStore } from '@/stores/cards';
import { useFilesStore } from '@/stores/files';
import { useConnectorStore } from '@/stores/connector';
import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';
import type { BindingItem, ValidationResult, ValidationError } from '@/types/binding';
import type { ViewMode } from '@/types/config';

/**
 * 手动连接模式（表格/图形）
 */
export type ManualMode = 'table' | 'graph';

/**
 * 手动连接返回类型
 */
export interface UseManualConnectReturn {
  // 状态
  cards: Ref<CardInfo[]>;
  files: Ref<FileInfo[]>;
  bindings: Ref<BindingItem[]>;
  mode: Ref<ManualMode>;
  loading: Ref<boolean>;
  error: Ref<string | null>;

  // 计算属性
  selectedCards: Ref<CardInfo[]>;
  selectedFiles: Ref<FileInfo[]>;
  boundCount: Ref<number>;
  unboundCount: Ref<number>;
  usedFilePaths: Ref<string[]>;

  // 绑定操作
  addBinding: (cardId: string, filePath: string, resourceField?: string) => void;
  removeBinding: (cardId: string) => void;
  updateBinding: (cardId: string, filePath: string) => void;
  clearBindings: () => void;
  validateBindings: () => ValidationResult;

  // 模式切换
  setMode: (mode: ManualMode) => void;

  // 卡片操作
  loadCardsFromBox: (boxPath: string) => Promise<void>;
  selectCard: (cardId: string) => void;
  deselectCard: (cardId: string) => void;
  toggleCard: (cardId: string) => void;
  selectAllCards: () => void;
  deselectAllCards: () => void;

  // 文件操作
  addFilesFromFolder: (folderPath: string) => Promise<void>;
  addFiles: (files: FileInfo[]) => void;
  removeFile: (filePath: string) => void;
  clearFiles: () => void;
  selectFile: (filePath: string) => void;
  deselectFile: (filePath: string) => void;

  // 工具方法
  getBindingByCardId: (cardId: string) => BindingItem | undefined;
  getCardById: (cardId: string) => CardInfo | undefined;
  getFileByPath: (filePath: string) => FileInfo | undefined;
  isCardBound: (cardId: string) => boolean;
  isFileBound: (filePath: string) => boolean;

  // 导入导出
  exportConfig: () => BindingConfig;
  importConfig: (config: BindingConfig) => void;
}

/**
 * 绑定配置（导入/导出用）
 */
export interface BindingConfig {
  version: string;
  created: string;
  bindings: Array<{
    cardId: string;
    filePath: string;
    resourceField: string;
  }>;
}

/**
 * 手动连接组合式函数
 */
export function useManualConnect(): UseManualConnectReturn {
  // Store 引用
  const cardsStore = useCardsStore();
  const filesStore = useFilesStore();
  const connectorStore = useConnectorStore();

  // 本地状态
  const mode = ref<ManualMode>('table');
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 计算属性 - 从 Store 获取数据
  const cards = computed(() => cardsStore.cards);
  const files = computed(() => filesStore.files);
  const bindings = computed({
    get: () => connectorStore.bindings,
    set: (value) => connectorStore.setBindings(value)
  });

  const selectedCards = computed(() => cardsStore.selectedCards);
  const selectedFiles = computed(() => filesStore.selectedFiles);

  const boundCount = computed(() => {
    return bindings.value.filter((b) => !!b.filePath).length;
  });

  const unboundCount = computed(() => {
    return cards.value.length - boundCount.value;
  });

  const usedFilePaths = computed(() => {
    return bindings.value
      .filter((b) => !!b.filePath)
      .map((b) => b.filePath);
  });

  // 同步已使用文件到 filesStore
  watch(usedFilePaths, (paths) => {
    filesStore.setUsedPaths(paths);
  }, { immediate: true });

  // ===== 绑定操作 =====

  /**
   * 添加绑定
   */
  function addBinding(cardId: string, filePath: string, resourceField?: string): void {
    const card = cardsStore.getById(cardId);
    if (!card) {
      console.warn(`Card not found: ${cardId}`);
      return;
    }

    // 确定资源字段
    let field = resourceField;
    if (!field && card.baseCards.length > 0) {
      const baseCard = card.baseCards[0];
      const requiredField = baseCard.resourceFields.find((f) => f.required && !f.value);
      field = requiredField?.name || baseCard.resourceFields[0]?.name || 'primary_resource';
    }

    const binding: BindingItem = {
      cardId,
      filePath,
      resourceField: field || 'primary_resource',
      status: 'pending'
    };

    connectorStore.addBinding(binding);

    // 标记文件为已使用
    filesStore.markAsUsed(filePath);
  }

  /**
   * 移除绑定
   */
  function removeBinding(cardId: string): void {
    const existing = getBindingByCardId(cardId);
    if (existing && existing.filePath) {
      filesStore.markAsUnused(existing.filePath);
    }
    connectorStore.removeBinding(cardId);
  }

  /**
   * 更新绑定
   */
  function updateBinding(cardId: string, filePath: string): void {
    const existing = getBindingByCardId(cardId);
    if (existing) {
      // 解除原文件的使用标记
      if (existing.filePath) {
        filesStore.markAsUnused(existing.filePath);
      }
      // 更新绑定
      connectorStore.addBinding({
        ...existing,
        filePath,
        status: 'pending'
      });
      // 标记新文件为已使用
      filesStore.markAsUsed(filePath);
    } else {
      // 如果不存在则添加
      addBinding(cardId, filePath);
    }
  }

  /**
   * 清空所有绑定
   */
  function clearBindings(): void {
    // 解除所有文件的使用标记
    bindings.value.forEach((b) => {
      if (b.filePath) {
        filesStore.markAsUnused(b.filePath);
      }
    });
    connectorStore.clearBindings();
  }

  /**
   * 验证绑定
   */
  function validateBindings(): ValidationResult {
    const errors: ValidationError[] = [];

    // 检查是否有绑定
    if (bindings.value.length === 0) {
      errors.push({
        code: 'NO_BINDINGS',
        message: '没有任何绑定关系'
      });
    }

    // 检查每个绑定
    bindings.value.forEach((binding) => {
      // 检查卡片是否存在
      const card = getCardById(binding.cardId);
      if (!card) {
        errors.push({
          code: 'CARD_NOT_FOUND',
          message: `卡片不存在: ${binding.cardId}`,
          field: 'cardId'
        });
        return;
      }

      // 检查文件是否存在
      if (!binding.filePath) {
        errors.push({
          code: 'FILE_NOT_SET',
          message: `卡片 "${card.name}" 未绑定文件`,
          field: 'filePath'
        });
        return;
      }

      const file = getFileByPath(binding.filePath);
      if (!file) {
        errors.push({
          code: 'FILE_NOT_FOUND',
          message: `文件不存在: ${binding.filePath}`,
          field: 'filePath'
        });
      }
    });

    // 检查重复绑定（同一文件绑定到多个卡片）
    const fileUsageMap = new Map<string, string[]>();
    bindings.value.forEach((binding) => {
      if (binding.filePath) {
        const cardIds = fileUsageMap.get(binding.filePath) || [];
        cardIds.push(binding.cardId);
        fileUsageMap.set(binding.filePath, cardIds);
      }
    });

    fileUsageMap.forEach((cardIds, filePath) => {
      if (cardIds.length > 1) {
        errors.push({
          code: 'DUPLICATE_FILE',
          message: `文件 "${filePath}" 被绑定到多个卡片`,
          field: 'filePath'
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ===== 模式切换 =====

  /**
   * 设置模式（表格/图形）
   */
  function setMode(newMode: ManualMode): void {
    mode.value = newMode;
    // 同步到 connectorStore
    connectorStore.setView(newMode as ViewMode);
  }

  // ===== 卡片操作 =====

  /**
   * 从卡盒加载卡片
   */
  async function loadCardsFromBox(boxPath: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      // 调用主进程加载卡片
      // 这里假设有一个 IPC 调用
      const loadedCards = await window.electronAPI?.loadCardsFromBox?.(boxPath);
      if (loadedCards && Array.isArray(loadedCards)) {
        cardsStore.setCards(loadedCards);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载卡片失败';
      console.error('Failed to load cards:', e);
    } finally {
      loading.value = false;
    }
  }

  /**
   * 选择卡片
   */
  function selectCard(cardId: string): void {
    cardsStore.select(cardId);
  }

  /**
   * 取消选择卡片
   */
  function deselectCard(cardId: string): void {
    cardsStore.deselect(cardId);
  }

  /**
   * 切换卡片选择
   */
  function toggleCard(cardId: string): void {
    cardsStore.toggle(cardId);
  }

  /**
   * 全选卡片
   */
  function selectAllCards(): void {
    cardsStore.selectAll();
  }

  /**
   * 取消全选卡片
   */
  function deselectAllCards(): void {
    cardsStore.deselectAll();
  }

  // ===== 文件操作 =====

  /**
   * 从文件夹添加文件
   */
  async function addFilesFromFolder(folderPath: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      // 调用主进程加载文件
      const loadedFiles = await window.electronAPI?.loadFilesFromFolder?.(folderPath);
      if (loadedFiles && Array.isArray(loadedFiles)) {
        filesStore.addFiles(loadedFiles);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '添加文件失败';
      console.error('Failed to add files:', e);
    } finally {
      loading.value = false;
    }
  }

  /**
   * 添加文件
   */
  function addFiles(newFiles: FileInfo[]): void {
    filesStore.addFiles(newFiles);
  }

  /**
   * 移除文件
   */
  function removeFile(filePath: string): void {
    // 如果文件已绑定，需要先解除绑定
    const binding = bindings.value.find((b) => b.filePath === filePath);
    if (binding) {
      removeBinding(binding.cardId);
    }
    filesStore.removeFile(filePath);
  }

  /**
   * 清空文件
   */
  function clearFiles(): void {
    // 清空所有绑定中与文件相关的部分
    clearBindings();
    filesStore.clear();
  }

  /**
   * 选择文件
   */
  function selectFile(filePath: string): void {
    filesStore.select(filePath);
  }

  /**
   * 取消选择文件
   */
  function deselectFile(filePath: string): void {
    filesStore.deselect(filePath);
  }

  // ===== 工具方法 =====

  /**
   * 通过卡片ID获取绑定
   */
  function getBindingByCardId(cardId: string): BindingItem | undefined {
    return bindings.value.find((b) => b.cardId === cardId);
  }

  /**
   * 通过ID获取卡片
   */
  function getCardById(cardId: string): CardInfo | undefined {
    return cardsStore.getById(cardId);
  }

  /**
   * 通过路径获取文件
   */
  function getFileByPath(filePath: string): FileInfo | undefined {
    return filesStore.getByPath(filePath);
  }

  /**
   * 检查卡片是否已绑定
   */
  function isCardBound(cardId: string): boolean {
    const binding = getBindingByCardId(cardId);
    return !!binding?.filePath;
  }

  /**
   * 检查文件是否已绑定
   */
  function isFileBound(filePath: string): boolean {
    return usedFilePaths.value.includes(filePath);
  }

  // ===== 导入导出 =====

  /**
   * 导出配置
   */
  function exportConfig(): BindingConfig {
    return {
      version: '1.0.0',
      created: new Date().toISOString(),
      bindings: bindings.value.map((b) => ({
        cardId: b.cardId,
        filePath: b.filePath,
        resourceField: b.resourceField
      }))
    };
  }

  /**
   * 导入配置
   */
  function importConfig(config: BindingConfig): void {
    // 清空现有绑定
    clearBindings();

    // 导入新绑定
    config.bindings.forEach((b) => {
      // 验证卡片和文件存在
      const card = getCardById(b.cardId);
      const file = getFileByPath(b.filePath);

      if (card && file) {
        addBinding(b.cardId, b.filePath, b.resourceField);
      } else {
        console.warn(`Skipping invalid binding: card=${b.cardId}, file=${b.filePath}`);
      }
    });
  }

  // 返回所有状态和方法
  return {
    // 状态
    cards: computed(() => cards.value),
    files: computed(() => files.value),
    bindings: computed(() => bindings.value),
    mode,
    loading,
    error,

    // 计算属性
    selectedCards: computed(() => selectedCards.value),
    selectedFiles: computed(() => selectedFiles.value),
    boundCount: computed(() => boundCount.value),
    unboundCount: computed(() => unboundCount.value),
    usedFilePaths: computed(() => usedFilePaths.value),

    // 绑定操作
    addBinding,
    removeBinding,
    updateBinding,
    clearBindings,
    validateBindings,

    // 模式切换
    setMode,

    // 卡片操作
    loadCardsFromBox,
    selectCard,
    deselectCard,
    toggleCard,
    selectAllCards,
    deselectAllCards,

    // 文件操作
    addFilesFromFolder,
    addFiles,
    removeFile,
    clearFiles,
    selectFile,
    deselectFile,

    // 工具方法
    getBindingByCardId,
    getCardById,
    getFileByPath,
    isCardBound,
    isFileBound,

    // 导入导出
    exportConfig,
    importConfig
  };
}

// 声明 window.electronAPI 类型
declare global {
  interface Window {
    electronAPI?: {
      loadCardsFromBox?: (boxPath: string) => Promise<CardInfo[]>;
      loadFilesFromFolder?: (folderPath: string) => Promise<FileInfo[]>;
      openFileDialog?: (options?: {
        title?: string;
        filters?: Array<{ name: string; extensions: string[] }>;
        multiple?: boolean;
      }) => Promise<string[] | null>;
      openFolderDialog?: (options?: {
        title?: string;
      }) => Promise<string | null>;
    };
  }
}
