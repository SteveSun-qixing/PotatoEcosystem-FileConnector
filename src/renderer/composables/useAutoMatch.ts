/**
 * 自动匹配组合式函数
 * @description 管理自动匹配的状态和操作
 * @module renderer/composables/useAutoMatch
 */

import { ref, computed, watch } from 'vue';
import type { Ref } from 'vue';
import { useCardsStore } from '@/stores/cards';
import { useFilesStore } from '@/stores/files';
import { useConnectorStore } from '@/stores/connector';
import { SchemeGenerator } from '@/core/matchers';
import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';
import type { MatchScheme, MatchOptions } from '@/types/match';
import type { BindingItem } from '@/types/binding';

/**
 * 自动匹配返回类型
 */
export interface UseAutoMatchReturn {
  // 状态
  schemes: Ref<MatchScheme[]>;
  selectedIndex: Ref<number>;
  loading: Ref<boolean>;
  error: Ref<string | null>;

  // 计算属性
  selectedScheme: Ref<MatchScheme | null>;
  hasSchemes: Ref<boolean>;
  recommendedScheme: Ref<MatchScheme | null>;
  totalMatched: Ref<number>;
  totalUnmatched: Ref<{ cards: number; files: number }>;

  // 方法
  generateSchemes: (cards: CardInfo[], files: FileInfo[], options?: MatchOptions) => Promise<void>;
  selectScheme: (index: number) => void;
  applyScheme: () => BindingItem[];
  getSelectedScheme: () => MatchScheme | null;
  clearSchemes: () => void;
  refreshSchemes: () => Promise<void>;
}

/**
 * 自动匹配组合式函数
 */
export function useAutoMatch(): UseAutoMatchReturn {
  // Store 引用
  const cardsStore = useCardsStore();
  const filesStore = useFilesStore();
  const connectorStore = useConnectorStore();

  // 方案生成器
  const generator = new SchemeGenerator({
    autoSelectThreshold: 85,
    includeAllSchemes: true
  });

  // 本地状态
  const schemes = ref<MatchScheme[]>([]);
  const selectedIndex = ref<number>(-1);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // 缓存最后一次生成的输入
  let lastCards: CardInfo[] = [];
  let lastFiles: FileInfo[] = [];
  let lastOptions: MatchOptions | undefined;

  // 计算属性

  /** 当前选中的方案 */
  const selectedScheme = computed<MatchScheme | null>(() => {
    if (selectedIndex.value >= 0 && selectedIndex.value < schemes.value.length) {
      return schemes.value[selectedIndex.value];
    }
    return null;
  });

  /** 是否有方案 */
  const hasSchemes = computed(() => schemes.value.length > 0);

  /** 推荐方案（置信度最高且 >= 70%） */
  const recommendedScheme = computed<MatchScheme | null>(() => {
    if (schemes.value.length === 0) return null;
    const best = schemes.value[0]; // 已按置信度排序
    return best.confidence >= 70 ? best : null;
  });

  /** 当前选中方案的匹配总数 */
  const totalMatched = computed(() => {
    return selectedScheme.value?.bindings.length ?? 0;
  });

  /** 当前选中方案的未匹配统计 */
  const totalUnmatched = computed(() => ({
    cards: selectedScheme.value?.unmatchedCards.length ?? 0,
    files: selectedScheme.value?.unmatchedFiles.length ?? 0
  }));

  // 方法

  /**
   * 生成匹配方案
   * @param cards 卡片列表
   * @param files 文件列表
   * @param options 匹配选项
   */
  async function generateSchemes(
    cards: CardInfo[],
    files: FileInfo[],
    options?: MatchOptions
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

    try {
      // 保存输入用于刷新
      lastCards = cards;
      lastFiles = files;
      lastOptions = options;

      // 使用 Promise 包装以支持异步UI更新
      await new Promise<void>((resolve) => {
        // 使用 setTimeout 确保加载状态能够显示
        setTimeout(() => {
          try {
            // 生成所有方案
            const result = generator.generateAll(cards, files, options);
            
            schemes.value = result;
            
            // 自动选择最佳方案
            if (result.length > 0) {
              selectedIndex.value = 0;
            } else {
              selectedIndex.value = -1;
            }

            // 同步到 store
            connectorStore.setSchemes(result);
            
            resolve();
          } catch (e) {
            error.value = e instanceof Error ? e.message : '生成方案失败';
            console.error('Failed to generate schemes:', e);
            resolve();
          }
        }, 100);
      });
    } finally {
      loading.value = false;
    }
  }

  /**
   * 选择方案
   * @param index 方案索引
   */
  function selectScheme(index: number): void {
    if (index >= 0 && index < schemes.value.length) {
      selectedIndex.value = index;
      connectorStore.selectScheme(index);
    }
  }

  /**
   * 应用当前选中的方案
   * @returns 绑定列表
   */
  function applyScheme(): BindingItem[] {
    const scheme = selectedScheme.value;
    if (!scheme) {
      return [];
    }

    // 复制绑定列表并设置状态
    const bindings = scheme.bindings.map(binding => ({
      ...binding,
      status: 'pending' as const
    }));

    // 同步到 store
    connectorStore.setBindings(bindings);
    connectorStore.applySelectedScheme();

    // 更新文件使用状态
    bindings.forEach(binding => {
      if (binding.filePath) {
        filesStore.markAsUsed(binding.filePath);
      }
    });

    return bindings;
  }

  /**
   * 获取当前选中的方案
   * @returns 选中的方案或 null
   */
  function getSelectedScheme(): MatchScheme | null {
    return selectedScheme.value;
  }

  /**
   * 清空方案
   */
  function clearSchemes(): void {
    schemes.value = [];
    selectedIndex.value = -1;
    error.value = null;
    connectorStore.setSchemes([]);
  }

  /**
   * 刷新方案（使用上次的输入重新生成）
   */
  async function refreshSchemes(): Promise<void> {
    if (lastCards.length > 0 && lastFiles.length > 0) {
      await generateSchemes(lastCards, lastFiles, lastOptions);
    }
  }

  // 监听 store 中方案的变化，保持同步
  watch(
    () => connectorStore.schemes,
    (newSchemes) => {
      if (newSchemes !== schemes.value) {
        schemes.value = newSchemes;
      }
    }
  );

  watch(
    () => connectorStore.selectedSchemeIndex,
    (newIndex) => {
      if (newIndex !== selectedIndex.value) {
        selectedIndex.value = newIndex;
      }
    }
  );

  // 返回
  return {
    // 状态
    schemes: computed(() => schemes.value),
    selectedIndex: computed(() => selectedIndex.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),

    // 计算属性
    selectedScheme,
    hasSchemes,
    recommendedScheme,
    totalMatched,
    totalUnmatched,

    // 方法
    generateSchemes,
    selectScheme,
    applyScheme,
    getSelectedScheme,
    clearSchemes,
    refreshSchemes
  };
}
