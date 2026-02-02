/**
 * 绑定执行器
 * @description 执行批量绑定操作
 * @module core/executors/BindingExecutor
 */

import { EventEmitter } from 'events';
import { ConcurrencyController } from './ConcurrencyController';
import { BindingValidator } from '../validators/BindingValidator';
import type { BindingItem } from '@/types/binding';
import type {
  ExecuteOptions,
  ExecuteResult,
  ExecutionProgress,
  ExecutionDetail,
  ExecutionError,
  SingleExecuteResult,
  ErrorAction
} from '@/types/execute';
import type { CardInfo } from '@/types/card';

/**
 * SDK接口定义（适配层）
 */
interface ChipsSDK {
  getCard(cardId: string): Promise<CardInfo | null>;
  updateCard(cardId: string, updates: Record<string, unknown>): Promise<void>;
  fileExists(path: string): Promise<boolean>;
  copyFile(source: string, target: string): Promise<void>;
  getCardResourcePath(cardId: string, fileName: string): string;
}

/**
 * 日志接口
 */
interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * 默认日志实现
 */
const defaultLogger: Logger = {
  debug: (msg, ...args) => console.debug(`[BindingExecutor] ${msg}`, ...args),
  info: (msg, ...args) => console.info(`[BindingExecutor] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[BindingExecutor] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[BindingExecutor] ${msg}`, ...args)
};

/**
 * 默认执行选项
 */
const DEFAULT_OPTIONS: Required<ExecuteOptions> = {
  copyToInternal: false,
  errorStrategy: 'skip',
  maxRetries: 3,
  concurrency: 3,
  onProgress: () => {},
  onError: () => 'skip'
};

/**
 * 执行器事件类型
 */
export interface BindingExecutorEvents {
  'start': { total: number };
  'progress': ExecutionProgress;
  'item:start': { binding: BindingItem; index: number };
  'item:success': { binding: BindingItem; index: number; duration: number };
  'item:error': { binding: BindingItem; index: number; error: ExecutionError };
  'item:skip': { binding: BindingItem; index: number; reason: string };
  'complete': ExecuteResult;
  'cancel': void;
}

/**
 * 绑定执行器
 * 负责执行批量绑定操作，支持并发控制和错误处理
 */
export class BindingExecutor extends EventEmitter {
  private sdk: ChipsSDK;
  private logger: Logger;
  private validator: BindingValidator;
  private concurrency: ConcurrencyController | null = null;
  
  /** 当前执行状态 */
  private executing: boolean = false;
  /** 是否已取消 */
  private cancelled: boolean = false;
  /** 当前进度 */
  private progress: ExecutionProgress | null = null;
  /** 失败的绑定（用于重试） */
  private failedBindings: BindingItem[] = [];

  /**
   * 创建绑定执行器实例
   * @param sdk ChipsSDK实例
   * @param logger 日志记录器
   */
  constructor(sdk: ChipsSDK, logger?: Logger) {
    super();
    this.sdk = sdk;
    this.logger = logger || defaultLogger;
    this.validator = new BindingValidator(sdk);
  }

