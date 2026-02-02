<script setup lang="ts">
/**
 * 文件选择器组件
 * @description 支持点击选择文件、拖拽文件、文件类型过滤
 */
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = withDefaults(
  defineProps<{
    /** 文件路径（v-model） */
    modelValue: string;
    /** 允许的扩展名列表 */
    accept?: string[];
    /** 占位符文本 */
    placeholder?: string;
    /** 是否禁用 */
    disabled?: boolean;
  }>(),
  {
    accept: () => [],
    placeholder: '',
    disabled: false
  }
);

const emit = defineEmits<{
  /** 更新文件路径 */
  'update:modelValue': [value: string];
  /** 文件变更事件 */
  change: [value: string];
}>();

const { t } = useI18n();

/** 是否正在拖拽 */
const isDragging = ref(false);

/** 是否聚焦 */
const isFocused = ref(false);

/** 显示的文件名 */
const displayFileName = computed(() => {
  if (!props.modelValue) return '';
  // 从路径中提取文件名
  const parts = props.modelValue.split(/[/\\]/);
  return parts[parts.length - 1] || props.modelValue;
});

/** 占位符文本 */
const placeholderText = computed(() => {
  return props.placeholder || t('fileSelector.selectFile');
});

/** 检查文件类型是否被接受 */
function isAcceptedFile(filePath: string): boolean {
  if (!props.accept || props.accept.length === 0) {
    return true;
  }
  
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  return props.accept.some(
    (ext) => ext.toLowerCase().replace('.', '') === extension
  );
}

/** 打开文件选择对话框 */
async function openFileDialog() {
  if (props.disabled) return;

  try {
    // 调用Electron的dialog API
    const result = await window.electronAPI?.dialog?.openFile({
      filters: props.accept && props.accept.length > 0 
        ? [{ name: 'Allowed Files', extensions: props.accept.map(ext => ext.replace('.', '')) }]
        : undefined,
      properties: ['openFile']
    });

    if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      updateValue(filePath);
    }
  } catch (error) {
    console.error('Failed to open file dialog:', error);
  }
}

/** 更新文件路径 */
function updateValue(filePath: string) {
  emit('update:modelValue', filePath);
  emit('change', filePath);
}

/** 清除已选文件 */
function clearFile(event: Event) {
  event.stopPropagation();
  if (props.disabled) return;
  updateValue('');
}

/** 处理拖拽进入 */
function handleDragEnter(event: DragEvent) {
  event.preventDefault();
  if (props.disabled) return;
  isDragging.value = true;
}

/** 处理拖拽经过 */
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (props.disabled) return;
  isDragging.value = true;
}

/** 处理拖拽离开 */
function handleDragLeave(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
}

/** 处理拖拽放下 */
function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;

  if (props.disabled) return;

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    // 获取第一个文件的路径
    const file = files[0];
    // Electron中，通过dataTransfer获取的File对象有path属性
    const filePath = (file as File & { path?: string }).path || file.name;
    
    if (isAcceptedFile(filePath)) {
      updateValue(filePath);
    }
  }
}

/** 处理键盘事件 */
function handleKeyDown(event: KeyboardEvent) {
  if (props.disabled) return;
  
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openFileDialog();
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    clearFile(event as unknown as Event);
  }
}
</script>

<template>
  <div
    class="file-selector"
    :class="{
      'file-selector--disabled': disabled,
      'file-selector--dragging': isDragging,
      'file-selector--focused': isFocused,
      'file-selector--has-file': modelValue
    }"
    tabindex="0"
    role="button"
    :aria-disabled="disabled"
    :aria-label="t('fileSelector.selectFile')"
    @click="openFileDialog"
    @keydown="handleKeyDown"
    @focus="isFocused = true"
    @blur="isFocused = false"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- 文件图标 -->
    <div class="file-selector__icon">
      <span v-if="modelValue" class="icon-file">📄</span>
      <span v-else class="icon-folder">📁</span>
    </div>

    <!-- 文件名或占位符 -->
    <div class="file-selector__content">
      <span v-if="modelValue" class="file-name text-truncate" :title="modelValue">
        {{ displayFileName }}
      </span>
      <span v-else class="placeholder">
        {{ placeholderText }}
      </span>
    </div>

    <!-- 清除按钮 -->
    <button
      v-if="modelValue && !disabled"
      class="file-selector__clear"
      type="button"
      :title="t('common.clear')"
      @click="clearFile"
    >
      ×
    </button>

    <!-- 选择按钮 -->
    <div class="file-selector__action">
      <span class="action-text">{{ t('fileSelector.browse') }}</span>
    </div>

    <!-- 拖拽提示覆盖层 -->
    <div v-if="isDragging && !disabled" class="file-selector__drop-overlay">
      <span class="drop-text">{{ t('fileSelector.dropHere') }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.file-selector {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  min-height: 40px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;

  &:hover:not(.file-selector--disabled) {
    border-color: var(--color-primary);
    background: var(--color-bg-hover);
  }

  &--focused:not(.file-selector--disabled) {
    border-color: var(--color-primary);
    outline: 2px solid var(--color-primary-bg);
    outline-offset: 0;
  }

  &--dragging:not(.file-selector--disabled) {
    border-color: var(--color-primary);
    border-style: dashed;
    background: var(--color-primary-bg);
  }

  &--disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--color-bg-secondary);
  }

  &--has-file {
    background: var(--color-bg-secondary);
  }

  &__icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;

    .icon-file {
      color: var(--color-primary);
    }

    .icon-folder {
      color: var(--color-text-tertiary);
    }
  }

  &__content {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;

    .file-name {
      font-size: var(--font-size-sm);
      color: var(--color-text-primary);
      font-weight: 500;
    }

    .placeholder {
      font-size: var(--font-size-sm);
      color: var(--color-text-tertiary);
    }
  }

  &__clear {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: var(--color-text-tertiary);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-full);
    transition: all var(--transition-fast);

    &:hover {
      color: var(--color-error);
      background: var(--color-error-bg);
    }
  }

  &__action {
    flex-shrink: 0;
    padding: 4px 12px;
    font-size: var(--font-size-xs);
    color: var(--color-primary);
    background: var(--color-primary-bg);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);

    .file-selector:hover:not(.file-selector--disabled) & {
      background: var(--color-primary);
      color: white;
    }
  }

  &__drop-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-primary-bg);
    border-radius: var(--radius-md);
    z-index: 1;

    .drop-text {
      font-size: var(--font-size-sm);
      color: var(--color-primary);
      font-weight: 500;
    }
  }
}

// 文本截断工具类
.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
