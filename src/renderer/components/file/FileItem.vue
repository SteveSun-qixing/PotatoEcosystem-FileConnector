<script setup lang="ts">
/**
 * 文件项组件
 * @description 展示单个文件的信息（名称、大小、类型、修改时间、使用状态）
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FileInfo, FileType } from '@/types/file';
import { formatSize } from '@/utils/file';

const props = defineProps<{
  /** 文件信息 */
  file: FileInfo;
  /** 是否选中 */
  selected: boolean;
  /** 是否已使用（已绑定） */
  used: boolean;
}>();

const emit = defineEmits<{
  /** 点击事件 */
  click: [];
  /** 移除事件 */
  remove: [];
}>();

const { t } = useI18n();

/** 文件类型图标映射 */
const typeIconMap: Record<FileType, string> = {
  video: '🎬',
  audio: '🎵',
  image: '🖼️',
  document: '📄',
  subtitle: '💬',
  archive: '📦',
  other: '📎'
};

/** 获取文件类型图标 */
const typeIcon = computed(() => typeIconMap[props.file.type] || '📎');

/** 获取文件类型显示名称 */
const typeName = computed(() => {
  const typeNames: Record<FileType, string> = {
    video: t('file.type.video'),
    audio: t('file.type.audio'),
    image: t('file.type.image'),
    document: t('file.type.document'),
    subtitle: t('file.type.subtitle'),
    archive: t('file.type.archive'),
    other: t('file.type.other')
  };
  return typeNames[props.file.type] || props.file.type;
});

/** 格式化文件大小 */
const formattedSize = computed(() => formatSize(props.file.size));

/** 格式化修改时间 */
const formattedDate = computed(() => {
  const date = new Date(props.file.modifiedAt);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
});

/** 处理点击 */
function handleClick() {
  emit('click');
}

/** 处理移除 */
function handleRemove(event: Event) {
  event.stopPropagation();
  emit('remove');
}

/** 处理键盘事件 */
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    emit('click');
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    emit('remove');
  }
}
</script>

<template>
  <div
    class="file-item"
    :class="{
      'file-item--selected': selected,
      'file-item--used': used
    }"
    role="option"
    :aria-selected="selected"
    tabindex="0"
    @click="handleClick"
    @keydown="handleKeyDown"
  >
    <!-- 选中指示器 -->
    <div class="file-item__checkbox">
      <span class="checkbox-icon" :class="{ checked: selected }">
        <span v-if="selected" class="check-mark">✓</span>
      </span>
    </div>

    <!-- 文件类型图标 -->
    <div class="file-item__icon" :title="typeName">
      {{ typeIcon }}
    </div>

    <!-- 文件信息 -->
    <div class="file-item__content">
      <div class="file-item__name text-truncate" :title="file.name">
        {{ file.name }}
      </div>
      <div class="file-item__meta">
        <span class="file-item__type">{{ typeName }}</span>
        <span class="file-item__size">{{ formattedSize }}</span>
        <span class="file-item__date">{{ formattedDate }}</span>
      </div>
    </div>

    <!-- 使用状态 -->
    <div class="file-item__status">
      <span
        class="status-badge"
        :class="used ? 'status-badge--used' : 'status-badge--unused'"
      >
        {{ used ? t('file.status.used') : t('file.status.unused') }}
      </span>
    </div>

    <!-- 移除按钮 -->
    <button
      class="file-item__remove"
      :title="t('common.remove')"
      @click="handleRemove"
    >
      ×
    </button>
  </div>
</template>

<style lang="scss" scoped>
.file-item {
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

    .file-item__remove {
      opacity: 1;
    }
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

  &--used {
    .file-item__name {
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

  &__size {
    flex-shrink: 0;

    &::before {
      content: '·';
      margin-right: var(--spacing-xs);
    }
  }

  &__date {
    flex-shrink: 0;

    &::before {
      content: '·';
      margin-right: var(--spacing-xs);
    }
  }

  &__status {
    flex-shrink: 0;
  }

  &__remove {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: var(--color-text-tertiary);
    background: transparent;
    border-radius: var(--radius-sm);
    opacity: 0;
    transition: all var(--transition-fast);

    &:hover {
      color: var(--color-error);
      background: var(--color-error-bg);
    }
  }
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  border-radius: var(--radius-full);

  &--used {
    color: var(--color-success);
    background: var(--color-success-bg);
  }

  &--unused {
    color: var(--color-text-tertiary);
    background: var(--color-bg-secondary);
  }
}
</style>
