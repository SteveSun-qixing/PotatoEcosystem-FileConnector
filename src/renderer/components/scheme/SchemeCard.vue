<script setup lang="ts">
/**
 * 方案卡片组件
 * @description 展示单个匹配方案的信息（模式、置信度、统计）
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MatchScheme, MatchMode } from '@/types/match';

const props = defineProps<{
  /** 匹配方案 */
  scheme: MatchScheme;
  /** 是否选中 */
  selected?: boolean;
  /** 方案索引 */
  index: number;
  /** 是否推荐 */
  recommended?: boolean;
}>();

const emit = defineEmits<{
  /** 点击事件 */
  click: [];
}>();

const { t } = useI18n();

/** 是否展开预览 */
const expanded = ref(false);

/** 预览显示的最大条数 */
const PREVIEW_LIMIT = 3;

/** 模式图标映射 */
const modeIconMap: Record<MatchMode, string> = {
  number_sequence: '🔢',
  keyword: '🔤',
  file_order: '📋'
};

/** 获取模式图标 */
const modeIcon = computed(() => modeIconMap[props.scheme.mode] || '📦');

/** 获取模式名称 */
const modeName = computed(() => {
  const modeNames: Record<MatchMode, string> = {
    number_sequence: t('auto.numberMatch'),
    keyword: t('auto.keywordMatch'),
    file_order: t('auto.orderMatch')
  };
  return modeNames[props.scheme.mode] || props.scheme.mode;
});

/** 置信度等级 */
const confidenceLevel = computed(() => {
  const confidence = props.scheme.confidence;
  if (confidence >= 80) return 'high';
  if (confidence >= 50) return 'medium';
  return 'low';
});

/** 置信度颜色 */
const confidenceColor = computed(() => {
  switch (confidenceLevel.value) {
    case 'high': return 'var(--color-success)';
    case 'medium': return 'var(--color-warning)';
    default: return 'var(--color-error)';
  }
});

/** 统计信息 */
const stats = computed(() => ({
  matched: props.scheme.bindings.length,
  unmatchedCards: props.scheme.unmatchedCards.length,
  unmatchedFiles: props.scheme.unmatchedFiles.length
}));

/** 预览绑定列表 */
const previewBindings = computed(() => 
  props.scheme.bindings.slice(0, PREVIEW_LIMIT)
);

/** 是否有更多绑定 */
const hasMore = computed(() => 
  props.scheme.bindings.length > PREVIEW_LIMIT
);

/** 处理点击 */
function handleClick() {
  emit('click');
}

/** 切换展开状态 */
function toggleExpand(event: MouseEvent) {
  event.stopPropagation();
  expanded.value = !expanded.value;
}

/** 处理键盘事件 */
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    emit('click');
  }
}

/** 获取文件名 */
function getFileName(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}
</script>

