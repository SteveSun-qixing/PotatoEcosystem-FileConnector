<script setup lang="ts">
/**
 * 图形连接主容器组件
 * @description SVG画布，整合CardNode、FileNode、ConnectionLine，支持缩放平移和连接创建
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';
import type { BindingItem } from '@/types/binding';
import CardNode from './CardNode.vue';
import FileNode from './FileNode.vue';
import ConnectionLine from './ConnectionLine.vue';

/** 位置类型 */
interface Position {
  x: number;
  y: number;
}

/** 节点位置映射 */
type PositionMap = Record<string, Position>;

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
  /** 创建连接 */
  'create-connection': [cardId: string, filePath: string];
  /** 删除连接 */
  'delete-connection': [cardId: string];
  /** 选中连接 */
  'select-connection': [cardId: string | null];
}>();

const { t } = useI18n();

// ============ 容器和画布状态 ============

/** 容器引用 */
const containerRef = ref<HTMLElement | null>(null);

/** SVG引用 */
const svgRef = ref<SVGSVGElement | null>(null);

/** 容器尺寸 */
const containerSize = ref({ width: 800, height: 600 });

/** 缩放比例 */
const zoom = ref(1);

/** 画布偏移 */
const panOffset = ref<Position>({ x: 0, y: 0 });

/** 是否正在平移 */
const isPanning = ref(false);

/** 平移起始点 */
const panStart = ref<Position>({ x: 0, y: 0 });

// ============ 节点位置状态 ============

/** 卡片节点位置 */
const cardPositions = ref<PositionMap>({});

/** 文件节点位置 */
const filePositions = ref<PositionMap>({});

// ============ 连接状态 ============

/** 选中的卡片ID（用于创建连接） */
const selectedCardId = ref<string | null>(null);

/** 选中的连接线ID */
const selectedConnectionId = ref<string | null>(null);

/** 悬停的卡片ID */
const hoveredCardId = ref<string | null>(null);

/** 悬停的文件路径 */
const hoveredFilePath = ref<string | null>(null);

/** 是否正在创建连接 */
const isConnecting = ref(false);

/** 临时连线终点（鼠标位置） */
const tempLineEnd = ref<Position>({ x: 0, y: 0 });

// ============ 布局参数 ============

const nodeWidth = 160;
const nodeHeight = 48;
const nodeSpacingY = 16;
const columnGap = 200;
const paddingX = 40;
const paddingY = 40;

// ============ 计算属性 ============

/** 已绑定的卡片ID集合 */
const boundCardIds = computed(() => {
  return new Set(props.bindings.filter(b => b.filePath).map(b => b.cardId));
});

/** 已使用的文件路径集合 */
const usedFilePaths = computed(() => {
  return new Set(props.bindings.filter(b => b.filePath).map(b => b.filePath));
});

/** 绑定映射（cardId -> filePath） */
const bindingMap = computed(() => {
  const map = new Map<string, string>();
  for (const binding of props.bindings) {
    if (binding.filePath) {
      map.set(binding.cardId, binding.filePath);
    }
  }
  return map;
});

/** 获取卡片节点状态 */
function getCardState(cardId: string): 'idle' | 'selected' | 'bound' {
  if (selectedCardId.value === cardId) return 'selected';
  if (boundCardIds.value.has(cardId)) return 'bound';
  return 'idle';
}

/** 获取文件节点状态 */
function getFileState(filePath: string): 'idle' | 'selected' | 'used' {
  if (hoveredFilePath.value === filePath && isConnecting.value) return 'selected';
  if (usedFilePaths.value.has(filePath)) return 'used';
  return 'idle';
}

/** 连接线数据 */
const connections = computed(() => {
  const result: Array<{
    id: string;
    cardId: string;
    filePath: string;
    start: Position;
    end: Position;
  }> = [];

  for (const binding of props.bindings) {
    if (!binding.filePath) continue;

    const cardPos = cardPositions.value[binding.cardId];
    const filePos = filePositions.value[binding.filePath];

    if (cardPos && filePos) {
      result.push({
        id: binding.cardId,
        cardId: binding.cardId,
        filePath: binding.filePath,
        start: {
          x: cardPos.x + nodeWidth,
          y: cardPos.y + nodeHeight / 2
        },
        end: {
          x: filePos.x,
          y: filePos.y + nodeHeight / 2
        }
      });
    }
  }

  return result;
});

