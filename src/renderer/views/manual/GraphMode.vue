<script setup lang="ts">
/**
 * 图形模式视图
 * @description 手动连接的图形模式，整合工具栏、ConnectionGraph和底部提示
 */
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';
import type { BindingItem } from '@/types/binding';
import ConnectionGraph from '@/components/graph/ConnectionGraph.vue';

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
  /** 添加文件事件 */
  'add-files': [];
  /** 创建连接 */
  'create-connection': [cardId: string, filePath: string];
  /** 删除连接 */
  'delete-connection': [cardId: string];
}>();

const { t } = useI18n();

/** ConnectionGraph 组件引用 */
const connectionGraphRef = ref<InstanceType<typeof ConnectionGraph> | null>(null);

/** 当前缩放值 */
const currentZoom = ref(100);

/** 选中的连接ID */
const selectedConnectionId = ref<string | null>(null);

/** 统计信息 */
const stats = computed(() => {
  const total = props.cards.length;
  const bound = props.bindings.filter(b => !!b.filePath).length;
  const unbound = total - bound;

  return {
    total,
    bound,
    unbound
  };
});

/** 是否有连接 */
const hasConnections = computed(() => {
  return props.bindings.some(b => !!b.filePath);
});

/** 缩放预设值 */
const zoomPresets = [50, 75, 100, 125, 150, 200];

/** 处理绑定更新 */
function handleBindingsUpdate(bindings: BindingItem[]) {
  emit('update:bindings', bindings);
}

/** 处理添加文件 */
function handleAddFiles() {
  emit('add-files');
}

/** 处理清空连接 */
function handleClearConnections() {
  if (!hasConnections.value) return;
  connectionGraphRef.value?.clearAllConnections();
}

/** 处理自动排列 */
function handleAutoArrange() {
  connectionGraphRef.value?.autoLayout();
}

/** 处理适应视图 */
function handleFitToView() {
  connectionGraphRef.value?.fitToView();
}

/** 处理重置视图 */
function handleResetView() {
  connectionGraphRef.value?.resetView();
  currentZoom.value = 100;
}

/** 处理缩小 */
function handleZoomOut() {
  const currentIndex = zoomPresets.findIndex(z => z >= currentZoom.value);
  const newIndex = Math.max(0, currentIndex - 1);
  currentZoom.value = zoomPresets[newIndex];
  connectionGraphRef.value?.setZoom(currentZoom.value / 100);
}

/** 处理放大 */
function handleZoomIn() {
  const currentIndex = zoomPresets.findIndex(z => z > currentZoom.value);
  const newIndex = currentIndex === -1 ? zoomPresets.length - 1 : Math.min(zoomPresets.length - 1, currentIndex);
  currentZoom.value = zoomPresets[newIndex];
  connectionGraphRef.value?.setZoom(currentZoom.value / 100);
}

/** 处理缩放滑块变化 */
function handleZoomChange(event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value);
  currentZoom.value = value;
  connectionGraphRef.value?.setZoom(value / 100);
}

/** 处理创建连接 */
function handleCreateConnection(cardId: string, filePath: string) {
  emit('create-connection', cardId, filePath);
}

/** 处理删除连接 */
function handleDeleteConnection(cardId: string) {
  emit('delete-connection', cardId);
}

/** 处理选中连接 */
function handleSelectConnection(cardId: string | null) {
  selectedConnectionId.value = cardId;
}

/** 删除选中的连接 */
function deleteSelectedConnection() {
  if (selectedConnectionId.value) {
    handleDeleteConnection(selectedConnectionId.value);
    selectedConnectionId.value = null;
  }
}

/** 更新当前缩放显示 */
function updateZoomDisplay() {
  if (connectionGraphRef.value?.zoom) {
    currentZoom.value = Math.round(connectionGraphRef.value.zoom * 100);
  }
}
</script>

