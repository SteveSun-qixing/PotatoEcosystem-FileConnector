/**
 * 智能匹配组合式函数
 * @description 管理智能匹配的状态和操作
 * @module renderer/composables/useSmartMatch
 */

import { ref, computed, watch } from 'vue';
import type { Ref } from 'vue';
import { useCardsStore } from '@/stores/cards';
import { useFilesStore } from '@/stores/files';
import { useConnectorStore } from '@/stores/connector';
import { useSettingsStore } from '@/stores/settings';
import { SmartMatcher } from '@/core/matchers';
import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';
import type { BindingItem } from '@/types/binding';
import type { SmartMatchResult, ClassifiedMatches } from '@/types/match';
import type { AIServiceConfig } from '@/types/config';

/**
 * 智能匹配返回类型
 */
export interface UseSmartMatchReturn {
  // 状态
  result: Ref<SmartMatchResult | null>;
  classified: Ref<ClassifiedMatches | null>;
  loading: Ref<boolean>;
  fallbackMode: Ref<boolean>;
  error: Ref<string | null>;

  // 方法
  executeMatch: (cards: CardInfo[], files: FileInfo[]) => Promise<void>;
  modifyBinding: (cardId: string, newFilePath: string) => void;
  confirmBinding: (cardId: string) => void;
  removeBinding: (cardId: string) => void;
  getConfirmedBindings: () => BindingItem[];
  checkAIAvailability: () => Promise<boolean>;
  reset: () => void;
}

/**
 * 默认AI服务配置
 */
const DEFAULT_AI_CONFIG: AIServiceConfig = {
  endpoint: 'https://api.chips.ai',
  token: '',
  timeout: 30000,
  retry: {
    maxAttempts: 3,
    delay: 1000
  },
  defaults: {
    language: 'auto',
    minConfidence: 30
  }
};

/**
 * 智能匹配组合式函数
 */