/** 临时连线（拖拽创建连接时显示） */
const tempConnection = computed(() => {
  if (!isConnecting.value || !selectedCardId.value) return null;

  const cardPos = cardPositions.value[selectedCardId.value];
  if (!cardPos) return null;

  return {
    start: {
      x: cardPos.x + nodeWidth,
      y: cardPos.y + nodeHeight / 2
    },
    end: tempLineEnd.value
  };
});

/** SVG viewBox */
const viewBox = computed(() => {
  const x = -panOffset.value.x / zoom.value;
  const y = -panOffset.value.y / zoom.value;
  const w = containerSize.value.width / zoom.value;
  const h = containerSize.value.height / zoom.value;
  return `${x} ${y} ${w} ${h}`;
});

// ============ 自动布局 ============

/** 执行自动布局 */
function autoLayout() {
  const cards = props.cards;
  const files = props.files;

  // 计算卡片区域宽度
  const cardAreaWidth = nodeWidth + paddingX;
  
  // 计算卡片位置（左侧列）
  const newCardPositions: PositionMap = {};
  cards.forEach((card, index) => {
    newCardPositions[card.id] = {
      x: paddingX,
      y: paddingY + index * (nodeHeight + nodeSpacingY)
    };
  });

  // 计算文件位置（右侧列）
  const newFilePositions: PositionMap = {};
  const fileStartX = paddingX + nodeWidth + columnGap;
  files.forEach((file, index) => {
    newFilePositions[file.path] = {
      x: fileStartX,
      y: paddingY + index * (nodeHeight + nodeSpacingY)
    };
  });

  cardPositions.value = newCardPositions;
  filePositions.value = newFilePositions;

  // 重置视图到初始位置
  resetView();
}

/** 重置视图（缩放和平移） */
function resetView() {
  zoom.value = 1;
  panOffset.value = { x: 0, y: 0 };
}

/** 缩放到适合视图 */
function fitToView() {
  if (!containerRef.value) return;

  const allPositions = [
    ...Object.values(cardPositions.value),
    ...Object.values(filePositions.value)
  ];

  if (allPositions.length === 0) return;

  // 计算边界
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const pos of allPositions) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + nodeWidth);
    maxY = Math.max(maxY, pos.y + nodeHeight);
  }

  // 添加边距
  minX -= paddingX;
  minY -= paddingY;
  maxX += paddingX;
  maxY += paddingY;

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  // 计算缩放比例
  const scaleX = containerSize.value.width / contentWidth;
  const scaleY = containerSize.value.height / contentHeight;
  const newZoom = Math.min(scaleX, scaleY, 1.5);

  zoom.value = Math.max(0.3, Math.min(newZoom, 2));
  
  // 居中
  panOffset.value = {
    x: (containerSize.value.width - contentWidth * zoom.value) / 2 - minX * zoom.value,
    y: (containerSize.value.height - contentHeight * zoom.value) / 2 - minY * zoom.value
  };
}

// ============ 缩放和平移处理 ============

/** 处理滚轮缩放 */
function handleWheel(event: WheelEvent) {
  event.preventDefault();

  const rect = containerRef.value?.getBoundingClientRect();
  if (!rect) return;

  // 鼠标在容器内的位置
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  // 缩放因子
  const delta = event.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.3, Math.min(zoom.value * delta, 3));

  // 保持鼠标位置不变的缩放
  const zoomRatio = newZoom / zoom.value;
  panOffset.value = {
    x: mouseX - (mouseX - panOffset.value.x) * zoomRatio,
    y: mouseY - (mouseY - panOffset.value.y) * zoomRatio
  };

  zoom.value = newZoom;
}

/** 设置缩放（供外部调用） */
function setZoom(newZoom: number) {
  const centerX = containerSize.value.width / 2;
  const centerY = containerSize.value.height / 2;

  const zoomRatio = newZoom / zoom.value;
  panOffset.value = {
    x: centerX - (centerX - panOffset.value.x) * zoomRatio,
    y: centerY - (centerY - panOffset.value.y) * zoomRatio
  };

  zoom.value = newZoom;
}

/** 处理画布鼠标按下（开始平移） */
function handleCanvasMouseDown(event: MouseEvent) {
  // 右键或中键开始平移
  if (event.button === 1 || event.button === 2) {
    event.preventDefault();
    isPanning.value = true;
    panStart.value = { x: event.clientX, y: event.clientY };
  }
}

