/**
 * 绑定执行组合式函数
 * @description 绑定执行的核心逻辑
 * @module renderer/composables/useBindingExecute
 */

import { ref, computed, shallowRef } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import type { BindingItem } from '@/types/binding';
import type {
  ExecuteOptions,
  ExecuteResult,
  ExecutionProgress,
  ExecutionError
} from '@/types/execute';

/**
 * 模拟SDK接口（实际使用时从preload注入）
 */
interface ChipsSDK {
  getCard(cardId: string): Promise<unknown>;
  updateCard(cardId: string, updates: Record<string, unknown>): Promise<void>;
  fileExists(path: string): Promise<boolean>;
  copyFile(source: string, target: string): Promise<void>;
  getCardResourcePath(cardId: string, fileName: string): string;
}

/**
 * 获取SDK实例（实际实现中从window.api获取）
 */
function getSDK(): ChipsSDK {
  // 实际实现中应该从preload注入的API获取
  // return (window as any).api.sdk;
  
  // 模拟实现
  return {
    async getCard(cardId: string) {
      // 模拟获取卡片
      return { id: cardId, name: cardId };
    },
    async updateCard(cardId: string, updates: Record<string, unknown>) {
      // 模拟更新卡片
      console.log('Updating card:', cardId, updates);
    },
    async fileExists(path: string) {
      // 模拟检查文件存在
      return true;
    },
    async copyFile(source: string, target: string) {
      // 模拟复制文件
      console.log('Copying file:', source, '->', target);
    },
    getCardResourcePath(cardId: string, fileName: string) {
      return `/cards/${cardId}/resources/${fileName}`;
    }
  };
}

/**
 * 使用绑定执行返回类型
 */
export interface UseBindingExecuteReturn {
  /** 是否正在执行 */
  executing: Ref<boolean>;
  /** 执行进度 */
  progress: Ref<ExecutionProgress | null>;
  /** 执行结果 */
  result: Ref<ExecuteResult | null>;
  /** 当前执行的绑定 */
  currentBinding: Ref<BindingItem | null>;
  /** 失败的绑定列表 */
  failedBindings: ComputedRef<BindingItem[]>;
  
  /** 执行绑定 */
  execute: (bindings: BindingItem[], options?: ExecuteOptions) => Promise<void>;
  /** 取消执行 */
  cancel: () => void;
  /** 重试失败项 */
  retryFailed: () => Promise<void>;
  /** 重置状态 */
  reset: () => void;
}

/**
 * 绑定执行组合式函数
 */
