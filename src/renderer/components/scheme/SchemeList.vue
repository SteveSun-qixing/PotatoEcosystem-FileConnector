<script setup lang="ts">
/**
 * 方案列表组件
 * @description 展示所有匹配方案的列表，支持选择切换
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MatchScheme } from '@/types/match';
import SchemeCard from './SchemeCard.vue';

const props = defineProps<{
  /** 方案列表 */
  schemes: MatchScheme[];
  /** 当前选中的索引 */
  selectedIndex: number;
  /** 是否正在加载 */
  loading?: boolean;
}>();

const emit = defineEmits<{
  /** 选择方案 */
  select: [index: number];
}>();

const { t } = useI18n();

/** 是否为空 */
const isEmpty = computed(() => props.schemes.length === 0 && !props.loading);

/** 推荐方案的索引（置信度最高的） */
const recommendedIndex = computed(() => {
  if (props.schemes.length === 0) return -1;
  
  let maxConfidence = -1;
  let maxIndex = 0;
  
  props.schemes.forEach((scheme, index) => {
    if (scheme.confidence > maxConfidence) {
      maxConfidence = scheme.confidence;
      maxIndex = index;
    }
  });
  
  // 只有置信度 >= 70% 才标记为推荐
  return maxConfidence >= 70 ? maxIndex : -1;
});

/** 处理方案选择 */
function handleSelect(index: number) {
  emit('select', index);
}
</script>

<template>
  <div class="scheme-list" role="listbox" :aria-label="t('scheme.list')">
    <!-- 标题 -->
    <div class="scheme-list__header">
      <h3 class="scheme-list__title">{{ t('scheme.availableSchemes') }}</h3>
      <span v-if="schemes.length > 0" class="scheme-list__count">
        {{ t('scheme.schemeCount', { count: schemes.length }) }}
      </span>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="scheme-list__loading">
      <div class="loading-spinner" />
      <span>{{ t('scheme.generating') }}</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="isEmpty" class="scheme-list__empty">
      <div class="empty-icon">📭</div>
      <p class="empty-text">{{ t('auto.noScheme') }}</p>
      <p class="empty-hint">{{ t('scheme.emptyHint') }}</p>
    </div>

    <!-- 方案列表 -->
    <div v-else class="scheme-list__items">
      <SchemeCard
        v-for="(scheme, index) in schemes"
        :key="`${scheme.mode}-${index}`"
        :scheme="scheme"
        :index="index"
        :selected="selectedIndex === index"
        :recommended="recommendedIndex === index"
        @click="handleSelect(index)"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.scheme-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--color-border-light);
  }

  &__title {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &__count {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }

  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: var(--spacing-md);
    padding: var(--spacing-xl);
    color: var(--color-text-secondary);

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: var(--spacing-xl);
    text-align: center;

    .empty-icon {
      font-size: 48px;
      margin-bottom: var(--spacing-md);
      opacity: 0.5;
    }

    .empty-text {
      margin: 0 0 var(--spacing-sm);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .empty-hint {
      margin: 0;
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    flex: 1;
    padding: var(--spacing-md);
    overflow-y: auto;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