/** 处理鼠标移动 */
function handleMouseMove(event: MouseEvent) {
  // 平移
  if (isPanning.value) {
    panOffset.value = {
      x: panOffset.value.x + event.clientX - panStart.value.x,
      y: panOffset.value.y + event.clientY - panStart.value.y
    };
    panStart.value = { x: event.clientX, y: event.clientY };
    return;
  }

  // 创建连接时更新临时连线
  if (isConnecting.value && svgRef.value) {
    const rect = svgRef.value.getBoundingClientRect();
    const x = (event.clientX - rect.left - panOffset.value.x) / zoom.value;
    const y = (event.clientY - rect.top - panOffset.value.y) / zoom.value;
    tempLineEnd.value = { x, y };
  }
}

/** 处理鼠标抬起 */
function handleMouseUp(_event: MouseEvent) {
  isPanning.value = false;
  
  // 如果正在连接但没有选中文件，取消连接
  if (isConnecting.value && !hoveredFilePath.value) {
    cancelConnection();
  }
}

/** 处理右键菜单 */
function handleContextMenu(event: MouseEvent) {
  event.preventDefault();
}

// ============ 连接操作 ============

/** 开始创建连接（从卡片） */
function startConnection(cardId: string, event: MouseEvent) {
  // 如果卡片已绑定，不允许再次连接
  if (boundCardIds.value.has(cardId)) return;

  selectedCardId.value = cardId;
  isConnecting.value = true;

  // 初始化临时连线终点
  if (svgRef.value) {
    const rect = svgRef.value.getBoundingClientRect();
    const x = (event.clientX - rect.left - panOffset.value.x) / zoom.value;
    const y = (event.clientY - rect.top - panOffset.value.y) / zoom.value;
    tempLineEnd.value = { x, y };
  }
}

/** 结束连接（在文件上释放） */
function endConnection(filePath: string, _event: MouseEvent) {
  if (!isConnecting.value || !selectedCardId.value) return;

  // 如果文件已被使用，不允许连接
  if (usedFilePaths.value.has(filePath)) {
    cancelConnection();
    return;
  }

  // 创建新绑定
  emit('create-connection', selectedCardId.value, filePath);

  // 更新绑定列表
  const newBindings = [...props.bindings];
  const existingIndex = newBindings.findIndex(b => b.cardId === selectedCardId.value);
  
  if (existingIndex !== -1) {
    newBindings[existingIndex] = {
      ...newBindings[existingIndex],
      filePath
    };
  } else {
    newBindings.push({
      cardId: selectedCardId.value,
      resourceField: 'primary_resource',
      filePath
    });
  }

  emit('update:bindings', newBindings);

  // 重置状态
  cancelConnection();
}

/** 取消连接 */
function cancelConnection() {
  selectedCardId.value = null;
  isConnecting.value = false;
  tempLineEnd.value = { x: 0, y: 0 };
}

/** 选中连接线 */
function selectConnection(cardId: string, _event: MouseEvent) {
  if (selectedConnectionId.value === cardId) {
    selectedConnectionId.value = null;
  } else {
    selectedConnectionId.value = cardId;
  }
  emit('select-connection', selectedConnectionId.value);
}

/** 删除连接 */
function deleteConnection(cardId: string) {
  const newBindings = props.bindings.map(b => {
    if (b.cardId === cardId) {
      return { ...b, filePath: '' };
    }
    return b;
  });

  emit('update:bindings', newBindings);
  emit('delete-connection', cardId);

  if (selectedConnectionId.value === cardId) {
    selectedConnectionId.value = null;
    emit('select-connection', null);
  }
}

/** 处理连接线右键菜单 */
function handleConnectionContextMenu(cardId: string, _event: MouseEvent) {
  deleteConnection(cardId);
}

/** 清空所有连接 */
function clearAllConnections() {
  const newBindings = props.bindings.map(b => ({ ...b, filePath: '' }));
  emit('update:bindings', newBindings);
  selectedConnectionId.value = null;
  emit('select-connection', null);
}

// ============ 节点位置更新 ============

/** 更新卡片节点位置 */
function updateCardPosition(cardId: string, position: Position) {
  cardPositions.value = {
    ...cardPositions.value,
    [cardId]: position
  };
}

/** 更新文件节点位置 */
function updateFilePosition(filePath: string, position: Position) {
  filePositions.value = {
    ...filePositions.value,
    [filePath]: position
  };
}

// ============ 键盘事件 ============

/** 处理键盘事件 */
function handleKeyDown(event: KeyboardEvent) {
  // Delete键删除选中的连接
  if (event.key === 'Delete' && selectedConnectionId.value) {
    deleteConnection(selectedConnectionId.value);
  }
  
  // Escape键取消连接
  if (event.key === 'Escape') {
    if (isConnecting.value) {
      cancelConnection();
    } else if (selectedConnectionId.value) {
      selectedConnectionId.value = null;
      emit('select-connection', null);
    }
  }
}