export function useSmartMatch(): UseSmartMatchReturn {
  // Store 引用
  const cardsStore = useCardsStore();
  const filesStore = useFilesStore();
  const connectorStore = useConnectorStore();
  const settingsStore = useSettingsStore();

  // 获取AI配置
  const aiConfig = computed<AIServiceConfig>(() => {
    const config = settingsStore.config?.aiService;
    if (config) {
      return config;
    }
    return DEFAULT_AI_CONFIG;
  });

  // 智能匹配器实例（延迟初始化）
  let matcher: SmartMatcher | null = null;

  // 本地状态
  const result = ref<SmartMatchResult | null>(null);
  const classified = ref<ClassifiedMatches | null>(null);
  const loading = ref(false);
  const fallbackMode = ref(false);
  const error = ref<string | null>(null);

  // 确认的绑定集合
  const confirmedBindings = ref(new Set<string>());

  // 缓存最后一次的输入
  let lastCards: CardInfo[] = [];
  let lastFiles: FileInfo[] = [];

  /**
   * 获取或创建匹配器实例
   */
  function getMatcher(): SmartMatcher {
    if (!matcher) {
      matcher = new SmartMatcher(aiConfig.value);
    }
    return matcher;
  }

  /**
   * 执行智能匹配
   * @param cards 卡片列表
   * @param files 文件列表
   */
  async function executeMatch(
    cards: CardInfo[],
    files: FileInfo[]
  ): Promise<void> {
    // 验证输入
    if (cards.length === 0) {
      error.value = '请选择卡片';
      return;
    }
    if (files.length === 0) {
      error.value = '请选择文件';
      return;
    }

    loading.value = true;
    error.value = null;
    fallbackMode.value = false;

    try {
      // 保存输入用于刷新
      lastCards = cards;
      lastFiles = files;

      // 执行智能匹配
      const smartMatcher = getMatcher();
      const matchResult = await smartMatcher.match(cards, files);

      // 更新结果
      result.value = matchResult;
      fallbackMode.value = smartMatcher.fallbackMode;

      // 对结果进行置信度分级
      if (matchResult.bindings.length > 0) {
        classified.value = smartMatcher.classifyConfidence(matchResult.bindings);
      } else {
        classified.value = {
          high: [],
          medium: [],
          low: []
        };
      }

      // 自动确认高置信度匹配
      confirmedBindings.value.clear();
      if (classified.value) {
        for (const binding of classified.value.high) {
          confirmedBindings.value.add(binding.cardId);
        }
      }

      // 同步到store
      const bindings = matchResult.bindings.map(b => ({
        cardId: b.cardId,
        filePath: b.filePath,
        resourceField: b.resourceField,
        status: 'pending' as const
      }));
      connectorStore.setBindings(bindings);

    } catch (e) {
      error.value = e instanceof Error ? e.message : '智能匹配失败';
      console.error('Smart match failed:', e);
    } finally {
      loading.value = false;
    }
  }

  /**
   * 修改绑定
   * @param cardId 卡片ID
   * @param newFilePath 新文件路径
   */
  function modifyBinding(cardId: string, newFilePath: string): void {
    if (!result.value) return;

    // 更新result中的绑定
    const bindingIndex = result.value.bindings.findIndex(b => b.cardId === cardId);
    if (bindingIndex >= 0) {
      result.value.bindings[bindingIndex].filePath = newFilePath;
      
      // 重新分级
      const smartMatcher = getMatcher();
      classified.value = smartMatcher.classifyConfidence(result.value.bindings);
    }

    // 更新store
    const storeBinding = connectorStore.bindings.find(b => b.cardId === cardId);
    if (storeBinding) {
      connectorStore.addBinding({
        ...storeBinding,
        filePath: newFilePath
      });
    }
  }

  /**
   * 确认绑定
   * @param cardId 卡片ID
   */
  function confirmBinding(cardId: string): void {
    confirmedBindings.value.add(cardId);
  }

  /**
   * 移除绑定
   * @param cardId 卡片ID
   */
  function removeBinding(cardId: string): void {
    confirmedBindings.value.delete(cardId);

    if (!result.value) return;

    // 从result中移除绑定
    const bindingIndex = result.value.bindings.findIndex(b => b.cardId === cardId);
    if (bindingIndex >= 0) {
      const removedBinding = result.value.bindings.splice(bindingIndex, 1)[0];
      
      // 将卡片添加到未匹配列表
      result.value.unmatchedCards.push(cardId);
      
      // 将文件添加到未匹配列表（如果没有其他绑定使用它）
      const fileStillUsed = result.value.bindings.some(
        b => b.filePath === removedBinding.filePath
      );
      if (!fileStillUsed) {
        result.value.unmatchedFiles.push(removedBinding.filePath);
      }

      // 重新分级
      const smartMatcher = getMatcher();
      classified.value = smartMatcher.classifyConfidence(result.value.bindings);
    }

    // 从store中移除
    connectorStore.removeBinding(cardId);
  }

  /**
   * 获取已确认的绑定列表
   * @returns 绑定列表
   */
  function getConfirmedBindings(): BindingItem[] {
    if (!result.value) return [];

    // 返回高置信度（自动确认）+ 手动确认的中低置信度绑定
    return result.value.bindings
      .filter(binding => {
        const isHighConfidence = binding.confidence >= 80;
        const isManuallyConfirmed = confirmedBindings.value.has(binding.cardId);
        return isHighConfidence || isManuallyConfirmed;
      })
      .map(binding => ({
        cardId: binding.cardId,
        filePath: binding.filePath,
        resourceField: binding.resourceField || 'primary_resource'
      }));
  }

  /**
   * 检查AI服务可用性
   * @returns 是否可用
   */
  async function checkAIAvailability(): Promise<boolean> {
    try {
      const smartMatcher = getMatcher();
      return await smartMatcher.checkAvailability();
    } catch {
      return false;
    }
  }

  /**
   * 重置状态
   */
  function reset(): void {
    result.value = null;
    classified.value = null;
    loading.value = false;
    fallbackMode.value = false;
    error.value = null;
    confirmedBindings.value.clear();
    lastCards = [];
    lastFiles = [];
  }

  // 监听配置变化，重新创建匹配器
  watch(aiConfig, () => {
    matcher = null;
  });

  // 返回
  return {
    // 状态
    result: computed(() => result.value),
    classified: computed(() => classified.value),
    loading: computed(() => loading.value),
    fallbackMode: computed(() => fallbackMode.value),
    error: computed(() => error.value),

    // 方法
    executeMatch,
    modifyBinding,
    confirmBinding,
    removeBinding,
    getConfirmedBindings,
    checkAIAvailability,
    reset
  };
}
