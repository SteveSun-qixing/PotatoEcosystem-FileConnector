<script setup lang="ts">
/**
 * 表格模式视图
 * @description 手动连接的表格模式，整合工具栏、绑定表格和状态栏
 */
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';
import type { BindingItem } from '@/types/binding';
import BindingTable from '@/components/binding/BindingTable.vue';

const props = withDefaults(
  defineProps<{
    /** 卡片列表 */
    cards: CardInfo[];
    /** 文件列表 */
    files: FileInfo[];
    /** 绑定列表 */
    bindings: BindingItem[];
  }>(),
  {
    cards: () => [],
    files: () => [],
    bindings: () => []
  }
);

const emit = defineEmits<{
  /** 更新绑定列表 */
  'update:bindings': [bindings: BindingItem[]];
  /** 选择卡片事件 */
  'select-cards': [];
  /** 添加文件事件 */
  'add-files': [];
  /** 批量设置文件夹 */
  'batch-folder': [];
  /** 清空绑定事件 */
  'clear-bindings': [];
  /** 导入配置 */
  'import-config': [];
  /** 导出配置 */
  'export-config': [];
}>();

const { t } = useI18n();

/** 绑定表格引用 */
const bindingTableRef = ref<InstanceType<typeof BindingTable> | null>(null);

/** 统计信息 */
const stats = computed(() => {
  const total = props.cards.length;
  const bound = props.bindings.filter(b => !!b.filePath).length;
  const unbound = total - bound;
  const filesUsed = new Set(props.bindings.filter(b => b.filePath).map(b => b.filePath)).size;
  const filesTotal = props.files.length;
  const filesUnused = filesTotal - filesUsed;

  return {
    total,
    bound,
    unbound,
    boundPercent: total > 0 ? Math.round((bound / total) * 100) : 0,
    filesUsed,
    filesTotal,
    filesUnused
  };
});

/** 是否有绑定 */
const hasBindings = computed(() => {
  return props.bindings.some(b => !!b.filePath);
});

/** 是否可以导出 */
const canExport = computed(() => {
  return hasBindings.value;
});

/** 处理绑定更新 */
function handleBindingsUpdate(bindings: BindingItem[]) {
  emit('update:bindings', bindings);
}

/** 处理选择卡片 */
function handleSelectCards() {
  emit('select-cards');
}

/** 处理添加文件 */
function handleAddFiles() {
  emit('add-files');
}

/** 处理批量设置文件夹 */
function handleBatchFolder() {
  emit('batch-folder');
}

/** 处理清空绑定 */
function handleClearBindings() {
  if (!hasBindings.value) return;
  
  // 确认对话框（如果需要可以在实际项目中添加）
  emit('clear-bindings');
}

/** 处理导入配置 */
function handleImportConfig() {
  emit('import-config');
}

/** 处理导出配置 */
function handleExportConfig() {
  if (!canExport.value) return;
  emit('export-config');
}

/** 处理文件选择 */
function handleSelectFile(cardId: string) {
  // 可以在这里处理文件选择后的逻辑
  console.log('File selected for card:', cardId);
}

/** 处理删除绑定 */
function handleRemoveBinding(cardId: string) {
  // 可以在这里处理删除绑定后的逻辑
  console.log('Binding removed for card:', cardId);
}
</script>