// ============ 生命周期 ============

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  // 监听容器大小变化
  if (containerRef.value) {
    containerSize.value = {
      width: containerRef.value.clientWidth,
      height: containerRef.value.clientHeight
    };

    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        containerSize.value = {
          width: entry.contentRect.width,
          height: entry.contentRect.height
        };
      }
    });
    resizeObserver.observe(containerRef.value);
  }

  // 初始化布局
  nextTick(() => {
    autoLayout();
  });

  // 添加全局键盘事件
  window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  window.removeEventListener('keydown', handleKeyDown);
});

// 监听数据变化，重新布局
watch(
  [() => props.cards.length, () => props.files.length],
  () => {
    nextTick(() => {
      autoLayout();
    });
  }
);

// 暴露方法供父组件调用
defineExpose({
  autoLayout,
  resetView,
  fitToView,
  setZoom,
  clearAllConnections,
  zoom
});
</script>

<template>
  <div
    ref="containerRef"
    class="connection-graph"
    tabindex="0"
    @wheel="handleWheel"
    @mousedown="handleCanvasMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @contextmenu="handleContextMenu"
  >
    <!-- SVG画布 -->
    <svg
      ref="svgRef"
      class="connection-graph__canvas"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
    >
      <!-- 网格背景 -->
      <defs>
        <pattern
          id="grid-pattern"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r="1" fill="var(--color-border-light)" />
        </pattern>
      </defs>
      <rect
        x="-10000"
        y="-10000"
        width="20000"
        height="20000"
        fill="url(#grid-pattern)"
        opacity="0.5"
      />

      <!-- 连接线层 -->
      <g class="connection-graph__connections">
        <ConnectionLine
          v-for="conn in connections"
          :key="conn.id"
          :id="conn.id"
          :start="conn.start"
          :end="conn.end"
          :selected="selectedConnectionId === conn.id"
          @click="selectConnection(conn.cardId, $event)"
          @contextmenu="handleConnectionContextMenu(conn.cardId, $event)"
        />

        <!-- 临时连线 -->
        <ConnectionLine
          v-if="tempConnection"
          id="temp-connection"
          :start="tempConnection.start"
          :end="tempConnection.end"
          :temporary="true"
          :show-arrow="false"
        />
      </g>

      <!-- 卡片节点层 -->
      <g class="connection-graph__cards">
        <CardNode
          v-for="card in cards"
          :key="card.id"
          :card="card"
          :position="cardPositions[card.id] || { x: 0, y: 0 }"
          :state="getCardState(card.id)"
          @mouseenter="hoveredCardId = card.id"
          @mouseleave="hoveredCardId = null"
          @connector-click="startConnection(card.id, $event)"
          @dragend="updateCardPosition(card.id, $event)"
        />
      </g>

      <!-- 文件节点层 -->
      <g class="connection-graph__files">
        <FileNode
          v-for="file in files"
          :key="file.path"
          :file="file"
          :position="filePositions[file.path] || { x: 0, y: 0 }"
          :state="getFileState(file.path)"
          @mouseenter="hoveredFilePath = file.path"
          @mouseleave="hoveredFilePath = null"
          @mouseup="endConnection(file.path, $event)"
          @dragend="updateFilePosition(file.path, $event)"
        />
      </g>
    </svg>

    <!-- 空状态提示 -->
    <div v-if="cards.length === 0 && files.length === 0" class="connection-graph__empty">
      <div class="empty-icon">🔗</div>
      <div class="empty-text">{{ t('manual.connectHint') }}</div>
    </div>

    <!-- 缩放指示器 -->
    <div class="connection-graph__zoom-indicator">
      {{ Math.round(zoom * 100) }}%
    </div>
  </div>
</template>

<style lang="scss" scoped>
.connection-graph {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;

  &:focus-visible {
    border-color: var(--color-primary);
  }

  &__canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  &__connections {
    // 确保连接线在节点下方
  }

  &__cards {
    // 卡片层
  }

  &__files {
    // 文件层
  }

  &__empty {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: var(--color-text-tertiary);
    pointer-events: none;

    .empty-icon {
      font-size: 48px;
      margin-bottom: var(--spacing-md);
    }

    .empty-text {
      font-size: var(--font-size-sm);
    }
  }

  &__zoom-indicator {
    position: absolute;
    bottom: var(--spacing-sm);
    right: var(--spacing-sm);
    padding: 4px 8px;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-sm);
    pointer-events: none;
    opacity: 0.8;
  }
}
</style>
