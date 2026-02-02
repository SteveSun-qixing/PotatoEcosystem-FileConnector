<script setup lang="ts">
/**
 * 卡片节点组件
 * @description 图形界面中的卡片节点，支持点击、拖拽和连接
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CardInfo, CardType } from '@/types/card';

/** 位置类型 */
interface Position {
  x: number;
  y: number;
}

/** 节点状态 */
type NodeState = 'idle' | 'selected' | 'bound';

const props = withDefaults(
  defineProps<{
    /** 卡片信息 */
    card: CardInfo;
    /** 节点位置 */
    position: Position;
    /** 节点状态 */
    state: NodeState;
  }>(),
  {
    state: 'idle'
  }
);

const emit = defineEmits<{
  /** 鼠标按下事件（开始连接或拖拽） */
  mousedown: [cardId: string, event: MouseEvent];
  /** 鼠标进入事件 */
  mouseenter: [cardId: string];
  /** 鼠标离开事件 */
  mouseleave: [cardId: string];
  /** 拖拽结束事件 */
  dragend: [position: Position];
  /** 连接点点击事件 */
  'connector-click': [cardId: string, event: MouseEvent];
}>();

const { t } = useI18n();

/** 节点引用 */
const nodeRef = ref<SVGGElement | null>(null);

/** 是否正在拖拽 */
const isDragging = ref(false);

/** 拖拽起始位置 */
const dragStart = ref<Position>({ x: 0, y: 0 });

/** 当前拖拽位置 */
const dragOffset = ref<Position>({ x: 0, y: 0 });

/** 节点尺寸 */
const nodeWidth = 160;
const nodeHeight = 48;
const connectorRadius = 6;

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

/** 状态颜色配置 */
const stateColors = computed(() => {
  switch (props.state) {
    case 'selected':
      return {
        fill: 'var(--color-primary-bg)',
        stroke: 'var(--color-primary)',
        strokeWidth: 2
      };
    case 'bound':
      return {
        fill: 'var(--color-success-bg)',
        stroke: 'var(--color-success)',
        strokeWidth: 1.5
      };
    default:
      return {
        fill: 'var(--color-bg-primary)',
        stroke: 'var(--color-border)',
        strokeWidth: 1
      };
  }
});

/** 连接点颜色 */
const connectorColor = computed(() => {
  return props.state === 'bound' ? 'var(--color-success)' : 'var(--color-primary)';
});

/** 当前渲染位置（包含拖拽偏移） */
const renderPosition = computed(() => {
  if (isDragging.value) {
    return {
      x: props.position.x + dragOffset.value.x,
      y: props.position.y + dragOffset.value.y
    };
  }
  return props.position;
});

/** 连接点位置（节点右侧中心） */
const connectorPosition = computed(() => ({
  x: renderPosition.value.x + nodeWidth,
  y: renderPosition.value.y + nodeHeight / 2
}));

/** 处理节点鼠标按下 */
function handleMouseDown(event: MouseEvent) {
  // 阻止默认行为，避免触发文本选择
  event.preventDefault();
  
  // 如果点击的是连接点，不触发拖拽
  const target = event.target as SVGElement;
  if (target.classList.contains('connector-hit-area')) {
    return;
  }

  isDragging.value = true;
  dragStart.value = { x: event.clientX, y: event.clientY };
  dragOffset.value = { x: 0, y: 0 };

  // 添加全局鼠标事件监听
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  emit('mousedown', props.card.id, event);
}

/** 处理鼠标移动 */
function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value) return;

  dragOffset.value = {
    x: event.clientX - dragStart.value.x,
    y: event.clientY - dragStart.value.y
  };
}

/** 处理鼠标抬起 */
function handleMouseUp(_event: MouseEvent) {
  if (!isDragging.value) return;

  // 移除全局鼠标事件监听
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);

  // 只有拖拽了一定距离才触发位置更新
  const distance = Math.sqrt(
    dragOffset.value.x * dragOffset.value.x + dragOffset.value.y * dragOffset.value.y
  );

  if (distance > 5) {
    emit('dragend', {
      x: props.position.x + dragOffset.value.x,
      y: props.position.y + dragOffset.value.y
    });
  }

  isDragging.value = false;
  dragOffset.value = { x: 0, y: 0 };
}