<template>
  <div class="table-mode">
    <!-- 顶部工具栏 -->
    <div class="table-mode__toolbar">
      <div class="toolbar-left">
        <!-- 卡片选择按钮 -->
        <button
          class="toolbar-btn toolbar-btn--primary"
          @click="handleSelectCards"
          :title="t('manual.selectCards')"
        >
          <span class="btn-icon">📋</span>
          <span class="btn-text">{{ t('manual.selectCards') }}</span>
        </button>

        <!-- 添加文件按钮 -->
        <button
          class="toolbar-btn"
          @click="handleAddFiles"
          :title="t('manual.addFiles')"
        >
          <span class="btn-icon">📁</span>
          <span class="btn-text">{{ t('manual.addFiles') }}</span>
        </button>

        <!-- 批量设置文件夹 -->
        <button
          class="toolbar-btn"
          :disabled="cards.length === 0"
          @click="handleBatchFolder"
          :title="t('manual.batchFolder')"
        >
          <span class="btn-icon">📂</span>
          <span class="btn-text">{{ t('manual.batchFolder') }}</span>
        </button>

        <!-- 分隔线 -->
        <div class="toolbar-divider"></div>

        <!-- 清空按钮 -->
        <button
          class="toolbar-btn toolbar-btn--danger"
          :disabled="!hasBindings"
          @click="handleClearBindings"
          :title="t('manual.clearBindings')"
        >
          <span class="btn-icon">🗑️</span>
          <span class="btn-text">{{ t('manual.clearBindings') }}</span>
        </button>
      </div>

      <div class="toolbar-right">
        <!-- 导入配置 -->
        <button
          class="toolbar-btn toolbar-btn--secondary"
          @click="handleImportConfig"
          title="导入配置"
        >
          <span class="btn-icon">📥</span>
          <span class="btn-text">导入</span>
        </button>

        <!-- 导出配置 -->
        <button
          class="toolbar-btn toolbar-btn--secondary"
          :disabled="!canExport"
          @click="handleExportConfig"
          title="导出配置"
        >
          <span class="btn-icon">📤</span>
          <span class="btn-text">导出</span>
        </button>
      </div>
    </div>

    <!-- 绑定表格 -->
    <div class="table-mode__content">
      <BindingTable
        ref="bindingTableRef"
        :cards="cards"
        :bindings="bindings"
        :files="files"
        @update:bindings="handleBindingsUpdate"
        @select-file="handleSelectFile"
        @remove-binding="handleRemoveBinding"
      />
    </div>

    <!-- 底部状态栏 -->
    <div class="table-mode__status">
      <div class="status-left">
        <div class="status-item">
          <span class="status-icon">📋</span>
          <span class="status-label">{{ t('card.filter.all') }}:</span>
          <span class="status-value">{{ stats.total }}</span>
        </div>
        <div class="status-divider">|</div>
        <div class="status-item status-item--success">
          <span class="status-label">{{ t('binding.bound') }}:</span>
          <span class="status-value">{{ stats.bound }}</span>
        </div>
        <div class="status-divider">|</div>
        <div class="status-item status-item--muted">
          <span class="status-label">{{ t('binding.unbound') }}:</span>
          <span class="status-value">{{ stats.unbound }}</span>
        </div>
      </div>

      <div class="status-center">
        <!-- 进度条 -->
        <div class="progress-bar">
          <div
            class="progress-bar__fill"
            :style="{ width: `${stats.boundPercent}%` }"
          ></div>
        </div>
        <span class="progress-text">{{ stats.boundPercent }}%</span>
      </div>

      <div class="status-right">
        <div class="status-item">
          <span class="status-icon">📁</span>
          <span class="status-label">文件:</span>
          <span class="status-value">{{ stats.filesTotal }}</span>
        </div>
        <div class="status-divider">|</div>
        <div class="status-item status-item--success">
          <span class="status-label">已用:</span>
          <span class="status-value">{{ stats.filesUsed }}</span>
        </div>
        <div class="status-divider">|</div>
        <div class="status-item status-item--muted">
          <span class="status-label">未用:</span>
          <span class="status-value">{{ stats.filesUnused }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.table-mode {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  overflow: hidden;

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-light);
  }

  &__content {
    flex: 1;
    overflow: hidden;
    padding: var(--spacing-md);
  }

  &__status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-lg);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-secondary);
    border-top: 1px solid var(--color-border-light);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }
}

// 工具栏样式
.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover:not(:disabled) {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
    border-color: var(--color-border);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &--primary {
    color: var(--color-primary);
    border-color: var(--color-primary);
    background: var(--color-primary-bg);

    &:hover:not(:disabled) {
      color: white;
      background: var(--color-primary);
    }
  }

  &--secondary {
    color: var(--color-text-tertiary);
    background: transparent;
    border-color: transparent;

    &:hover:not(:disabled) {
      color: var(--color-text-secondary);
      background: var(--color-bg-tertiary);
    }
  }

  &--danger {
    color: var(--color-error);

    &:hover:not(:disabled) {
      color: white;
      background: var(--color-error);
      border-color: var(--color-error);
    }
  }

  .btn-icon {
    font-size: 14px;
    line-height: 1;
  }

  .btn-text {
    white-space: nowrap;
  }
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--color-border);
  margin: 0 var(--spacing-xs);
}

// 状态栏样式
.status-left,
.status-center,
.status-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;

  &--success {
    color: var(--color-success);
  }

  &--muted {
    color: var(--color-text-tertiary);
  }
}

.status-icon {
  font-size: 12px;
}

.status-label {
  color: var(--color-text-tertiary);
}

.status-value {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.status-divider {
  color: var(--color-border);
}

// 进度条
.progress-bar {
  width: 100px;
  height: 6px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;

  &__fill {
    height: 100%;
    background: var(--color-success);
    border-radius: var(--radius-full);
    transition: width var(--transition-normal);
  }
}

.progress-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  min-width: 36px;
  text-align: right;
}
</style>
