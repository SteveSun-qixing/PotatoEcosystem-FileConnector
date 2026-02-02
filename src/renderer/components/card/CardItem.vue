<script setup lang="ts">
/**
 * 卡片项组件
 * @description 展示单个卡片的信息（名称、类型、绑定状态）
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CardInfo, CardType } from '@/types/card';

const props = defineProps<{
  /** 卡片信息 */
  card: CardInfo;
  /** 是否选中 */
  selected: boolean;
  /** 是否已绑定 */
  bound: boolean;
}>();

const emit = defineEmits<{
  /** 点击事件 */
  click: [];
}>();

const { t } = useI18n();

/** 卡片类型图标映射 */
const typeIconMap: Record<CardType, string> = {
  video: '🎬',
  audio: '🎵',
  image: '🖼️',
  document: '📄',
  text: '📝',
  custom: '📦'
};

/** 获取卡片类型图标 */
const typeIcon = computed(() => typeIconMap[props.card.type] || '📦');

/** 获取卡片类型显示名称 */
const typeName = computed(() => {
  const typeNames: Record<CardType, string> = {
    video: t('card.type.video'),
    audio: t('card.type.audio'),
    image: t('card.type.image'),
    document: t('card.type.document'),
    text: t('card.type.text'),
    custom: t('card.type.custom')
  };
  return typeNames[props.card.type] || props.card.type;
});

/** 处理点击 */
function handleClick() {
  emit('click');
}

/** 处理键盘事件 */
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    emit('click');
  }
}
</script>

<template>
  <div
    class="card-item"
    :class="{
      'card-item--selected': selected,
      'card-item--bound': bound
    }"
    role="option"
    :aria-selected="selected"
    tabindex="0"
    @click="handleClick"
    @keydown="handleKeyDown"
  >
    <!-- 选中指示器 -->
    <div class="card-item__checkbox">
      <span class="checkbox-icon" :class="{ checked: selected }">
        <span v-if="selected" class="check-mark">✓</span>
      </span>
    </div>

    <!-- 卡片类型图标 -->
    <div class="card-item__icon" :title="typeName">
      {{ typeIcon }}
    </div>

    <!-- 卡片信息 -->
    <div class="card-item__content">
      <div class="card-item__name text-truncate" :title="card.name">
        {{ card.name }}
      </div>
      <div class="card-item__meta">
        <span class="card-item__type">{{ typeName }}</span>
        <span v-if="card.description" class="card-item__desc text-truncate">
          {{ card.description }}
        </span>
      </div>
    </div>

    <!-- 绑定状态 -->
    <div class="card-item__status">
      <span
        class="status-badge"
        :class="bound ? 'status-badge--bound' : 'status-badge--unbound'"
      >
        {{ bound ? t('binding.bound') : t('binding.unbound') }}
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.card-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;

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

  &--bound {
    .card-item__name {
      color: var(--color-text-secondary);
    }
  }

  &__checkbox {
    flex-shrink: 0;
    width: 20px;
    height: 20px;

    .checkbox-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      border: 2px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-bg-primary);
      transition: all var(--transition-fast);

      &.checked {
        background: var(--color-primary);
        border-color: var(--color-primary);
      }

      .check-mark {
        color: white;
        font-size: 12px;
        font-weight: bold;
        line-height: 1;
      }
    }
  }

  &__icon {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    background: var(--color-bg-secondary);
    border-radius: var(--radius-sm);
  }

  &__content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-primary);
    line-height: 1.4;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }

  &__type {
    flex-shrink: 0;
  }

  &__desc {
    flex: 1;
    min-width: 0;

    &::before {
      content: '·';
      margin-right: var(--spacing-xs);
    }
  }

  &__status {
    flex-shrink: 0;
  }
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  border-radius: var(--radius-full);

  &--bound {
    color: var(--color-success);
    background: var(--color-success-bg);
  }

  &--unbound {
    color: var(--color-text-tertiary);
    background: var(--color-bg-secondary);
  }
}
</style>
