<script setup lang="ts">
/**
 * 文件节点组件
 * @description 图形界面中的文件节点，支持点击、拖拽和连接
 */
import { ref, computed, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FileInfo, FileType } from '@/types/file';

/** 位置类型 */
interface Position {
  x: number;
  y: number;
}

/** 节点状态 */
type NodeState = 'idle' | 'selected' | 'used';

const props = withDefaults(
  defineProps<{
    /** 文件信息 */
    file: FileInfo;
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
  /** 鼠标按下事件 */
  mousedown: [filePath: string, event: MouseEvent];
  /** 鼠标进入事件 */
  mouseenter: [filePath: string];
  /** 鼠标离开事件 */
  mouseleave: [filePath: string];
  /** 鼠标抬起事件（结束连接） */
  mouseup: [filePath: string, event: MouseEvent];
  /** 拖拽结束事件 */
  dragend: [position: Position];
  /** 连接点点击事件 */
  'connector-click': [filePath: string, event: MouseEvent];
}>();

const { t } = useI18n();

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

/** 状态颜色配置 */
const stateColors = computed(() => {
  switch (props.state) {
    case 'selected':
      return {
        fill: 'var(--color-primary-bg)',
        stroke: 'var(--color-primary)',
        strokeWidth: 2
      };
    case 'used':
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
  return props.state === 'used' ? 'var(--color-success)' : 'var(--color-primary)';
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

/** 连接点位置（节点左侧中心） */
const connectorPosition = computed(() => ({
  x: renderPosition.value.x,
  y: renderPosition.value.y + nodeHeight / 2
}));

/** 格式化文件大小 */
const formattedSize = computed(() => {
  const bytes = props.file.size;
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
});

/** 显示的文件名（截断处理） */
const displayName = computed(() => {
  const name = props.file.name;
  if (name.length > 14) {
    // 保留扩展名
    const ext = name.split('.').pop() || '';
    const baseName = name.slice(0, name.length - ext.length - 1);
    const maxBaseLength = 10 - ext.length;
    if (maxBaseLength > 3) {
      return baseName.slice(0, maxBaseLength) + '...' + ext;
    }
    return name.slice(0, 11) + '...';
  }
  return name;
});

/** 处理节点鼠标按下 */
function handleMouseDown(event: MouseEvent) {
  event.preventDefault();
  
  const target = event.target as SVGElement;
  if (target.classList.contains('connector-hit-area')) {
    return;
  }

  isDragging.value = true;
  dragStart.value = { x: event.clientX, y: event.clientY };
  dragOffset.value = { x: 0, y: 0 };

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  emit('mousedown', props.file.path, event);
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
function handleMouseUp(event: MouseEvent) {
  if (!isDragging.value) return;

  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);

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

/** 处理节点鼠标抬起（用于结束连接） */
function handleNodeMouseUp(event: MouseEvent) {
  emit('mouseup', props.file.path, event);
}

/** 处理连接点点击 */
function handleConnectorClick(event: MouseEvent) {
  event.stopPropagation();
  emit('connector-click', props.file.path, event);
}

/** 处理鼠标进入 */
function handleMouseEnter() {
  emit('mouseenter', props.file.path);
}

/** 处理鼠标离开 */
function handleMouseLeave() {
  emit('mouseleave', props.file.path);
}

/** 处理键盘事件 */
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    emit('connector-click', props.file.path, event as unknown as MouseEvent);
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
});
</script>

<template>
  <g
    class="file-node"
    :class="{
      'file-node--selected': state === 'selected',
      'file-node--used': state === 'used',
      'file-node--dragging': isDragging
    }"
    :transform="`translate(${renderPosition.x}, ${renderPosition.y})`"
    tabindex="0"
    role="button"
    :aria-label="file.name"
    @mousedown="handleMouseDown"
    @mouseup="handleNodeMouseUp"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @keydown="handleKeyDown"
  >
    <!-- 节点背景 -->
    <rect
      class="file-node__bg"
      :width="nodeWidth"
      :height="nodeHeight"
      rx="8"
      ry="8"
      :fill="stateColors.fill"
      :stroke="stateColors.stroke"
      :stroke-width="stateColors.strokeWidth"
    />

    <!-- 连接点（左侧） -->
    <circle
      class="file-node__connector"
      :cx="0"
      :cy="nodeHeight / 2"
      :r="connectorRadius"
      :fill="connectorColor"
      stroke="white"
      stroke-width="2"
    />

    <!-- 连接点点击区域 -->
    <circle
      class="connector-hit-area"
      :cx="0"
      :cy="nodeHeight / 2"
      :r="connectorRadius + 6"
      fill="transparent"
      style="cursor: crosshair"
      @click="handleConnectorClick"
    />

    <!-- 文件图标 -->
    <text
      class="file-node__icon"
      :x="16"
      :y="nodeHeight / 2 + 5"
      font-size="18"
    >
      {{ typeIcon }}
    </text>

    <!-- 文件名称 -->
    <text
      class="file-node__name"
      :x="40"
      :y="nodeHeight / 2 - 4"
      font-size="13"
      font-weight="500"
      fill="var(--color-text-primary)"
    >
      <title>{{ file.name }}</title>
      {{ displayName }}
    </text>

    <!-- 文件大小 -->
    <text
      class="file-node__size"
      :x="40"
      :y="nodeHeight / 2 + 12"
      font-size="11"
      fill="var(--color-text-tertiary)"
    >
      {{ formattedSize }}
    </text>
  </g>
</template>

<style lang="scss" scoped>
.file-node {
  cursor: grab;
  user-select: none;
  outline: none;

  &:hover {
    .file-node__bg {
      filter: brightness(0.98);
    }

    .file-node__connector {
      transform-origin: center;
      animation: pulse 1s infinite;
    }
  }

  &:focus-visible {
    .file-node__bg {
      stroke: var(--color-primary);
      stroke-width: 2;
    }
  }

  &--selected {
    .file-node__bg {
      filter: drop-shadow(0 2px 8px rgba(24, 144, 255, 0.3));
    }
  }

  &--used {
    .file-node__bg {
      filter: drop-shadow(0 2px 4px rgba(82, 196, 26, 0.2));
    }
  }

  &--dragging {
    cursor: grabbing;
    
    .file-node__bg {
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

  &__size {
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
