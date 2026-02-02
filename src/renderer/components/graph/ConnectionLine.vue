<script setup lang="ts">
/**
 * 连接线组件
 * @description 连接卡片和文件的贝塞尔曲线，支持选中和点击删除
 */
import { computed } from 'vue';

/** 位置类型 */
interface Position {
  x: number;
  y: number;
}

const props = withDefaults(
  defineProps<{
    /** 连接线唯一标识 */
    id: string;
    /** 起始位置（卡片连接点） */
    start: Position;
    /** 结束位置（文件连接点） */
    end: Position;
    /** 是否选中 */
    selected?: boolean;
    /** 自定义颜色 */
    color?: string;
    /** 是否显示箭头 */
    showArrow?: boolean;
    /** 是否为临时连线（拖拽中） */
    temporary?: boolean;
  }>(),
  {
    selected: false,
    color: '',
    showArrow: true,
    temporary: false
  }
);

const emit = defineEmits<{
  /** 点击事件 */
  click: [id: string, event: MouseEvent];
  /** 右键点击事件 */
  contextmenu: [id: string, event: MouseEvent];
}>();

/** 线条颜色 */
const lineColor = computed(() => {
  if (props.color) return props.color;
  if (props.selected) return 'var(--color-primary)';
  if (props.temporary) return 'var(--color-primary)';
  return 'var(--color-success)';
});

/** 线条宽度 */
const lineWidth = computed(() => {
  if (props.selected) return 3;
  if (props.temporary) return 2;
  return 2;
});

/** 线条透明度 */
const lineOpacity = computed(() => {
  if (props.temporary) return 0.6;
  return 1;
});

/** 计算贝塞尔曲线路径 */
const pathD = computed(() => {
  const { start, end } = props;
  
  // 计算水平距离
  const dx = end.x - start.x;
  
  // 控制点偏移量（根据距离动态调整）
  const offset = Math.min(Math.abs(dx) * 0.4, 100);
  
  // 控制点1：起点右侧
  const cp1x = start.x + offset;
  const cp1y = start.y;
  
  // 控制点2：终点左侧
  const cp2x = end.x - offset;
  const cp2y = end.y;
  
  return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
});

/** 箭头标记ID */
const arrowMarkerId = computed(() => `arrow-${props.id}`);

/** 箭头路径（指向文件端） */
const arrowPath = computed(() => {
  // 箭头在曲线末端
  const { end } = props;
  
  // 计算箭头方向（使用控制点计算切线方向）
  const dx = props.end.x - props.start.x;
  const offset = Math.min(Math.abs(dx) * 0.4, 100);
  const cp2x = end.x - offset;
  const cp2y = end.y;
  
  // 计算切线角度
  const angle = Math.atan2(end.y - cp2y, end.x - cp2x);
  
  // 箭头参数
  const arrowSize = 8;
  const arrowAngle = Math.PI / 6; // 30度
  
  // 箭头两个端点
  const p1x = end.x - arrowSize * Math.cos(angle - arrowAngle);
  const p1y = end.y - arrowSize * Math.sin(angle - arrowAngle);
  const p2x = end.x - arrowSize * Math.cos(angle + arrowAngle);
  const p2y = end.y - arrowSize * Math.sin(angle + arrowAngle);
  
  return `M ${p1x} ${p1y} L ${end.x} ${end.y} L ${p2x} ${p2y}`;
});

/** 处理点击 */
function handleClick(event: MouseEvent) {
  event.stopPropagation();
  emit('click', props.id, event);
}

/** 处理右键点击 */
function handleContextMenu(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  emit('contextmenu', props.id, event);
}
</script>

<template>
  <g
    class="connection-line"
    :class="{
      'connection-line--selected': selected,
      'connection-line--temporary': temporary
    }"
  >
    <!-- 隐藏的粗线条用于增加点击区域 -->
    <path
      class="connection-line__hit-area"
      :d="pathD"
      fill="none"
      stroke="transparent"
      stroke-width="12"
      style="cursor: pointer"
      @click="handleClick"
      @contextmenu="handleContextMenu"
    />
    
    <!-- 可见的连线 -->
    <path
      class="connection-line__path"
      :d="pathD"
      fill="none"
      :stroke="lineColor"
      :stroke-width="lineWidth"
      :opacity="lineOpacity"
      stroke-linecap="round"
    />

    <!-- 箭头 -->
    <path
      v-if="showArrow && !temporary"
      class="connection-line__arrow"
      :d="arrowPath"
      fill="none"
      :stroke="lineColor"
      :stroke-width="lineWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- 选中时的光晕效果 -->
    <path
      v-if="selected"
      class="connection-line__glow"
      :d="pathD"
      fill="none"
      :stroke="lineColor"
      stroke-width="8"
      opacity="0.2"
      stroke-linecap="round"
    />

    <!-- 临时连线的虚线动画 -->
    <path
      v-if="temporary"
      class="connection-line__dash"
      :d="pathD"
      fill="none"
      stroke="white"
      stroke-width="2"
      stroke-dasharray="4 4"
      opacity="0.5"
      stroke-linecap="round"
    />
  </g>
</template>

<style lang="scss" scoped>
.connection-line {
  pointer-events: none;

  &__hit-area {
    pointer-events: stroke;
  }

  &__path {
    transition: stroke var(--transition-fast), stroke-width var(--transition-fast);
    pointer-events: none;
  }

  &__arrow {
    pointer-events: none;
  }

  &__glow {
    pointer-events: none;
    animation: glow-pulse 1.5s ease-in-out infinite;
  }

  &__dash {
    pointer-events: none;
    animation: dash-flow 0.5s linear infinite;
  }

  &--selected {
    .connection-line__path {
      filter: drop-shadow(0 0 4px var(--color-primary));
    }
  }

  &--temporary {
    .connection-line__path {
      stroke-dasharray: 8 4;
      animation: dash-flow 0.3s linear infinite;
    }
  }
}

@keyframes glow-pulse {
  0%, 100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.4;
  }
}

@keyframes dash-flow {
  0% {
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dashoffset: -12;
  }
}
</style>