<template>
  <div class="graph-mode">
    <!-- 顶部工具栏 -->
    <div class="graph-mode__toolbar">
      <div class="toolbar-left">
        <!-- 添加文件按钮 -->
        <button
          class="toolbar-btn toolbar-btn--primary"
          @click="handleAddFiles"
          :title="t('manual.addFiles')"
        >
          <span class="btn-icon">📁</span>
          <span class="btn-text">{{ t('manual.addFiles') }}</span>
        </button>

        <!-- 分隔线 -->
        <div class="toolbar-divider"></div>

        <!-- 清空连线按钮 -->
        <button
          class="toolbar-btn toolbar-btn--danger"
          :disabled="!hasConnections"
          @click="handleClearConnections"
          :title="t('manual.clearBindings')"
        >
          <span class="btn-icon">🗑️</span>
          <span class="btn-text">清空连线</span>
        </button>

        <!-- 删除选中连接 -->
        <button
          class="toolbar-btn"
          :disabled="!selectedConnectionId"
          @click="deleteSelectedConnection"
          title="删除选中"
        >
          <span class="btn-icon">✂️</span>
          <span class="btn-text">删除选中</span>
        </button>

        <!-- 分隔线 -->
        <div class="toolbar-divider"></div>

        <!-- 自动排列按钮 -->
        <button
          class="toolbar-btn"
          @click="handleAutoArrange"
          title="自动排列"
        >
          <span class="btn-icon">📐</span>
          <span class="btn-text">自动排列</span>
        </button>
      </div>

      <div class="toolbar-center">
        <!-- 缩放控制 -->
        <div class="zoom-control">
          <button
            class="zoom-btn"
            @click="handleZoomOut"
            :disabled="currentZoom <= zoomPresets[0]"
            title="缩小"
          >
            −
          </button>
          
          <input
            type="range"
            class="zoom-slider"
            :min="zoomPresets[0]"
            :max="zoomPresets[zoomPresets.length - 1]"
            :value="currentZoom"
            @input="handleZoomChange"
          />
          
          <button
            class="zoom-btn"
            @click="handleZoomIn"
            :disabled="currentZoom >= zoomPresets[zoomPresets.length - 1]"
            title="放大"
          >
            +
          </button>
          
          <span class="zoom-value">{{ currentZoom }}%</span>
        </div>
      </div>

      <div class="toolbar-right">
        <!-- 适应视图 -->
        <button
          class="toolbar-btn toolbar-btn--secondary"
          @click="handleFitToView"
          title="适应视图"
        >
          <span class="btn-icon">⛶</span>
          <span class="btn-text">适应</span>
        </button>

        <!-- 重置视图 -->
        <button
          class="toolbar-btn toolbar-btn--secondary"
          @click="handleResetView"
          title="重置视图"
        >
          <span class="btn-icon">↺</span>
          <span class="btn-text">重置</span>
        </button>
      </div>
    </div>

    <!-- 图形画布 -->
    <div class="graph-mode__content">
      <ConnectionGraph
        ref="connectionGraphRef"
        :cards="cards"
        :files="files"
        :bindings="bindings"
        @update:bindings="handleBindingsUpdate"
        @create-connection="handleCreateConnection"
        @delete-connection="handleDeleteConnection"
        @select-connection="handleSelectConnection"
      />
    </div>

    <!-- 底部提示栏 -->
    <div class="graph-mode__footer">
      <div class="footer-left">
        <div class="hint-item">
          <span class="hint-icon">🔗</span>
          <span class="hint-text">{{ t('manual.connectHint') }}</span>
        </div>
      </div>

      <div class="footer-center">
        <div class="stats-item">
          <span class="stats-label">{{ t('binding.bound') }}:</span>
          <span class="stats-value stats-value--success">{{ stats.bound }}</span>
          <span class="stats-divider">/</span>
          <span class="stats-value">{{ stats.total }}</span>
        </div>
      </div>

      <div class="footer-right">
        <div class="hint-item hint-item--muted">
          <span class="hint-text">滚轮缩放 · 右键/中键拖拽平移 · Delete删除选中</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.graph-mode {
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

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-lg);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-secondary);
    border-top: 1px solid var(--color-border-light);
    font-size: var(--font-size-xs);
  }
}

// 工具栏样式
.toolbar-left,
.toolbar-center,
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

// 缩放控制
.zoom-control {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 4px 8px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
}

.zoom-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover:not(:disabled) {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.zoom-slider {
  width: 80px;
  height: 4px;
  appearance: none;
  background: var(--color-border);
  border-radius: var(--radius-full);
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    background: var(--color-primary);
    border-radius: var(--radius-full);
    cursor: grab;
    transition: transform var(--transition-fast);

    &:hover {
      transform: scale(1.2);
    }
  }
}

.zoom-value {
  min-width: 40px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

// 底部提示栏样式
.footer-left,
.footer-center,
.footer-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);

  &--muted {
    color: var(--color-text-tertiary);
  }
}

.hint-icon {
  font-size: 14px;
}

.hint-text {
  font-size: var(--font-size-xs);
}

.stats-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-secondary);
}

.stats-label {
  color: var(--color-text-tertiary);
}

.stats-value {
  font-weight: 500;
  font-variant-numeric: tabular-nums;

  &--success {
    color: var(--color-success);
  }
}

.stats-divider {
  color: var(--color-text-tertiary);
}
</style>