<template>
  <div
    class="scheme-card"
    :class="{
      'scheme-card--selected': selected,
      'scheme-card--recommended': recommended
    }"
    role="option"
    :aria-selected="selected"
    tabindex="0"
    @click="handleClick"
    @keydown="handleKeyDown"
  >
    <!-- 推荐标记 -->
    <div v-if="recommended" class="scheme-card__badge">
      {{ t('scheme.recommended') }}
    </div>

    <!-- 头部：模式和置信度 -->
    <div class="scheme-card__header">
      <div class="scheme-card__mode">
        <span class="mode-icon">{{ modeIcon }}</span>
        <span class="mode-name">{{ modeName }}</span>
      </div>
      <div class="scheme-card__confidence" :style="{ '--confidence-color': confidenceColor }">
        <span class="confidence-value">{{ scheme.confidence }}%</span>
      </div>
    </div>

    <!-- 置信度条 -->
    <div class="scheme-card__progress">
      <div 
        class="progress-bar"
        :style="{ 
          width: `${scheme.confidence}%`,
          backgroundColor: confidenceColor
        }"
      />
    </div>

    <!-- 统计信息 -->
    <div class="scheme-card__stats">
      <span class="stat-item stat-item--matched">
        {{ t('scheme.matched', { count: stats.matched }) }}
      </span>
      <span v-if="stats.unmatchedCards > 0" class="stat-item stat-item--unmatched">
        {{ t('scheme.unmatchedCards', { count: stats.unmatchedCards }) }}
      </span>
      <span v-if="stats.unmatchedFiles > 0" class="stat-item stat-item--unmatched">
        {{ t('scheme.unmatchedFiles', { count: stats.unmatchedFiles }) }}
      </span>
    </div>

    <!-- 预览区域 -->
    <div v-if="expanded" class="scheme-card__preview">
      <div 
        v-for="binding in previewBindings" 
        :key="binding.cardId"
        class="preview-item"
      >
        <span class="preview-card">{{ binding.cardId }}</span>
        <span class="preview-arrow">→</span>
        <span class="preview-file">{{ getFileName(binding.filePath) }}</span>
      </div>
      <div v-if="hasMore" class="preview-more">
        {{ t('scheme.moreBindings', { count: scheme.bindings.length - PREVIEW_LIMIT }) }}
      </div>
    </div>

    <!-- 展开/收起按钮 -->
    <button 
      v-if="scheme.bindings.length > 0"
      class="scheme-card__toggle"
      @click="toggleExpand"
    >
      {{ expanded ? t('scheme.collapse') : t('scheme.expand') }}
      <span class="toggle-icon">{{ expanded ? '▲' : '▼' }}</span>
    </button>

    <!-- 警告信息 -->
    <div v-if="scheme.warning" class="scheme-card__warning">
      ⚠️ {{ scheme.warning }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
.scheme-card {
  position: relative;
  padding: var(--spacing-md);
  background: var(--color-bg-primary);
  border: 2px solid var(--color-border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-border);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  &--selected {
    background: var(--color-primary-bg);
    border-color: var(--color-primary);

    &:hover {
      background: var(--color-primary-bg);
    }
  }

  &--recommended {
    border-color: var(--color-success);
  }

  &__badge {
    position: absolute;
    top: -8px;
    right: var(--spacing-md);
    padding: 2px 8px;
    font-size: var(--font-size-xs);
    color: white;
    background: var(--color-success);
    border-radius: var(--radius-sm);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-sm);
  }

  &__mode {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);

    .mode-icon {
      font-size: 20px;
    }

    .mode-name {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--color-text-primary);
    }
  }

  &__confidence {
    .confidence-value {
      font-size: var(--font-size-lg);
      font-weight: 600;
      color: var(--confidence-color);
    }
  }

  &__progress {
    height: 4px;
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-full);
    overflow: hidden;
    margin-bottom: var(--spacing-sm);

    .progress-bar {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width var(--transition-normal);
    }
  }

  &__stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    font-size: var(--font-size-xs);

    .stat-item {
      padding: 2px 6px;
      border-radius: var(--radius-sm);

      &--matched {
        color: var(--color-success);
        background: var(--color-success-bg);
      }

      &--unmatched {
        color: var(--color-text-tertiary);
        background: var(--color-bg-secondary);
      }
    }
  }

  &__preview {
    margin-top: var(--spacing-md);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--color-border-light);

    .preview-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) 0;
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
    }

    .preview-card {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .preview-arrow {
      color: var(--color-text-tertiary);
    }

    .preview-file {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: right;
    }

    .preview-more {
      padding-top: var(--spacing-xs);
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
      text-align: center;
    }
  }

  &__toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    width: 100%;
    margin-top: var(--spacing-sm);
    padding: var(--spacing-xs);
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--color-primary);
    }

    .toggle-icon {
      font-size: 10px;
    }
  }

  &__warning {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
    color: var(--color-warning);
    background: var(--color-warning-bg);
    border-radius: var(--radius-sm);
  }
}
</style>