/** 处理连接点点击 */
function handleConnectorClick(event: MouseEvent) {
  event.stopPropagation();
  emit('connector-click', props.card.id, event);
}

/** 处理鼠标进入 */
function handleMouseEnter() {
  emit('mouseenter', props.card.id);
}

/** 处理鼠标离开 */
function handleMouseLeave() {
  emit('mouseleave', props.card.id);
}

/** 处理键盘事件 */
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    emit('connector-click', props.card.id, event as unknown as MouseEvent);
  }
}

// 组件卸载时清理事件监听
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
});
</script>

<template>
  <g
    ref="nodeRef"
    class="card-node"
    :class="{
      'card-node--selected': state === 'selected',
      'card-node--bound': state === 'bound',
      'card-node--dragging': isDragging
    }"
    :transform="`translate(${renderPosition.x}, ${renderPosition.y})`"
    tabindex="0"
    role="button"
    :aria-label="card.name"
    @mousedown="handleMouseDown"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @keydown="handleKeyDown"
  >
    <!-- 节点背景 -->
    <rect
      class="card-node__bg"
      :width="nodeWidth"
      :height="nodeHeight"
      rx="8"
      ry="8"
      :fill="stateColors.fill"
      :stroke="stateColors.stroke"
      :stroke-width="stateColors.strokeWidth"
    />

    <!-- 卡片图标 -->
    <text
      class="card-node__icon"
      :x="12"
      :y="nodeHeight / 2 + 5"
      font-size="18"
    >
      {{ typeIcon }}
    </text>

    <!-- 卡片名称 -->
    <text
      class="card-node__name"
      :x="36"
      :y="nodeHeight / 2 - 4"
      font-size="13"
      font-weight="500"
      fill="var(--color-text-primary)"
    >
      <tspan>{{ card.name.length > 12 ? card.name.slice(0, 12) + '...' : card.name }}</tspan>
    </text>

    <!-- 卡片类型 -->
    <text
      class="card-node__type"
      :x="36"
      :y="nodeHeight / 2 + 12"
      font-size="11"
      fill="var(--color-text-tertiary)"
    >
      {{ t(`card.type.${card.type}`) }}
    </text>

    <!-- 连接点（右侧） -->
    <circle
      class="card-node__connector"
      :cx="nodeWidth"
      :cy="nodeHeight / 2"
      :r="connectorRadius"
      :fill="connectorColor"
      stroke="white"
      stroke-width="2"
    />

    <!-- 连接点点击区域（更大的透明区域） -->
    <circle
      class="connector-hit-area"
      :cx="nodeWidth"
      :cy="nodeHeight / 2"
      :r="connectorRadius + 6"
      fill="transparent"
      style="cursor: crosshair"
      @click="handleConnectorClick"
    />
  </g>
</template>

<style lang="scss" scoped>
.card-node {
  cursor: grab;
  user-select: none;
  outline: none;

  &:hover {
    .card-node__bg {
      filter: brightness(0.98);
    }

    .card-node__connector {
      transform-origin: center;
      animation: pulse 1s infinite;
    }
  }

  &:focus-visible {
    .card-node__bg {
      stroke: var(--color-primary);
      stroke-width: 2;
    }
  }

  &--selected {
    .card-node__bg {
      filter: drop-shadow(0 2px 8px rgba(24, 144, 255, 0.3));
    }
  }

  &--bound {
    .card-node__bg {
      filter: drop-shadow(0 2px 4px rgba(82, 196, 26, 0.2));
    }
  }

  &--dragging {
    cursor: grabbing;
    
    .card-node__bg {
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
    }
  }

  &__bg {
    transition: all var(--transition-fast);
  }

  &__icon {
    pointer-events: none;
  }

  &__name {
    pointer-events: none;
  }

  &__type {
    pointer-events: none;
  }

  &__connector {
    transition: all var(--transition-fast);
    cursor: crosshair;

    &:hover {
      r: 8;
    }
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}
</style>
