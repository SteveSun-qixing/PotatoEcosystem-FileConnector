/**
 * 模式转换组合式函数
 * @description 模式转换的核心逻辑
 * @module renderer/composables/useModeConvert
 */

import { ref, computed, shallowRef } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import type { CardInfo, ResourceMode, ResourceInfo } from '@/types/card';
import type {
  ConvertOptions,
  ConvertProgress,
  ConvertResult
} from '@/types/convert';

/**
 * 模拟SDK接口（实际使用时从preload注入）
 */
interface ChipsSDK {
  getCard(cardId: string): Promise<CardInfo | null>;
  getCardResources(cardId: string): Promise<ResourceInfo[]>;
  copyResource(source: string, target: string): Promise<void>;
  moveResource(source: string, target: string): Promise<void>;
  getDiskSpace(path: string): Promise<{ available: number; total: number }>;
  getCardInternalPath(cardId: string): string;
  ensureDirectory(path: string): Promise<void>;
  updateCard(cardId: string, updates: Record<string, unknown>): Promise<void>;
  fileExists(path: string): Promise<boolean>;
}

/**
 * 获取SDK实例（实际实现中从window.api获取）
 */
function getSDK(): ChipsSDK {
  // 模拟实现
  return {
    async getCard(cardId: string) {
      return {
        id: cardId,
        name: `Card ${cardId}`,
        type: 'video' as const,
        path: `/cards/${cardId}`,
        baseCards: [],
        resourceMode: 'empty' as ResourceMode,
        metadata: {
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
          version: '1.0.0',
          tags: []
        }
      };
    },
    async getCardResources(cardId: string) {
      return [];
    },
    async copyResource(source: string, target: string) {
      console.log('Copy resource:', source, '->', target);
    },
    async moveResource(source: string, target: string) {
      console.log('Move resource:', source, '->', target);
    },
    async getDiskSpace(path: string) {
      return { available: 100 * 1024 * 1024 * 1024, total: 500 * 1024 * 1024 * 1024 };
    },
    getCardInternalPath(cardId: string) {
      return `/cards/${cardId}/resources`;
    },
    async ensureDirectory(path: string) {
      console.log('Ensure directory:', path);
    },
    async updateCard(cardId: string, updates: Record<string, unknown>) {
      console.log('Update card:', cardId, updates);
    },
    async fileExists(path: string) {
      return true;
    }
  };
}

/**
 * 使用模式转换返回类型
 */
export interface UseModeConvertReturn {
  /** 是否正在转换 */
  converting: Ref<boolean>;
  /** 转换进度 */
  progress: Ref<ConvertProgress | null>;
  /** 转换结果 */
  result: Ref<ConvertResult | null>;
  /** 所需空间（字节） */
  requiredSpace: Ref<number>;
  /** 可用空间（字节） */
  availableSpace: Ref<number>;
  /** 当前卡片的资源模式 */
  currentMode: Ref<ResourceMode | null>;
  /** 外部资源列表 */
  externalResources: Ref<ResourceInfo[]>;
  /** 内部资源列表 */
  internalResources: Ref<ResourceInfo[]>;
  /** 是否有足够空间 */
  hasEnoughSpace: ComputedRef<boolean>;
  
  /** 检测卡片模式 */
  detectMode: (cardId: string) => Promise<ResourceMode>;
  /** 加载卡片资源信息 */
  loadCardResources: (cardId: string) => Promise<void>;
  /** 检查空间 */
  checkSpace: (cardIds: string[], targetPath?: string) => Promise<boolean>;
  /** 转换为全填充模式 */
  toFull: (cardIds: string[], options?: ConvertOptions) => Promise<void>;
  /** 转换为空壳模式 */
  toEmpty: (cardIds: string[], targetPath: string, options?: ConvertOptions) => Promise<void>;
  /** 取消转换 */
  cancel: () => void;
  /** 重置状态 */
  reset: () => void;
}

/**
 * 模式转换组合式函数
 */
