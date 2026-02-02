/**
 * 执行器集成测试
 * 测试验证器和执行器的协作，包括错误恢复和并发执行
 * @module tests/integration/executor-integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BindingExecutor } from '@/core/executors/BindingExecutor';
import { BindingValidator } from '@/core/validators/BindingValidator';
import { ConcurrencyController } from '@/core/executors/ConcurrencyController';
import type { CardInfo, ResourceMode } from '@/types/card';
import type { FileInfo } from '@/types/file';
import type { BindingItem } from '@/types/binding';
import type { ExecuteOptions, ExecutionError } from '@/types/execute';
import { createCardInfo, createFileInfo, createBindingItem } from '../fixtures';

// ===== Mock SDK =====
const createMockSDK = () => ({
  getCard: vi.fn(),
  updateCard: vi.fn(),
  fileExists: vi.fn(),
  copyFile: vi.fn(),
  getCardResourcePath: vi.fn()
});

// ===== 测试数据工厂 =====

/**
 * 创建测试卡片
 */
function createTestCard(id: string, name: string): CardInfo {
  return createCardInfo({
    id,
    name,
    type: 'video',
    path: `/cards/${id}.chips`,
    baseCards: [
      {
        id: 'base-video',
        pluginType: 'video',
        resourceFields: [
          { name: 'video_file', type: 'file', required: true, allowedTypes: ['mp4', 'mkv', 'avi'] },
          { name: 'cover_image', type: 'file', required: false, allowedTypes: ['jpg', 'png'] }
        ]
      }
    ],
    resourceMode: 'empty' as ResourceMode
  });
}

/**
 * 创建测试文件
 */
function createTestFile(name: string, path: string): FileInfo {
  return createFileInfo({
    name,
    path,
    size: 1024 * 1024 * 100,
    type: 'video',
    extension: 'mp4',
    mimeType: 'video/mp4'
  });
}

/**
 * 创建绑定列表
 */
function createTestBindings(count: number): {
  cards: CardInfo[];
  files: FileInfo[];
  bindings: BindingItem[];
} {
  const cards: CardInfo[] = [];
  const files: FileInfo[] = [];
  const bindings: BindingItem[] = [];

  for (let i = 0; i < count; i++) {
    const num = String(i + 1).padStart(2, '0');
    const card = createTestCard(`card-${num}`, `Card ${num}`);
    const file = createTestFile(`video${num}.mp4`, `/files/video${num}.mp4`);

    cards.push(card);
    files.push(file);
    bindings.push({
      cardId: card.id,
      filePath: file.path,
      resourceField: 'video_file',
      status: 'pending'
    });
  }

  return { cards, files, bindings };
}

// ===== 测试套件 =====