export function useBindingExecute(): UseBindingExecuteReturn {
  // 状态
  const executing = ref(false);
  const progress = ref<ExecutionProgress | null>(null);
  const result = shallowRef<ExecuteResult | null>(null);
  const currentBinding = ref<BindingItem | null>(null);
  const cancelled = ref(false);
  const failedItems = ref<BindingItem[]>([]);
  const lastOptions = ref<ExecuteOptions | undefined>(undefined);

  // SDK
  const sdk = getSDK();

  /**
   * 失败的绑定列表
   */
  const failedBindings = computed(() => failedItems.value);

  /**
   * 执行单个绑定
   */
  async function executeSingle(binding: BindingItem): Promise<{
    success: boolean;
    error?: ExecutionError;
    duration: number;
  }> {
    const startTime = Date.now();

    try {
      // 检查文件存在
      const exists = await sdk.fileExists(binding.filePath);
      if (!exists) {
        return {
          success: false,
          duration: Date.now() - startTime,
          error: {
            binding,
            code: 'FILE_NOT_FOUND',
            message: '文件不存在',
            retryable: false
          }
        };
      }

      // 更新卡片
      await sdk.updateCard(binding.cardId, {
        [binding.resourceField]: binding.filePath
      });

      return {
        success: true,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: {
          binding,
          code: 'EXECUTION_ERROR',
          message: (error as Error).message,
          retryable: true
        }
      };
    }
  }

  /**
   * 执行绑定
   */
  async function execute(bindings: BindingItem[], options?: ExecuteOptions): Promise<void> {
    if (executing.value) {
      throw new Error('已有执行任务正在进行中');
    }

    executing.value = true;
    cancelled.value = false;
    failedItems.value = [];
    lastOptions.value = options;

    const startTime = Date.now();
    const total = bindings.length;
    let completed = 0;
    let failed = 0;
    let skipped = 0;

    // 初始化进度
    progress.value = {
      current: 0,
      total,
      completed: 0,
      failed: 0,
      skipped: 0,
      percentage: 0
    };

    const details: Array<{
      binding: BindingItem;
      status: 'success' | 'failed' | 'skipped';
      duration: number;
      error?: string;
    }> = [];
    const errors: ExecutionError[] = [];

    // 执行每个绑定
    for (let i = 0; i < bindings.length; i++) {
      if (cancelled.value) {
        // 剩余的都标记为跳过
        for (let j = i; j < bindings.length; j++) {
          skipped++;
          details.push({
            binding: bindings[j],
            status: 'skipped',
            duration: 0,
            error: '任务已取消'
          });
        }
        break;
      }

      const binding = bindings[i];
      currentBinding.value = binding;

      // 更新进度
      progress.value = {
        current: i + 1,
        total,
        currentBinding: binding,
        completed,
        failed,
        skipped,
        percentage: Math.round((i / total) * 100)
      };

      // 调用进度回调
      if (options?.onProgress) {
        options.onProgress(progress.value);
      }

      // 执行
      const execResult = await executeSingle(binding);

      if (execResult.success) {
        completed++;
        details.push({
          binding,
          status: 'success',
          duration: execResult.duration
        });
      } else {
        const error = execResult.error!;
        errors.push(error);

        // 根据错误策略处理
        let action = options?.errorStrategy || 'skip';
        
        if (options?.onError) {
          action = options.onError(error);
        }

        switch (action) {
          case 'skip':
            skipped++;
            details.push({
              binding,
              status: 'skipped',
              duration: execResult.duration,
              error: error.message
            });
            break;
          
          case 'retry':
            // 简单重试一次
            const retryResult = await executeSingle(binding);
            if (retryResult.success) {
              completed++;
              details.push({
                binding,
                status: 'success',
                duration: retryResult.duration
              });
            } else {
              failed++;
              failedItems.value.push(binding);
              details.push({
                binding,
                status: 'failed',
                duration: retryResult.duration,
                error: retryResult.error?.message
              });
            }
            break;
          
          case 'abort':
            failed++;
            failedItems.value.push(binding);
            details.push({
              binding,
              status: 'failed',
              duration: execResult.duration,
              error: error.message
            });
            cancelled.value = true;
            break;
        }
      }

      // 短暂延迟，避免UI卡顿
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // 最终结果
    result.value = {
      success: completed,
      failed,
      skipped,
      duration: Date.now() - startTime,
      details,
      errors
    };

    // 最终进度
    progress.value = {
      current: total,
      total,
      completed,
      failed,
      skipped,
      percentage: 100
    };

    currentBinding.value = null;
    executing.value = false;
  }

  /**
   * 取消执行
   */
  function cancel(): void {
    if (executing.value) {
      cancelled.value = true;
    }
  }

  /**
   * 重试失败项
   */
  async function retryFailed(): Promise<void> {
    if (failedItems.value.length === 0) {
      return;
    }

    const bindings = [...failedItems.value];
    failedItems.value = [];
    
    await execute(bindings, lastOptions.value);
  }

  /**
   * 重置状态
   */
  function reset(): void {
    executing.value = false;
    progress.value = null;
    result.value = null;
    currentBinding.value = null;
    cancelled.value = false;
    failedItems.value = [];
  }

  return {
    executing,
    progress,
    result,
    currentBinding,
    failedBindings,
    execute,
    cancel,
    retryFailed,
    reset
  };
}

export default useBindingExecute;