export function useModeConvert(): UseModeConvertReturn {
  // SDK
  const sdk = getSDK();

  // 状态
  const converting = ref(false);
  const progress = ref<ConvertProgress | null>(null);
  const result = shallowRef<ConvertResult | null>(null);
  const requiredSpace = ref(0);
  const availableSpace = ref(0);
  const currentMode = ref<ResourceMode | null>(null);
  const externalResources = ref<ResourceInfo[]>([]);
  const internalResources = ref<ResourceInfo[]>([]);
  const cancelled = ref(false);

  /**
   * 是否有足够空间
   */
  const hasEnoughSpace = computed(() => {
    if (requiredSpace.value === 0) return true;
    // 保留10%余量
    return availableSpace.value > requiredSpace.value * 1.1;
  });

  /**
   * 检测卡片资源模式
   */
  async function detectMode(cardId: string): Promise<ResourceMode> {
    const resources = await sdk.getCardResources(cardId);
    
    if (resources.length === 0) {
      return 'empty';
    }

    const internalCount = resources.filter(r => r.internal).length;
    const externalCount = resources.filter(r => !r.internal).length;

    if (internalCount === resources.length) {
      currentMode.value = 'full';
      return 'full';
    } else if (externalCount === resources.length) {
      currentMode.value = 'empty';
      return 'empty';
    } else {
      currentMode.value = 'semi';
      return 'semi';
    }
  }

  /**
   * 加载卡片资源信息
   */
  async function loadCardResources(cardId: string): Promise<void> {
    const resources = await sdk.getCardResources(cardId);
    externalResources.value = resources.filter(r => !r.internal);
    internalResources.value = resources.filter(r => r.internal);
    
    await detectMode(cardId);
  }

  /**
   * 计算所需空间
   */
  async function calculateRequiredSpace(cardIds: string[]): Promise<number> {
    let totalSize = 0;

    for (const cardId of cardIds) {
      const resources = await sdk.getCardResources(cardId);
      for (const resource of resources) {
        totalSize += resource.size;
      }
    }

    return totalSize;
  }

  /**
   * 检查空间
   */
  async function checkSpace(cardIds: string[], targetPath?: string): Promise<boolean> {
    // 计算所需空间
    requiredSpace.value = await calculateRequiredSpace(cardIds);

    // 获取可用空间
    const path = targetPath || '/';
    const diskInfo = await sdk.getDiskSpace(path);
    availableSpace.value = diskInfo.available;

    return hasEnoughSpace.value;
  }

  /**
   * 转换为全填充模式
   */
  async function toFull(cardIds: string[], options?: ConvertOptions): Promise<void> {
    if (converting.value) {
      throw new Error('已有转换任务正在进行中');
    }

    converting.value = true;
    cancelled.value = false;

    const startTime = Date.now();
    let totalSize = 0;
    let success = 0;
    let failed = 0;

    // 初始化进度
    progress.value = {
      currentCard: 0,
      totalCards: cardIds.length,
      currentResource: 0,
      totalResources: 0,
      bytesTransferred: 0,
      totalBytes: 0,
      percentage: 0
    };

    const details: Array<{
      cardId: string;
      cardName: string;
      status: 'success' | 'failed' | 'partial';
      resourceCount: number;
      size: number;
    }> = [];
    const errors: Array<{
      cardId: string;
      resourcePath?: string;
      code: string;
      message: string;
    }> = [];

    try {
      // 预计算总资源数
      for (const cardId of cardIds) {
        const resources = await sdk.getCardResources(cardId);
        const external = resources.filter(r => !r.internal);
        progress.value!.totalResources += external.length;
        progress.value!.totalBytes += external.reduce((sum, r) => sum + r.size, 0);
      }

      for (let i = 0; i < cardIds.length; i++) {
        if (cancelled.value) break;

        const cardId = cardIds[i];
        const card = await sdk.getCard(cardId);

        if (!card) {
          failed++;
          errors.push({
            cardId,
            code: 'CARD_NOT_FOUND',
            message: '卡片不存在'
          });
          continue;
        }

        progress.value!.currentCard = i + 1;
        progress.value!.cardId = cardId;

        const resources = await sdk.getCardResources(cardId);
        const externalResources = resources.filter(r => !r.internal);
        const internalPath = sdk.getCardInternalPath(cardId);

        await sdk.ensureDirectory(internalPath);

        let cardResourceCount = 0;
        let cardSize = 0;
        let cardHasError = false;

        for (const resource of externalResources) {
          if (cancelled.value) break;

          progress.value!.currentResource++;
          progress.value!.resourcePath = resource.uri;

          try {
            const fileName = resource.name;
            const targetPath = `${internalPath}/${fileName}`;

            await sdk.copyResource(resource.uri, targetPath);

            cardResourceCount++;
            cardSize += resource.size;
            progress.value!.bytesTransferred += resource.size;

            // 更新百分比
            progress.value!.percentage = Math.round(
              (progress.value!.bytesTransferred / progress.value!.totalBytes) * 100
            );

            // 调用进度回调
            if (options?.onProgress) {
              options.onProgress(progress.value!);
            }

          } catch (error) {
            cardHasError = true;
            errors.push({
              cardId,
              resourcePath: resource.uri,
              code: 'COPY_ERROR',
              message: (error as Error).message
            });
          }
        }

        if (cardHasError) {
          if (cardResourceCount > 0) {
            details.push({
              cardId,
              cardName: card.name,
              status: 'partial',
              resourceCount: cardResourceCount,
              size: cardSize
            });
          } else {
            failed++;
            details.push({
              cardId,
              cardName: card.name,
              status: 'failed',
              resourceCount: 0,
              size: 0
            });
          }
        } else {
          success++;
          details.push({
            cardId,
            cardName: card.name,
            status: 'success',
            resourceCount: cardResourceCount,
            size: cardSize
          });
          
          // 更新卡片模式
          await sdk.updateCard(cardId, { resourceMode: 'full' });
        }

        totalSize += cardSize;
      }

    } finally {
      converting.value = false;
    }

    result.value = {
      success,
      failed,
      totalSize,
      duration: Date.now() - startTime,
      details,
      errors
    };
  }

  /**
   * 转换为空壳模式
   */
  async function toEmpty(
    cardIds: string[],
    targetPath: string,
    options?: ConvertOptions
  ): Promise<void> {
    if (converting.value) {
      throw new Error('已有转换任务正在进行中');
    }

    if (!targetPath) {
      throw new Error('目标路径不能为空');
    }

    converting.value = true;
    cancelled.value = false;

    const startTime = Date.now();
    let totalSize = 0;
    let success = 0;
    let failed = 0;

    // 初始化进度
    progress.value = {
      currentCard: 0,
      totalCards: cardIds.length,
      currentResource: 0,
      totalResources: 0,
      bytesTransferred: 0,
      totalBytes: 0,
      percentage: 0
    };

    const details: Array<{
      cardId: string;
      cardName: string;
      status: 'success' | 'failed' | 'partial';
      resourceCount: number;
      size: number;
    }> = [];
    const errors: Array<{
      cardId: string;
      resourcePath?: string;
      code: string;
      message: string;
    }> = [];

    try {
      // 确保目标目录存在
      await sdk.ensureDirectory(targetPath);

      // 预计算总资源数
      for (const cardId of cardIds) {
        const resources = await sdk.getCardResources(cardId);
        const internal = resources.filter(r => r.internal);
        progress.value!.totalResources += internal.length;
        progress.value!.totalBytes += internal.reduce((sum, r) => sum + r.size, 0);
      }

      for (let i = 0; i < cardIds.length; i++) {
        if (cancelled.value) break;

        const cardId = cardIds[i];
        const card = await sdk.getCard(cardId);

        if (!card) {
          failed++;
          errors.push({
            cardId,
            code: 'CARD_NOT_FOUND',
            message: '卡片不存在'
          });
          continue;
        }

        progress.value!.currentCard = i + 1;
        progress.value!.cardId = cardId;

        const resources = await sdk.getCardResources(cardId);
        const internalResourcesList = resources.filter(r => r.internal);

        // 创建卡片专用目录
        const cardTargetPath = `${targetPath}/${card.name}`;
        await sdk.ensureDirectory(cardTargetPath);

        let cardResourceCount = 0;
        let cardSize = 0;
        let cardHasError = false;

        for (const resource of internalResourcesList) {
          if (cancelled.value) break;

          progress.value!.currentResource++;
          progress.value!.resourcePath = resource.uri;

          try {
            const fileName = resource.name;
            const newPath = `${cardTargetPath}/${fileName}`;

            await sdk.moveResource(resource.uri, newPath);

            cardResourceCount++;
            cardSize += resource.size;
            progress.value!.bytesTransferred += resource.size;

            // 更新百分比
            progress.value!.percentage = Math.round(
              (progress.value!.bytesTransferred / progress.value!.totalBytes) * 100
            );

            // 调用进度回调
            if (options?.onProgress) {
              options.onProgress(progress.value!);
            }

          } catch (error) {
            cardHasError = true;
            errors.push({
              cardId,
              resourcePath: resource.uri,
              code: 'MOVE_ERROR',
              message: (error as Error).message
            });
          }
        }

        if (cardHasError) {
          if (cardResourceCount > 0) {
            details.push({
              cardId,
              cardName: card.name,
              status: 'partial',
              resourceCount: cardResourceCount,
              size: cardSize
            });
          } else {
            failed++;
            details.push({
              cardId,
              cardName: card.name,
              status: 'failed',
              resourceCount: 0,
              size: 0
            });
          }
        } else {
          success++;
          details.push({
            cardId,
            cardName: card.name,
            status: 'success',
            resourceCount: cardResourceCount,
            size: cardSize
          });
          
          // 更新卡片模式
          await sdk.updateCard(cardId, { resourceMode: 'empty' });
        }

        totalSize += cardSize;
      }

    } finally {
      converting.value = false;
    }

    result.value = {
      success,
      failed,
      totalSize,
      duration: Date.now() - startTime,
      details,
      errors
    };
  }

  /**
   * 取消转换
   */
  function cancel(): void {
    if (converting.value) {
      cancelled.value = true;
    }
  }

  /**
   * 重置状态
   */
  function reset(): void {
    converting.value = false;
    progress.value = null;
    result.value = null;
    requiredSpace.value = 0;
    availableSpace.value = 0;
    currentMode.value = null;
    externalResources.value = [];
    internalResources.value = [];
    cancelled.value = false;
  }

  return {
    converting,
    progress,
    result,
    requiredSpace,
    availableSpace,
    currentMode,
    externalResources,
    internalResources,
    hasEnoughSpace,
    detectMode,
    loadCardResources,
    checkSpace,
    toFull,
    toEmpty,
    cancel,
    reset
  };
}

export default useModeConvert;
