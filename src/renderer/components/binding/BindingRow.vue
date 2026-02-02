<script setup lang="ts">
/**
 * 绑定行组件
 * @description 展示单行绑定关系，包含卡片名称、文件选择器、状态和操作
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CardInfo, CardType } from '@/types/card';
import type { BindingItem, BindingStatus } from '@/types/binding';
import type { FileInfo } from '@/types/file';
import FileSelector from '../common/FileSelector.vue';

const props = defineProps<{
  /** 卡片信息 */
  card: CardInfo;
  /** 绑定项（可能为空） */
  binding?: BindingItem;
  /** 可选的文件列表（用于过滤） */
  files?: FileInfo[];
  /** 是否选中 */
  selected?: boolean;
  /** 是否只读 */
  readonly?: boolean;
}>();

const emit = defineEmits<{
  /** 选中状态变更 */
  'select': [selected: boolean];
  /** 文件变更 */
  'update:filePath': [filePath: string];
  /** 删除绑定 */
  'remove': [];
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

/** 获取卡片类型名称 */
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

/** 当前文件路径 */
const filePath = computed(() => props.binding?.filePath || '');

/** 是否已绑定 */
const isBound = computed(() => !!props.binding?.filePath);

/** 绑定状态 */
const bindingStatus = computed<BindingStatus | undefined>(() => props.binding?.status);

/** 状态文本和样式 */
const statusInfo = computed(() => {
  if (!isBound.value) {
    return {
      text: t('binding.unbound'),
      class: 'status--unbound'
    };
  }

  const status = bindingStatus.value;
  switch (status) {
    case 'success':
      return { text: t('common.success'), class: 'status--success' };
    case 'failed':
      return { text: t('common.failed'), class: 'status--failed' };
    case 'executing':
      return { text: t('common.loading'), class: 'status--executing' };
    case 'pending':
      return { text: t('binding.bound'), class: 'status--pending' };
    case 'skipped':
      return { text: t('common.skip'), class: 'status--skipped' };
    default:
      return { text: t('binding.bound'), class: 'status--bound' };
  }
});

/** 允许的文件类型（基于卡片类型） */
const acceptedExtensions = computed(() => {
  // 获取卡片的资源字段允许的文件类型
  if (props.card.baseCards && props.card.baseCards.length > 0) {
    const resourceFields = props.card.baseCards.flatMap((bc) => bc.resourceFields);
    const allowedTypes = resourceFields.flatMap((rf) => rf.allowedTypes || []);
    if (allowedTypes.length > 0) {
      return allowedTypes;
    }
  }

  // 默认根据卡片类型返回常见扩展名
  const typeExtensions: Record<CardType, string[]> = {
    video: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv'],
    audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
    text: ['txt', 'md', 'json', 'xml', 'yaml'],
    custom: []
  };

  return typeExtensions[props.card.type] || [];
});

/** 处理选中切换 */
function handleSelectToggle() {
  if (props.readonly) return;
  emit('select', !props.selected);
}

/** 处理文件变更 */
function handleFileChange(newPath: string) {
  emit('update:filePath', newPath);
}

/** 处理删除绑定 */
function handleRemove() {
  if (props.readonly) return;
  emit('remove');
}

/** 处理键盘事件 */
function handleKeyDown(event: KeyboardEvent) {
  if (props.readonly) return;
  
  if (event.key === 'Delete') {
    event.preventDefault();
    handleRemove();
  }
}
</script>

<template>
  <div
    class="binding-row"
    :class="{
      'binding-row--selected': selected,
      'binding-row--bound': isBound,
      'binding-row--readonly': readonly
    }"
    role="row"
    tabindex="0"
    @keydown="handleKeyDown"
  >
    <!-- 选择框 -->
    <div class="binding-row__checkbox">
      <label
        class="checkbox-wrapper"
        @click.stop="handleSelectToggle"
      >
        <span
          class="checkbox-icon"
          :class="{ checked: selected }"
        >
          <span v-if="selected" class="check-mark">✓</span>
        </span>
      </label>
    </div>

    <!-- 卡片信息 -->
    <div class="binding-row__card">
      <div class="card-icon" :title="typeName">
        {{ typeIcon }}
      </div>
      <div class="card-info">
        <div class="card-name text-truncate" :title="card.name">
          {{ card.name }}
        </div>
        <div v-if="card.description" class="card-desc text-truncate" :title="card.description">
          {{ card.description }}
        </div>
      </div>
    </div>

    <!-- 文件选择器 -->
    <div class="binding-row__file">
      <FileSelector
        :model-value="filePath"
        :accept="acceptedExtensions"
        :placeholder="t('fileSelector.selectFile')"
        :disabled="readonly"
        @update:model-value="handleFileChange"
      />
    </div>

    <!-- 绑定状态 -->
    <div class="binding-row__status">
      <span class="status-badge" :class="statusInfo.class">
        {{ statusInfo.text }}
      </span>
    </div>

    <!-- 操作按钮 -->
    <div class="binding-row__actions">
      <button
        v-if="isBound && !readonly"
        class="action-btn action-btn--delete"
        type="button"
        :title="t('common.remove')"
        @click.stop="handleRemove"
      >
        <span class="action-icon">×</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.binding-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);

  &:hover:not(.binding-row--readonly) {
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

  &--readonly {
    opacity: 0.8;
    cursor: default;
  }

  &__checkbox {
    flex-shrink: 0;
    width: 24px;

    .checkbox-wrapper {
      display: block;
      cursor: pointer;
    }

    .checkbox-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
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
        font-size: 11px;
        font-weight: bold;
        line-height: 1;
      }
    }
  }

  &__card {
    flex: 0 0 200px;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);

    .card-icon {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      background: var(--color-bg-secondary);
      border-radius: var(--radius-sm);
    }

    .card-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .card-name {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--color-text-primary);
      line-height: 1.4;
    }

    .card-desc {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }
  }

  &__file {
    flex: 1;
    min-width: 0;
  }

  &__status {
    flex-shrink: 0;
    width: 80px;
    display: flex;
    justify-content: center;
  }

  &__actions {
    flex-shrink: 0;
    width: 40px;
    display: flex;
    justify-content: center;
  }
}

// 状态徽章
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  font-size: var(--font-size-xs);
  border-radius: var(--radius-full);

  &.status--bound,
  &.status--pending {
    color: var(--color-primary);
    background: var(--color-primary-bg);
  }

  &.status--success {
    color: var(--color-success);
    background: var(--color-success-bg);
  }

  &.status--failed {
    color: var(--color-error);
    background: var(--color-error-bg);
  }

  &.status--executing {
    color: var(--color-warning);
    background: var(--color-warning-bg);
  }

  &.status--skipped,
  &.status--unbound {
    color: var(--color-text-tertiary);
    background: var(--color-bg-secondary);
  }
}

// 操作按钮
.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);

  .action-icon {
    font-size: 16px;
    font-weight: bold;
    line-height: 1;
  }

  &--delete {
    color: var(--color-text-tertiary);
    background: transparent;

    &:hover {
      color: var(--color-error);
      background: var(--color-error-bg);
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
