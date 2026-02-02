/**
 * ModeConverter 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModeConverter } from '@/core/executors/ModeConverter';
import type { CardInfo, ResourceMode, ResourceInfo } from '@/types/card';

// Mock SDK
const createMockSDK = () => ({
  getCard: vi.fn(),
  updateCard: vi.fn(),
  getCardResources: vi.fn(),
  copyResource: vi.fn(),
  moveResource: vi.fn(),
  deleteResource: vi.fn(),
  getFileSize: vi.fn(),
  fileExists: vi.fn(),
  getDiskSpace: vi.fn(),
  getCardInternalPath: vi.fn(),
  ensureDirectory: vi.fn()
});

// 创建测试卡片
const createMockCard = (id: string, resourceMode: ResourceMode = 'empty'): CardInfo => ({
  id,
  name: `Card ${id}`,
  type: 'video',
  path: `/cards/${id}`,
  baseCards: [],
  resourceMode,
  metadata: {
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
    version: '1.0.0',
    tags: []
  }
});

// 创建测试资源
const createMockResource = (overrides?: Partial<ResourceInfo>): ResourceInfo => ({
  uri: '/external/video.mp4',
  name: 'video.mp4',
  size: 1024 * 1024 * 100, // 100MB
  mimeType: 'video/mp4',
  internal: false,
  ...overrides
});

describe('ModeConverter', () => {
  let sdk: ReturnType<typeof createMockSDK>;
  let converter: ModeConverter;

  beforeEach(() => {
    sdk = createMockSDK();
    converter = new ModeConverter(sdk);
  });

  describe('detectMode', () => {
    it('应该检测为空壳模式当只有外部资源时', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));
      sdk.getCardResources.mockResolvedValue([
        createMockResource({ internal: false }),
        createMockResource({ internal: false, uri: '/external/video2.mp4' })
      ]);

      const mode = await converter.detectMode('card1');

      expect(mode).toBe('empty');
    });

    it('应该检测为全填充模式当只有内部资源时', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));
      sdk.getCardResources.mockResolvedValue([
        createMockResource({ internal: true, uri: '/cards/card1/video.mp4' }),
        createMockResource({ internal: true, uri: '/cards/card1/video2.mp4' })
      ]);

      const mode = await converter.detectMode('card1');

      expect(mode).toBe('full');
    });

    it('应该检测为半填充模式当有混合资源时', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));
      sdk.getCardResources.mockResolvedValue([
        createMockResource({ internal: true }),
        createMockResource({ internal: false })
      ]);

      const mode = await converter.detectMode('card1');

      expect(mode).toBe('semi');
    });

    it('应该检测为空壳模式当没有资源时', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));
      sdk.getCardResources.mockResolvedValue([]);

      const mode = await converter.detectMode('card1');

      expect(mode).toBe('empty');
    });

    it('应该抛出错误当卡片不存在时', async () => {
      sdk.getCard.mockResolvedValue(null);

      await expect(converter.detectMode('nonexistent')).rejects.toThrow('卡片不存在');
    });
  });

  describe('getExternalResources', () => {
    it('应该返回外部资源列表', async () => {
      sdk.getCardResources.mockResolvedValue([
        createMockResource({ internal: false }),
        createMockResource({ internal: true }),
        createMockResource({ internal: false, uri: '/external/video2.mp4' })
      ]);

      const resources = await converter.getExternalResources('card1');

      expect(resources).toHaveLength(2);
      expect(resources.every(r => !r.internal)).toBe(true);
    });
  });

  describe('getInternalResources', () => {
    it('应该返回内部资源列表', async () => {
      sdk.getCardResources.mockResolvedValue([
        createMockResource({ internal: true }),
        createMockResource({ internal: false }),
        createMockResource({ internal: true, uri: '/cards/card1/video2.mp4' })
      ]);

      const resources = await converter.getInternalResources('card1');

      expect(resources).toHaveLength(2);
      expect(resources.every(r => r.internal)).toBe(true);
    });
  });

  describe('calculateRequiredSpace', () => {
    it('应该计算所需空间', async () => {
      const size1 = 100 * 1024 * 1024; // 100MB
      const size2 = 200 * 1024 * 1024; // 200MB

      sdk.getCardResources.mockResolvedValue([
        createMockResource({ size: size1 }),
        createMockResource({ size: size2 })
      ]);

      const required = await converter.calculateRequiredSpace(['card1']);

      expect(required).toBe(size1 + size2);
    });

    it('应该计算多个卡片的总空间', async () => {
      const size1 = 100 * 1024 * 1024;
      const size2 = 200 * 1024 * 1024;

      sdk.getCardResources
        .mockResolvedValueOnce([createMockResource({ size: size1 })])
        .mockResolvedValueOnce([createMockResource({ size: size2 })]);

      const required = await converter.calculateRequiredSpace(['card1', 'card2']);

      expect(required).toBe(size1 + size2);
    });
  });

  describe('checkDiskSpace', () => {
    it('应该返回true当有足够空间时', async () => {
      sdk.getDiskSpace.mockResolvedValue({
        available: 1024 * 1024 * 1024, // 1GB
        total: 2 * 1024 * 1024 * 1024  // 2GB
      });

      const required = 100 * 1024 * 1024; // 100MB
      const hasSpace = await converter.checkDiskSpace('/', required);

      expect(hasSpace).toBe(true);
    });

    it('应该返回false当空间不足时', async () => {
      sdk.getDiskSpace.mockResolvedValue({
        available: 50 * 1024 * 1024, // 50MB
        total: 2 * 1024 * 1024 * 1024
      });

      const required = 100 * 1024 * 1024; // 100MB
      const hasSpace = await converter.checkDiskSpace('/', required);

      expect(hasSpace).toBe(false);
    });

    it('应该返回true当无法获取空间信息时', async () => {
      sdk.getDiskSpace.mockRejectedValue(new Error('Cannot get disk space'));

      const hasSpace = await converter.checkDiskSpace('/', 100);

      expect(hasSpace).toBe(true);
    });
  });

  describe('toFull', () => {
    it('应该成功转换为全填充模式', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1', 'empty'));
      sdk.getCardResources.mockResolvedValue([
        createMockResource({ internal: false })
      ]);
      sdk.getCardInternalPath.mockReturnValue('/cards/card1/resources');
      sdk.ensureDirectory.mockResolvedValue(undefined);
      sdk.copyResource.mockResolvedValue(undefined);
      sdk.fileExists.mockResolvedValue(false);
      sdk.updateCard.mockResolvedValue(undefined);

      const result = await converter.toFull(['card1']);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(sdk.copyResource).toHaveBeenCalled();
      expect(sdk.updateCard).toHaveBeenCalled();
    });

    it('应该处理转换错误', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1', 'empty'));
      sdk.getCardResources.mockResolvedValue([
        createMockResource({ internal: false })
      ]);
      sdk.getCardInternalPath.mockReturnValue('/cards/card1/resources');
      sdk.ensureDirectory.mockResolvedValue(undefined);
      sdk.copyResource.mockRejectedValue(new Error('Copy failed'));
      sdk.fileExists.mockResolvedValue(false);

      const result = await converter.toFull(['card1']);

      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('应该触发进度回调', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1', 'empty'));
      sdk.getCardResources.mockResolvedValue([
        createMockResource({ internal: false })
      ]);
      sdk.getCardInternalPath.mockReturnValue('/cards/card1/resources');
      sdk.ensureDirectory.mockResolvedValue(undefined);
      sdk.copyResource.mockResolvedValue(undefined);
      sdk.fileExists.mockResolvedValue(false);
      sdk.updateCard.mockResolvedValue(undefined);

      let progressCalled = false;
      converter.on('progress', () => {
        progressCalled = true;
      });
      
      await converter.toFull(['card1']);

      expect(progressCalled).toBe(true);
    });

    it('不应该允许并发转换', async () => {
      sdk.getCard.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve(createMockCard('card1')), 100)
      ));
      sdk.getCardResources.mockResolvedValue([]);

      const promise1 = converter.toFull(['card1']);

      await expect(converter.toFull(['card2'])).rejects.toThrow('已有转换任务正在进行中');

      await promise1;
    });
  });

  describe('toEmpty', () => {
    it('应该成功转换为空壳模式', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1', 'full'));
      sdk.getCardResources.mockResolvedValue([
        createMockResource({ internal: true, uri: '/cards/card1/video.mp4' })
      ]);
      sdk.ensureDirectory.mockResolvedValue(undefined);
      sdk.moveResource.mockResolvedValue(undefined);
      sdk.fileExists.mockResolvedValue(false);
      sdk.updateCard.mockResolvedValue(undefined);

      const result = await converter.toEmpty(['card1'], '/target/path');

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(sdk.moveResource).toHaveBeenCalled();
    });

    it('应该拒绝空的目标路径', async () => {
      await expect(converter.toEmpty(['card1'], '')).rejects.toThrow('目标路径不能为空');
    });

    it('应该处理移动错误', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1', 'full'));
      sdk.getCardResources.mockResolvedValue([
        createMockResource({ internal: true })
      ]);
      sdk.ensureDirectory.mockResolvedValue(undefined);
      sdk.moveResource.mockRejectedValue(new Error('Move failed'));
      sdk.fileExists.mockResolvedValue(false);

      const result = await converter.toEmpty(['card1'], '/target/path');

      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('cancel', () => {
    it('应该能够取消转换', async () => {
      sdk.getCard.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve(createMockCard('card1')), 50)
      ));
      sdk.getCardResources.mockResolvedValue([
        createMockResource({ internal: false })
      ]);
      sdk.getCardInternalPath.mockReturnValue('/cards/card1/resources');
      sdk.ensureDirectory.mockResolvedValue(undefined);
      sdk.copyResource.mockResolvedValue(undefined);
      sdk.fileExists.mockResolvedValue(false);

      const cardIds = Array(10).fill(null).map((_, i) => `card${i}`);
      const promise = converter.toFull(cardIds);

      setTimeout(() => {
        converter.cancel();
      }, 100);

      const result = await promise;

      // 应该有一些被取消
      expect(result.success + result.failed).toBeLessThan(cardIds.length);
    });
  });

  describe('isConverting', () => {
    it('应该正确返回转换状态', async () => {
      sdk.getCard.mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve(createMockCard('card1')), 50)
      ));
      sdk.getCardResources.mockResolvedValue([]);

      expect(converter.isConverting()).toBe(false);

      const promise = converter.toFull(['card1']);

      expect(converter.isConverting()).toBe(true);

      await promise;

      expect(converter.isConverting()).toBe(false);
    });
  });

  describe('getProgress', () => {
    it('执行前应该返回null', () => {
      expect(converter.getProgress()).toBeNull();
    });
  });

  describe('events', () => {
    it('应该触发start事件', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));
      sdk.getCardResources.mockResolvedValue([]);

      const startHandler = vi.fn();
      converter.on('start', startHandler);

      await converter.toFull(['card1']);

      expect(startHandler).toHaveBeenCalledWith({
        cardIds: ['card1'],
        targetMode: 'full'
      });
    });

    it('应该触发complete事件', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));
      sdk.getCardResources.mockResolvedValue([]);

      const completeHandler = vi.fn();
      converter.on('complete', completeHandler);

      await converter.toFull(['card1']);

      expect(completeHandler).toHaveBeenCalled();
    });

    it('应该触发progress事件', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));
      sdk.getCardResources.mockResolvedValue([
        createMockResource({ internal: false })
      ]);
      sdk.getCardInternalPath.mockReturnValue('/cards/card1/resources');
      sdk.ensureDirectory.mockResolvedValue(undefined);
      sdk.copyResource.mockResolvedValue(undefined);
      sdk.fileExists.mockResolvedValue(false);
      sdk.updateCard.mockResolvedValue(undefined);

      const progressHandler = vi.fn();
      converter.on('progress', progressHandler);

      await converter.toFull(['card1']);

      expect(progressHandler).toHaveBeenCalled();
    });
  });
});
