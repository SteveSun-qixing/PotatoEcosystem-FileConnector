<script setup lang="ts">
/**
 * 文件预览组件
 * @description 显示文件的详细信息和简单预览
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FileInfo, FileType } from '@/types/file';
import { formatSize, getDirPath } from '@/utils/file';

const props = defineProps<{
  /** 文件信息 */
  file: FileInfo | null;
}>();

const emit = defineEmits<{
  /** 关闭预览 */
  close: [];
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
const typeIcon = computed(() => {
  if (!props.file) return '📎';
  return typeIconMap[props.file.type] || '📎';
});

/** 获取文件类型显示名称 */
const typeName = computed(() => {
  if (!props.file) return '';
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
const formattedSize = computed(() => {
  if (!props.file) return '';
  return formatSize(props.file.size);
});

/** 格式化创建时间 */
const formattedCreatedAt = computed(() => {
  if (!props.file) return '';
  const date = new Date(props.file.createdAt);
  return date.toLocaleString('zh-CN');
});

/** 格式化修改时间 */
const formattedModifiedAt = computed(() => {
  if (!props.file) return '';
  const date = new Date(props.file.modifiedAt);
  return date.toLocaleString('zh-CN');
});

/** 获取目录路径 */
const dirPath = computed(() => {
  if (!props.file) return '';
  return getDirPath(props.file.path);
});

/** 是否可预览图片 */
const isImagePreviewable = computed(() => {
  return props.file?.type === 'image';
});

/** 处理关闭 */
function handleClose() {
  emit('close');
}
</script>

<template>
  <div class="file-preview" v-if="file">
    <!-- 头部 -->
    <div class="file-preview__header">
      <div class="file-preview__title">
        <span class="file-icon">{{ typeIcon }}</span>
        <span class="file-name text-truncate" :title="file.name">{{ file.name }}</span>
      </div>
      <button class="close-btn" @click="handleClose" :title="t('common.close')">
        ×
      </button>
    </div>

    <!-- 预览区域 -->
    <div class="file-preview__content">
      <!-- 图片预览 -->
      <div v-if="isImagePreviewable" class="preview-image">
        <img :src="`file://${file.path}`" :alt="file.name" />
      </div>

      <!-- 非图片文件显示图标 -->
      <div v-else class="preview-placeholder">
        <div class="placeholder-icon">{{ typeIcon }}</div>
        <div class="placeholder-type">{{ typeName }}</div>
      </div>
    </div>

    <!-- 详细信息 -->
    <div class="file-preview__details">
      <div class="detail-item">
        <span class="detail-label">{{ t('file.detail.type') }}</span>
        <span class="detail-value">{{ typeName }}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">{{ t('file.detail.extension') }}</span>
        <span class="detail-value">.{{ file.extension }}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">{{ t('file.detail.size') }}</span>
        <span class="detail-value">{{ formattedSize }}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">{{ t('file.detail.mimeType') }}</span>
        <span class="detail-value text-truncate" :title="file.mimeType">{{ file.mimeType }}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">{{ t('file.detail.createdAt') }}</span>
        <span class="detail-value">{{ formattedCreatedAt }}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">{{ t('file.detail.modifiedAt') }}</span>
        <span class="detail-value">{{ formattedModifiedAt }}</span>
      </div>

      <div class="detail-item detail-item--full">
        <span class="detail-label">{{ t('file.detail.path') }}</span>
        <span class="detail-value detail-value--path text-truncate" :title="file.path">
          {{ file.path }}
        </span>
      </div>

      <div class="detail-item detail-item--full">
        <span class="detail-label">{{ t('file.detail.directory') }}</span>
        <span class="detail-value detail-value--path text-truncate" :title="dirPath">
          {{ dirPath }}
        </span>
      </div>
    </div>
  </div>

  <!-- 空状态 -->
  <div v-else class="file-preview file-preview--empty">
    <div class="empty-icon">📄</div>
    <div class="empty-text">{{ t('file.preview.selectFile') }}</div>
  </div>
</template>

<style lang="scss" scoped>
.file-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;

  &--empty {
    align-items: center;
    justify-content: center;
    color: var(--color-text-tertiary);

    .empty-icon {
      font-size: 48px;
      margin-bottom: var(--spacing-md);
    }

    .empty-text {
      font-size: var(--font-size-sm);
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-light);
  }

  &__title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    min-width: 0;
    flex: 1;

    .file-icon {
      flex-shrink: 0;
      font-size: 20px;
    }

    .file-name {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--color-text-primary);
    }
  }

  &__content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-md);
    background: var(--color-bg-tertiary);
    min-height: 150px;
    overflow: hidden;
  }

  &__details {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    border-top: 1px solid var(--color-border-light);
  }
}

.close-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--color-text-tertiary);
  background: transparent;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);

  &:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
  }
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    max-width: 100%;
    max-height: 200px;
    object-fit: contain;
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-md);
  }
}

.preview-placeholder {
  text-align: center;
  color: var(--color-text-tertiary);

  .placeholder-icon {
    font-size: 64px;
    margin-bottom: var(--spacing-sm);
  }

  .placeholder-type {
    font-size: var(--font-size-sm);
  }
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &--full {
    grid-column: span 2;
  }
}

.detail-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.detail-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);

  &--path {
    font-family: monospace;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }
}
</style>
