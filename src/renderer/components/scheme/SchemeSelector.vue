<script setup lang="ts">
/**
 * 方案选择器组件
 * @description 整合方案列表和详情，提供方案选择和应用功能
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MatchScheme } from '@/types/match';
import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';
import SchemeList from './SchemeList.vue';
import SchemeDetail from './SchemeDetail.vue';

const props = defineProps<{
  /** 方案列表 */
  schemes: MatchScheme[];
  /** 当前选中的索引 */
  selectedIndex: number;
  /** 是否正在加载 */
  loading?: boolean;
  /** 卡片列表（用于显示名称） */
  cards?: CardInfo[];
  /** 文件列表（用于显示名称） */
  files?: FileInfo[];
}>();

const emit = defineEmits<{
  /** 选择方案 */
  select: [index: number];
  /** 应用方案 */
  apply: [];
  /** 手动调整 */
  manual: [];
}>();

const { t } = useI18n();

/** 当前选中的方案 */
const selectedScheme = computed(() => {
  if (props.selectedIndex >= 0 && props.selectedIndex < props.schemes.length) {
    return props.schemes[props.selectedIndex];
  }
  return null;
});

/** 卡片映射表 */
const cardMap = computed(() => {
  const map = new Map<string, CardInfo>();
  props.cards?.forEach(card => {
    map.set(card.id, card);
  });
  return map;
});

/** 文件映射表 */
const fileMap = computed(() => {
  const map = new Map<string, FileInfo>();
  props.files?.forEach(file => {
    map.set(file.path, file);
  });
  return map;
});

/** 是否可以应用 */
const canApply = computed(() => {
  return selectedScheme.value !== null && selectedScheme.value.bindings.length > 0;
});

/** 推荐方案信息 */
const recommendedInfo = computed(() => {
  if (props.schemes.length === 0) return null;
  
  const best = props.schemes[0]; // 已按置信度排序
  if (best.confidence < 50) return null;
  
  const modeNames: Record<string, string> = {
    number_sequence: t('auto.numberMatch'),
    keyword: t('auto.keywordMatch'),
    file_order: t('auto.orderMatch')
  };
  
  return {
    mode: modeNames[best.mode] || best.mode,
    confidence: best.confidence
  };
});

/** 处理方案选择 */
function handleSelect(index: number) {
  emit('select', index);
}

/** 处理应用方案 */
function handleApply() {
  if (canApply.value) {
    emit('apply');
  }
}

/** 处理手动调整 */
function handleManual() {
  emit('manual');
}
</script>

<template>
  <div class="scheme-selector">
    <!-- 主体区域 -->
    <div class="scheme-selector__body">
      <!-- 左侧：方案列表 -->
      <div class="scheme-selector__list">
        <SchemeList
          :schemes="schemes"
          :selected-index="selectedIndex"
          :loading="loading"
          @select="handleSelect"
        />
      </div>

      <!-- 右侧：方案详情 -->
      <div class="scheme-selector__detail">
        <SchemeDetail
          :scheme="selectedScheme"
          :card-map="cardMap"
          :file-map="fileMap"
        />
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="scheme-selector__footer">
      <!-- 统计信息 -->
      <div class="footer-stats">
        <span v-if="cards?.length">
          {{ t('status.cardsSelected', { count: cards.length }) }}
        </span>
        <span v-if="files?.length">
          {{ t('status.filesSelected', { count: files.length }) }}
        </span>
        <span v-if="recommendedInfo" class="footer-recommend">
          {{ t('scheme.recommendedScheme') }}: {{ recommendedInfo.mode }} ({{ recommendedInfo.confidence }}%)
        </span>
      </div>

      <!-- 操作按钮 -->
      <div class="footer-actions">
        <button
          class="action-btn action-btn--secondary"
          @click="handleManual"
        >
          {{ t('scheme.manualAdjust') }}
        </button>
        <button
          class="action-btn action-btn--primary"
          :disabled="!canApply"
          @click="handleApply"
        >
          {{ t('auto.applyScheme') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.scheme-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  overflow: hidden;

  &__body {
    display: flex;
    flex: 1;
    min-height: 0;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
  }

  &__list {
    width: 300px;
    flex-shrink: 0;
  }

  &__detail {
    flex: 1;
    min-width: 0;
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    background: var(--color-bg-primary);
    border-top: 1px solid var(--color-border-light);

    .footer-stats {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);

      .footer-recommend {
        padding: 2px 8px;
        color: var(--color-primary);
        background: var(--color-primary-bg);
        border-radius: var(--radius-sm);
      }
    }

    .footer-actions {
      display: flex;
      gap: var(--spacing-sm);
    }
  }
}

.action-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--font-size-sm);
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);

  &--primary {
    color: white;
    background: var(--color-primary);
    border: 1px solid var(--color-primary);

    &:hover:not(:disabled) {
      background: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
    }

    &:active:not(:disabled) {
      background: var(--color-primary-active);
      border-color: var(--color-primary-active);
    }

    &:disabled {
      background: var(--color-text-disabled);
      border-color: var(--color-text-disabled);
      cursor: not-allowed;
    }
  }

  &--secondary {
    color: var(--color-text-secondary);
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);

    &:hover {
      color: var(--color-text-primary);
      border-color: var(--color-text-tertiary);
    }

    &:active {
      background: var(--color-bg-hover);
    }
  }
}
</style>