  /**
   * 执行批量绑定
   * @param bindings 绑定列表
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(
    bindings: BindingItem[],
    options?: ExecuteOptions
  ): Promise<ExecuteResult> {
    if (this.executing) {
      throw new Error('已有执行任务正在进行中');
    }

    const opts: Required<ExecuteOptions> = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    this.executing = true;
    this.cancelled = false;
    this.failedBindings = [];

    // 初始化并发控制器
    this.concurrency = new ConcurrencyController(opts.concurrency);

    // 初始化进度
    this.progress = {
      current: 0,
      total: bindings.length,
      completed: 0,
      failed: 0,
      skipped: 0,
      percentage: 0
    };

    const details: ExecutionDetail[] = [];
    const errors: ExecutionError[] = [];

    this.emit('start', { total: bindings.length });
    this.logger.info(`开始执行 ${bindings.length} 个绑定`);

    try {
      // 创建所有任务
      const tasks = bindings.map((binding, index) => async () => {
        if (this.cancelled) {
          return this.createSkipDetail(binding, '任务已取消');
        }

        this.emit('item:start', { binding, index });
        this.updateProgress({ currentBinding: binding, current: index + 1 });

        const result = await this.executeWithRetry(binding, opts);
        
        if (result.success) {
          this.progress!.completed++;
          this.emit('item:success', { binding, index, duration: result.duration });
          this.logger.debug(`绑定成功: ${binding.cardId}`);
        } else {
          if (result.skipped) {
            this.progress!.skipped++;
            this.emit('item:skip', { binding, index, reason: result.error?.message || '跳过' });
          } else {
            this.progress!.failed++;
            this.failedBindings.push(binding);
            this.emit('item:error', { binding, index, error: result.error! });
            errors.push(result.error!);
            this.logger.error(`绑定失败: ${binding.cardId}`, result.error);
          }
        }

        this.updateProgress();
        
        return {
          binding,
          status: result.success ? 'success' : result.skipped ? 'skipped' : 'failed',
          duration: result.duration,
          error: result.error?.message
        } as ExecutionDetail;
      });

      // 并发执行所有任务
      const results = await this.concurrency.addAll(tasks);
      details.push(...results);

    } catch (error) {
      this.logger.error('执行过程中发生错误', error);
    } finally {
      this.executing = false;
      this.concurrency = null;
    }

    const result: ExecuteResult = {
      success: this.progress!.completed,
      failed: this.progress!.failed,
      skipped: this.progress!.skipped,
      duration: Date.now() - startTime,
      details,
      errors
    };

    this.emit('complete', result);
    this.logger.info(`执行完成: 成功=${result.success}, 失败=${result.failed}, 跳过=${result.skipped}, 耗时=${result.duration}ms`);

    return result;
  }

  /**
   * 执行单个绑定
   * @param binding 绑定项
   * @returns 执行结果
   */
  async executeSingle(binding: BindingItem): Promise<SingleExecuteResult> {
    const startTime = Date.now();

    try {
      // 验证绑定
      const validation = await this.validator.validateBinding(binding);
      if (!validation.valid) {
        return {
          success: false,
          duration: Date.now() - startTime,
          error: {
            binding,
            code: validation.errors[0]?.code || 'VALIDATION_ERROR',
            message: validation.errors.map(e => e.message).join('; '),
            retryable: false
          }
        };
      }

      // 获取卡片
      const card = await this.sdk.getCard(binding.cardId);
      if (!card) {
        return {
          success: false,
          duration: Date.now() - startTime,
          error: {
            binding,
            code: 'CARD_NOT_FOUND',
            message: '卡片不存在',
            retryable: false
          }
        };
      }

      // 更新卡片资源路径
      await this.updateCardResource(binding);

      return {
        success: true,
        duration: Date.now() - startTime
      };

    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        duration: Date.now() - startTime,
        error: {
          binding,
          code: 'EXECUTION_ERROR',
          message: err.message,
          stack: err.stack,
          retryable: true
        }
      };
    }
  }

  /**
   * 带重试的执行
   * @param binding 绑定项
   * @param options 执行选项
   * @returns 执行结果（带跳过标记）
   */
  private async executeWithRetry(
    binding: BindingItem,
    options: Required<ExecuteOptions>
  ): Promise<SingleExecuteResult & { skipped?: boolean }> {
    let lastError: ExecutionError | undefined;
    let retryCount = 0;

    while (retryCount <= options.maxRetries) {
      if (this.cancelled) {
        return {
          success: false,
          duration: 0,
          skipped: true,
          error: {
            binding,
            code: 'CANCELLED',
            message: '任务已取消',
            retryable: false
          }
        };
      }

      const result = await this.executeSingle(binding);

      if (result.success) {
        return result;
      }

      lastError = result.error;

      // 判断是否可重试
      if (!result.error?.retryable || retryCount >= options.maxRetries) {
        break;
      }

      // 根据错误策略决定下一步
      const action = this.handleError(result.error, options);
      
      if (action === 'skip') {
        return { ...result, skipped: true };
      } else if (action === 'abort') {
        this.cancel();
        return result;
      }
      
      // retry - 继续循环
      retryCount++;
      this.logger.warn(`绑定重试 (${retryCount}/${options.maxRetries}): ${binding.cardId}`);
      
      // 短暂延迟后重试
      await this.delay(100 * retryCount);
    }

    // 最终失败处理
    const finalAction = this.handleError(lastError!, options);
    if (finalAction === 'skip') {
      return {
        success: false,
        duration: 0,
        skipped: true,
        error: lastError
      };
    } else if (finalAction === 'abort') {
      this.cancel();
    }

    return {
      success: false,
      duration: 0,
      error: lastError
    };
  }

  /**
   * 处理错误
   * @param error 执行错误
   * @param options 执行选项
   * @returns 错误处理动作
   */
  private handleError(error: ExecutionError, options: Required<ExecuteOptions>): ErrorAction {
    // 首先调用用户的错误回调
    if (options.onError) {
      const userAction = options.onError(error);
      if (userAction) {
        return userAction;
      }
    }

    // 使用默认策略
    return options.errorStrategy;
  }

  /**
   * 更新卡片资源
   * @param binding 绑定项
   */
  private async updateCardResource(binding: BindingItem): Promise<void> {
    const updates: Record<string, unknown> = {};
    
    // 构建资源字段路径
    const fieldPath = binding.baseCardId 
      ? `baseCards.${binding.baseCardId}.${binding.resourceField}`
      : binding.resourceField;
    
    updates[fieldPath] = binding.filePath;

    await this.sdk.updateCard(binding.cardId, updates);
  }

  /**
   * 创建跳过详情
   * @param binding 绑定项
   * @param reason 跳过原因
   * @returns 执行详情
   */
  private createSkipDetail(binding: BindingItem, reason: string): ExecutionDetail {
    return {
      binding,
      status: 'skipped',
      duration: 0,
      error: reason
    };
  }

  /**
   * 更新进度
   * @param partial 部分进度信息
   */
  private updateProgress(partial?: Partial<ExecutionProgress>): void {
    if (this.progress) {
      if (partial) {
        Object.assign(this.progress, partial);
      }
      
      // 计算百分比
      this.progress.percentage = Math.round(
        ((this.progress.completed + this.progress.failed + this.progress.skipped) / this.progress.total) * 100
      );

      this.emit('progress', { ...this.progress });
      
      if (this.progress.currentBinding) {
        // 调用进度回调
        const options = DEFAULT_OPTIONS;
        options.onProgress(this.progress);
      }
    }
  }

  /**
   * 延迟
   * @param ms 毫秒数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取当前进度
   * @returns 执行进度
   */
  getProgress(): ExecutionProgress | null {
    return this.progress ? { ...this.progress } : null;
  }

  /**
   * 取消执行
   */
  cancel(): void {
    if (!this.executing) {
      return;
    }

    this.cancelled = true;
    
    if (this.concurrency) {
      this.concurrency.clear();
    }

    this.emit('cancel');
    this.logger.info('执行已取消');
  }

  /**
   * 是否正在执行
   * @returns 执行状态
   */
  isExecuting(): boolean {
    return this.executing;
  }

  /**
   * 是否已取消
   * @returns 取消状态
   */
  isCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * 获取失败的绑定列表
   * @returns 失败的绑定
   */
  getFailedBindings(): BindingItem[] {
    return [...this.failedBindings];
  }

  /**
   * 重试失败的绑定
   * @param options 执行选项
   * @returns 执行结果
   */
  async retryFailed(options?: ExecuteOptions): Promise<ExecuteResult> {
    if (this.failedBindings.length === 0) {
      return {
        success: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        details: [],
        errors: []
      };
    }

    return this.execute([...this.failedBindings], options);
  }
}

export default BindingExecutor;