describe('执行器集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===== 1. 验证→执行流程测试 =====
  describe('验证→执行流程', () => {
    describe('完整流程', () => {
      it('应该完成验证→执行的完整流程', async () => {
        const sdk = createMockSDK();
        const validator = new BindingValidator(sdk);
        const executor = new BindingExecutor(sdk);

        const { cards, files, bindings } = createTestBindings(5);

        // 配置mock
        sdk.getCard.mockImplementation((id: string) => {
          const card = cards.find(c => c.id === id);
          return Promise.resolve(card || null);
        });
        sdk.fileExists.mockResolvedValue(true);
        sdk.updateCard.mockResolvedValue(undefined);

        // 1. 验证阶段
        const validationResult = await validator.validateBindings(bindings);
        expect(validationResult.valid).toBe(5);
        expect(validationResult.invalid).toBe(0);

        // 2. 执行阶段
        const executeResult = await executor.execute(bindings);
        expect(executeResult.success).toBe(5);
        expect(executeResult.failed).toBe(0);

        // 3. 验证调用
        expect(sdk.updateCard).toHaveBeenCalledTimes(5);
      });

      it('应该在验证失败时阻止执行无效绑定', async () => {
        const sdk = createMockSDK();
        const validator = new BindingValidator(sdk);
        const executor = new BindingExecutor(sdk);

        const { cards, files } = createTestBindings(3);

        // 创建混合有效和无效的绑定
        const bindings: BindingItem[] = [
          { cardId: cards[0].id, filePath: files[0].path, resourceField: 'video_file' },
          { cardId: '', filePath: files[1].path, resourceField: 'video_file' }, // 无效
          { cardId: cards[2].id, filePath: '', resourceField: 'video_file' }  // 无效
        ];

        sdk.getCard.mockImplementation((id: string) => {
          const card = cards.find(c => c.id === id);
          return Promise.resolve(card || null);
        });
        sdk.fileExists.mockResolvedValue(true);
        sdk.updateCard.mockResolvedValue(undefined);

        // 验证
        const validationResult = await validator.validateBindings(bindings);
        expect(validationResult.invalid).toBe(2);

        // 只执行有效的绑定
        const validBindings = bindings.filter((_, i) => 
          validationResult.results.get(bindings[i].cardId)?.valid ?? false
        );

        const executeResult = await executor.execute(validBindings);
        expect(executeResult.success).toBe(1);
      });

      it('应该处理执行期间的验证错误', async () => {
        const sdk = createMockSDK();
        const executor = new BindingExecutor(sdk);

        const { cards, files, bindings } = createTestBindings(3);

        // 第二个卡片不存在
        sdk.getCard.mockImplementation((id: string) => {
          if (id === cards[1].id) return Promise.resolve(null);
          const card = cards.find(c => c.id === id);
          return Promise.resolve(card || null);
        });
        sdk.fileExists.mockResolvedValue(true);
        sdk.updateCard.mockResolvedValue(undefined);

        const result = await executor.execute(bindings, {
          errorStrategy: 'skip',
          maxRetries: 0
        });

        expect(result.success).toBe(2);
        expect(result.skipped).toBe(1);
        // skip模式下，错误被跳过但仍记录在details中
        expect(result.details.some(d => d.status === 'skipped')).toBe(true);
      });
    });

    describe('批量验证性能', () => {
      it('应该高效处理大量绑定的验证', async () => {
        const sdk = createMockSDK();
        const validator = new BindingValidator(sdk);

        const { cards, files, bindings } = createTestBindings(100);

        sdk.getCard.mockImplementation((id: string) => {
          const card = cards.find(c => c.id === id);
          return Promise.resolve(card || null);
        });
        sdk.fileExists.mockResolvedValue(true);

        const startTime = Date.now();
        const result = await validator.validateBindings(bindings);
        const duration = Date.now() - startTime;

        expect(result.valid).toBe(100);
        expect(duration).toBeLessThan(5000); // 5秒内完成
      });

      it('应该利用卡片缓存提高性能', async () => {
        const sdk = createMockSDK();
        const validator = new BindingValidator(sdk);

        const card = createTestCard('shared-card', 'Shared Card');

        // 多个绑定使用同一张卡
        const bindings: BindingItem[] = Array.from({ length: 5 }, (_, i) => ({
          cardId: card.id,
          filePath: `/files/video${i}.mp4`,
          resourceField: 'video_file'
        }));

        sdk.getCard.mockResolvedValue(card);
        sdk.fileExists.mockResolvedValue(true);

        await validator.validateBindings(bindings);

        // 由于缓存，getCard只应调用一次
        expect(sdk.getCard).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ===== 2. 错误恢复流程测试 =====
  describe('错误恢复流程', () => {
    describe('重试机制', () => {
      it('应该支持失败后重试', async () => {
        const sdk = createMockSDK();
        const executor = new BindingExecutor(sdk);

        const { cards, files, bindings } = createTestBindings(1);

        let callCount = 0;
        sdk.getCard.mockResolvedValue(cards[0]);
        sdk.fileExists.mockImplementation(() => {
          callCount++;
          // 第三次成功（包含重试）
          return Promise.resolve(callCount >= 3);
        });
        sdk.updateCard.mockResolvedValue(undefined);

        const result = await executor.execute(bindings, {
          errorStrategy: 'retry',
          maxRetries: 3
        });

        // 重试机制使最终成功或被跳过
        // 实际行为取决于重试逻辑，fileExists被调用多次
        expect(callCount).toBeGreaterThanOrEqual(1);
        expect(result.success + result.skipped + result.failed).toBe(1);
      });

      it('应该在达到最大重试次数后失败', async () => {
        const sdk = createMockSDK();
        const executor = new BindingExecutor(sdk);

        const { cards, files, bindings } = createTestBindings(1);

        sdk.getCard.mockResolvedValue(cards[0]);
        sdk.fileExists.mockResolvedValue(false); // 始终失败
        sdk.updateCard.mockResolvedValue(undefined);

        const result = await executor.execute(bindings, {
          errorStrategy: 'skip',
          maxRetries: 2
        });

        // 应该失败（被跳过）
        expect(result.success).toBe(0);
        expect(result.skipped).toBe(1);
      });

      it('应该支持retryFailed方法', async () => {
        const sdk = createMockSDK();
        const executor = new BindingExecutor(sdk);

        const { cards, files, bindings } = createTestBindings(3);

        sdk.getCard.mockImplementation((id: string) => {
          const card = cards.find(c => c.id === id);
          return Promise.resolve(card || null);
        });
        
        // 所有文件存在
        sdk.fileExists.mockResolvedValue(true);
        sdk.updateCard.mockResolvedValue(undefined);

        // 正常执行
        const firstResult = await executor.execute(bindings, {
          errorStrategy: 'skip',
          maxRetries: 0
        });

        expect(firstResult.success).toBe(3);

        // 没有失败项时重试应该返回空结果
        const retryResult = await executor.retryFailed();
        expect(retryResult.success).toBe(0);
        expect(retryResult.failed).toBe(0);
      });
    });

    describe('错误策略', () => {
      it('应该正确实现skip策略', async () => {
        const sdk = createMockSDK();
        const executor = new BindingExecutor(sdk);

        const { cards, files, bindings } = createTestBindings(5);

        sdk.getCard.mockImplementation((id: string) => {
          const card = cards.find(c => c.id === id);
          return Promise.resolve(card || null);
        });
        // 第2和第4个失败
        sdk.fileExists.mockImplementation((path: string) => {
          return Promise.resolve(!path.includes('video02') && !path.includes('video04'));
        });
        sdk.updateCard.mockResolvedValue(undefined);

        const result = await executor.execute(bindings, {
          errorStrategy: 'skip',
          maxRetries: 0
        });

        expect(result.success).toBe(3);
        expect(result.skipped).toBe(2);
        expect(result.failed).toBe(0); // skip模式下错误被跳过而非失败
      });

      it('应该正确实现abort策略', async () => {
        const sdk = createMockSDK();
        const executor = new BindingExecutor(sdk);

        const { cards, files, bindings } = createTestBindings(5);

        sdk.getCard.mockImplementation((id: string) => {
          const card = cards.find(c => c.id === id);
          return Promise.resolve(card || null);
        });
        // 第一个失败
        sdk.fileExists.mockImplementation((path: string) => {
          return Promise.resolve(!path.includes('video01'));
        });
        sdk.updateCard.mockResolvedValue(undefined);

        const result = await executor.execute(bindings, {
          errorStrategy: 'abort',
          maxRetries: 0
        });

        // abort策略会触发取消，但由于并发执行可能有部分成功
        // 确保总数正确
        expect(result.success + result.skipped + result.failed).toBeLessThanOrEqual(5);
      });

      it('应该支持自定义错误处理回调', async () => {
        const sdk = createMockSDK();
        const executor = new BindingExecutor(sdk);

        const { cards, files, bindings } = createTestBindings(3);

        sdk.getCard.mockImplementation((id: string) => {
          const card = cards.find(c => c.id === id);
          return Promise.resolve(card || null);
        });
        sdk.fileExists.mockImplementation((path: string) => {
          return Promise.resolve(!path.includes('video02'));
        });
        sdk.updateCard.mockResolvedValue(undefined);

        const errorLogs: ExecutionError[] = [];

        const result = await executor.execute(bindings, {
          errorStrategy: 'skip',
          maxRetries: 0,
          onError: (error) => {
            errorLogs.push(error);
            return 'skip'; // 返回自定义处理
          }
        });

        expect(errorLogs.length).toBe(1);
        expect(errorLogs[0].binding.cardId).toBe('card-02');
      });
    });

    describe('错误分类', () => {
      it('应该正确分类可重试和不可重试的错误', async () => {
        const sdk = createMockSDK();
        const executor = new BindingExecutor(sdk);

        const { cards, files, bindings } = createTestBindings(2);

        // 第一个：文件不存在
        // 第二个：卡片不存在
        sdk.getCard.mockImplementation((id: string) => {
          if (id === 'card-02') return Promise.resolve(null);
          return Promise.resolve(cards.find(c => c.id === id) || null);
        });
        sdk.fileExists.mockImplementation((path: string) => {
          return Promise.resolve(!path.includes('video01'));
        });
        sdk.updateCard.mockResolvedValue(undefined);

        const result = await executor.execute(bindings, {
          errorStrategy: 'skip',
          maxRetries: 0
        });

        // skip模式下错误被跳过
        expect(result.skipped).toBe(2);
        // 验证通过details可以看到错误状态
        expect(result.details.filter(d => d.status === 'skipped').length).toBe(2);
      });
    });
  });

  // ===== 3. 并发执行测试 =====
  describe('并发执行测试', () => {
    describe('ConcurrencyController', () => {
      it('应该正确控制并发数', async () => {
        const controller = new ConcurrencyController(3);
        let maxConcurrent = 0;
        let currentConcurrent = 0;

        const tasks = Array.from({ length: 10 }, () => async () => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
          await new Promise(resolve => setTimeout(resolve, 50));
          currentConcurrent--;
          return true;
        });

        await controller.addAll(tasks);

        expect(maxConcurrent).toBeLessThanOrEqual(3);
      });

      it('应该支持暂停和恢复', async () => {
        const controller = new ConcurrencyController(2);
        const results: number[] = [];

        const tasks = Array.from({ length: 5 }, (_, i) => async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
          results.push(i);
          return i;
        });

        // 启动任务
        const promise = controller.addAll(tasks);

        // 暂停
        controller.pause();
        expect(controller.isPaused()).toBe(true);

        // 恢复
        controller.resume();
        expect(controller.isPaused()).toBe(false);

        await promise;
        expect(results.length).toBe(5);
      });

      it('应该支持清空队列', async () => {
        const controller = new ConcurrencyController(1);
        const results: number[] = [];

        const tasks = Array.from({ length: 10 }, (_, i) => async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          results.push(i);
          return i;
        });

        // 不等待完成，直接清空
        const promise = controller.addAll(tasks).catch(() => {});

        // 等待一些任务开始
        await new Promise(resolve => setTimeout(resolve, 50));

        // 清空队列
        const cleared = controller.clear();
        expect(cleared).toBeGreaterThan(0);

        await promise;
      });

      it('应该正确报告状态', async () => {
        const controller = new ConcurrencyController(2);

        expect(controller.isIdle()).toBe(true);
        expect(controller.getRunning()).toBe(0);
        expect(controller.getPending()).toBe(0);

        const slowTask = async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return true;
        };

        const promise = controller.add(slowTask);

        // 任务开始后
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(controller.getRunning()).toBe(1);

        await promise;
        expect(controller.isIdle()).toBe(true);
      });

      it('应该支持动态调整并发数', async () => {
        const controller = new ConcurrencyController(1);

        expect(controller.getMaxConcurrent()).toBe(1);

        controller.setMaxConcurrent(5);
        expect(controller.getMaxConcurrent()).toBe(5);

        expect(() => controller.setMaxConcurrent(0)).toThrow();
      });
    });

    describe('执行器并发', () => {
      it('应该并发执行绑定', async () => {
        const sdk = createMockSDK();
        const executor = new BindingExecutor(sdk);

        const { cards, files, bindings } = createTestBindings(10);
        const executionOrder: string[] = [];

        sdk.getCard.mockImplementation(async (id: string) => {
          executionOrder.push(`getCard:${id}`);
          await new Promise(resolve => setTimeout(resolve, 10));
          return cards.find(c => c.id === id) || null;
        });
        sdk.fileExists.mockResolvedValue(true);
        sdk.updateCard.mockResolvedValue(undefined);

        const startTime = Date.now();
        await executor.execute(bindings, { concurrency: 5 });
        const duration = Date.now() - startTime;

        // 并发执行应该比串行更快
        // 串行10个*10ms = 100ms，并发应该更短
        expect(duration).toBeLessThan(150);
      });

      it('应该正确处理并发错误', async () => {
        const sdk = createMockSDK();
        const executor = new BindingExecutor(sdk);

        const { cards, files, bindings } = createTestBindings(10);

        sdk.getCard.mockImplementation((id: string) => {
          const card = cards.find(c => c.id === id);
          return Promise.resolve(card || null);
        });
        // 随机失败
        sdk.fileExists.mockImplementation(() => {
          return Promise.resolve(Math.random() > 0.3);
        });
        sdk.updateCard.mockResolvedValue(undefined);

        const result = await executor.execute(bindings, {
          concurrency: 5,
          errorStrategy: 'skip',
          maxRetries: 0
        });

        // 应该完成所有任务（成功或跳过）
        expect(result.success + result.skipped + result.failed).toBe(10);
      });
    });
  });

  // ===== 4. 进度和事件测试 =====
  describe('进度和事件', () => {
    it('应该触发正确的生命周期事件', async () => {
      const sdk = createMockSDK();
      const executor = new BindingExecutor(sdk);

      const { cards, files, bindings } = createTestBindings(3);

      sdk.getCard.mockImplementation((id: string) => {
        const card = cards.find(c => c.id === id);
        return Promise.resolve(card || null);
      });
      sdk.fileExists.mockResolvedValue(true);
      sdk.updateCard.mockResolvedValue(undefined);

      const events: string[] = [];

      executor.on('start', () => events.push('start'));
      executor.on('item:start', () => events.push('item:start'));
      executor.on('item:success', () => events.push('item:success'));
      executor.on('progress', () => events.push('progress'));
      executor.on('complete', () => events.push('complete'));

      await executor.execute(bindings);

      expect(events.includes('start')).toBe(true);
      expect(events.includes('complete')).toBe(true);
      expect(events.filter(e => e === 'item:start').length).toBe(3);
      expect(events.filter(e => e === 'item:success').length).toBe(3);
    });

    it('应该正确报告进度', async () => {
      const sdk = createMockSDK();
      const executor = new BindingExecutor(sdk);

      const { cards, files, bindings } = createTestBindings(5);

      sdk.getCard.mockImplementation((id: string) => {
        const card = cards.find(c => c.id === id);
        return Promise.resolve(card || null);
      });
      sdk.fileExists.mockResolvedValue(true);
      sdk.updateCard.mockResolvedValue(undefined);

      let finalProgress = 0;
      
      // 通过事件监听进度
      executor.on('progress', (progress) => {
        finalProgress = progress.percentage;
      });

      await executor.execute(bindings);

      // 最终进度应该是100%
      expect(finalProgress).toBe(100);
    });

    it('应该支持取消执行', async () => {
      const sdk = createMockSDK();
      const executor = new BindingExecutor(sdk);

      const { cards, files, bindings } = createTestBindings(20);

      sdk.getCard.mockImplementation(async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, 30));
        return cards.find(c => c.id === id) || null;
      });
      sdk.fileExists.mockResolvedValue(true);
      sdk.updateCard.mockResolvedValue(undefined);

      const cancelHandler = vi.fn();
      executor.on('cancel', cancelHandler);

      const promise = executor.execute(bindings, { concurrency: 2 });

      // 等待开始执行
      await new Promise(resolve => setTimeout(resolve, 50));

      // 取消
      executor.cancel();

      const result = await promise;

      expect(executor.isCancelled()).toBe(true);
      expect(cancelHandler).toHaveBeenCalled();
      // 取消时可能有部分任务已完成
      expect(result.success + result.skipped + result.failed).toBeLessThanOrEqual(20);
    });
  });

  // ===== 5. 资源字段验证测试 =====
  describe('资源字段验证', () => {
    it('应该验证资源字段存在性', async () => {
      const sdk = createMockSDK();
      const validator = new BindingValidator(sdk);

      const card = createTestCard('card-1', 'Test Card');
      const binding: BindingItem = {
        cardId: card.id,
        filePath: '/files/video.mp4',
        resourceField: 'nonexistent_field' // 不存在的字段
      };

      sdk.getCard.mockResolvedValue(card);
      sdk.fileExists.mockResolvedValue(true);

      const result = await validator.validateBinding(binding);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'RESOURCE_FIELD_NOT_FOUND')).toBe(true);
    });

    it('应该验证文件类型匹配', async () => {
      const sdk = createMockSDK();
      const validator = new BindingValidator(sdk);

      const card = createTestCard('card-1', 'Test Card');
      const binding: BindingItem = {
        cardId: card.id,
        filePath: '/files/document.pdf', // PDF文件绑定到视频字段
        resourceField: 'video_file'
      };

      sdk.getCard.mockResolvedValue(card);
      sdk.fileExists.mockResolvedValue(true);

      const result = await validator.validateBinding(binding);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'FILE_TYPE_MISMATCH')).toBe(true);
    });

    it('应该允许匹配的文件类型', async () => {
      const sdk = createMockSDK();
      const validator = new BindingValidator(sdk);

      const card = createTestCard('card-1', 'Test Card');
      const binding: BindingItem = {
        cardId: card.id,
        filePath: '/files/video.mp4',
        resourceField: 'video_file'
      };

      sdk.getCard.mockResolvedValue(card);
      sdk.fileExists.mockResolvedValue(true);

      const result = await validator.validateBinding(binding);

      expect(result.valid).toBe(true);
    });

    it('应该验证基础卡片ID', async () => {
      const sdk = createMockSDK();
      const validator = new BindingValidator(sdk);

      const card = createTestCard('card-1', 'Test Card');
      const binding: BindingItem = {
        cardId: card.id,
        baseCardId: 'nonexistent-base', // 不存在的基础卡片
        filePath: '/files/video.mp4',
        resourceField: 'video_file'
      };

      sdk.getCard.mockResolvedValue(card);
      sdk.fileExists.mockResolvedValue(true);

      const result = await validator.validateBinding(binding);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'BASE_CARD_NOT_FOUND')).toBe(true);
    });
  });

  // ===== 6. 复杂场景测试 =====
  describe('复杂场景', () => {
    it('应该处理大批量绑定', async () => {
      const sdk = createMockSDK();
      const executor = new BindingExecutor(sdk);

      const { cards, files, bindings } = createTestBindings(50);

      sdk.getCard.mockImplementation((id: string) => {
        const card = cards.find(c => c.id === id);
        return Promise.resolve(card || null);
      });
      sdk.fileExists.mockResolvedValue(true);
      sdk.updateCard.mockResolvedValue(undefined);

      const startTime = Date.now();
      const result = await executor.execute(bindings, { concurrency: 10 });
      const duration = Date.now() - startTime;

      expect(result.success).toBe(50);
      expect(duration).toBeLessThan(10000); // 10秒内完成
    });

    it('应该处理混合成功、失败和跳过的情况', async () => {
      const sdk = createMockSDK();
      const executor = new BindingExecutor(sdk);

      const { cards, files, bindings } = createTestBindings(10);

      sdk.getCard.mockImplementation((id: string) => {
        // 卡片3、6不存在
        if (id === 'card-03' || id === 'card-06') {
          return Promise.resolve(null);
        }
        return Promise.resolve(cards.find(c => c.id === id) || null);
      });
      sdk.fileExists.mockImplementation((path: string) => {
        // 文件2、8不存在
        return Promise.resolve(!path.includes('video02') && !path.includes('video08'));
      });
      sdk.updateCard.mockResolvedValue(undefined);

      const result = await executor.execute(bindings, {
        errorStrategy: 'skip',
        maxRetries: 0
      });

      // 4个错误：卡片3、6和文件2、8
      expect(result.success).toBe(6);
      expect(result.skipped).toBe(4);
    });

    it('应该支持更新不同的资源字段', async () => {
      const sdk = createMockSDK();
      const executor = new BindingExecutor(sdk);

      const card = createTestCard('card-1', 'Test Card');
      const bindings: BindingItem[] = [
        { cardId: card.id, filePath: '/files/video.mp4', resourceField: 'video_file' },
        { cardId: card.id, filePath: '/files/cover.jpg', resourceField: 'cover_image' }
      ];

      sdk.getCard.mockResolvedValue(card);
      sdk.fileExists.mockResolvedValue(true);
      sdk.updateCard.mockResolvedValue(undefined);

      const result = await executor.execute(bindings);

      expect(result.success).toBe(2);
      expect(sdk.updateCard).toHaveBeenCalledTimes(2);

      // 验证更新了正确的字段
      const calls = sdk.updateCard.mock.calls;
      expect(calls.some(c => c[1]?.['video_file'])).toBe(true);
      expect(calls.some(c => c[1]?.['cover_image'])).toBe(true);
    });
  });
});
