<script setup lang="ts">
/**
 * 进度条组件
 * @description 展示执行进度的组件
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

/**
 * 进度条状态
 */
type ProgressStatus = 'running' | 'success' | 'error' | 'paused';

/**
 * 组件属性
 */
interface Props {
  /** 当前值 */
  current: number;
  /** 总数 */
  total: number;
  /** 状态 */
  status?: ProgressStatus;
  /** 是否显示百分比 */
  showPercentage?: boolean;
  /** 是否显示数量 */
  showCount?: boolean;
  /** 是否显示预计剩余时间 */
  showRemaining?: boolean;
  /** 预计剩余时间（毫秒） */
  estimatedRemaining?: number;
  /** 自定义标签 */
  label?: string;
  /** 高度（像素） */
  height?: number;
  /** 是否使用条纹动画 */
  striped?: boolean;
  /** 是否使用动画效果 */
  animated?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  status: 'running',
  showPercentage: true,
  showCount: true,
  showRemaining: false,
  height: 8,
  striped: true,
  animated: true
});

const { t } = useI18n();

/**
 * 计算百分比
 */
const percentage = computed(() => {
  if (props.total <= 0) return 0;
  return Math.min(100, Math.round((props.current / props.total) * 100));
});

/**
 * 进度条样式类
 */
const progressClass = computed(() => ({
  'progress-bar': true,
  [`progress-bar--${props.status}`]: true,
  'progress-bar--striped': props.striped && props.status === 'running',
  'progress-bar--animated': props.animated && props.status === 'running'
}));

/**
 * 进度条样式
 */
const progressStyle = computed(() => ({
  width: `${percentage.value}%`,
  height: `${props.height}px`
}));

/**
 * 轨道样式
 */
const trackStyle = computed(() => ({
  height: `${props.height}px`
}));

/**
 * 格式化剩余时间
 */
const formattedRemaining = computed(() => {
  if (!props.estimatedRemaining || props.estimatedRemaining <= 0) {
    return '';
  }

  const seconds = Math.ceil(props.estimatedRemaining / 1000);
  
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${minutes}分${remainingSeconds}秒` 
      : `${minutes}分钟`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}小时${remainingMinutes}分`;
});

/**
 * 状态图标
 */
const statusIcon = computed(() => {
  switch (props.status) {
    case 'success':
      return '✓';
    case 'error':
      return '✗';
    case 'paused':
      return '⏸';
    default:
      return '';
  }
});
</script>

<template>
  <div class="progress-container">
    <!-- 标签行 -->
    <div class="progress-header" v-if="label || showPercentage || showCount">
      <span class="progress-label" v-if="label">{{ label }}</span>
      <span class="progress-stats">
        <span v-if="showCount" class="progress-count">
          {{ current }}/{{ total }}
        </span>
        <span v-if="showPercentage" class="progress-percentage">
          {{ percentage }}%
        </span>
        <span v-if="statusIcon" class="progress-status-icon" :class="`status-${status}`">
          {{ statusIcon }}
        </span>
      </span>
    </div>
    
    <!-- 进度条轨道 -->
    <div class="progress-track" :style="trackStyle">
      <div :class="progressClass" :style="progressStyle">
        <span class="progress-text" v-if="height >= 16 && showPercentage">
          {{ percentage }}%
        </span>
      </div>
    </div>
    
    <!-- 剩余时间 -->
    <div class="progress-footer" v-if="showRemaining && formattedRemaining">
      <span class="progress-remaining">
        预计剩余: {{ formattedRemaining }}
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.progress-container {
  width: 100%;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
}

.progress-label {
  color: var(--color-text-primary);
  font-weight: 500;
}

.progress-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.progress-count {
  font-variant-numeric: tabular-nums;
}

.progress-percentage {
  font-weight: 500;
  min-width: 3em;
  text-align: right;
}

.progress-status-icon {
  font-weight: bold;
  
  &.status-success {
    color: var(--color-success);
  }
  
  &.status-error {
    color: var(--color-error);
  }
  
  &.status-paused {
    color: var(--color-warning);
  }
}

.progress-track {
  width: 100%;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-normal), background-color var(--transition-fast);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &--running {
    background-color: var(--color-primary);
  }
  
  &--success {
    background-color: var(--color-success);
  }
  
  &--error {
    background-color: var(--color-error);
  }
  
  &--paused {
    background-color: var(--color-warning);
  }
  
  &--striped {
    background-image: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.15) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.15) 75%,
      transparent 75%,
      transparent
    );
    background-size: 1rem 1rem;
  }
  
  &--animated {
    animation: progress-stripes 1s linear infinite;
  }
}

.progress-text {
  color: white;
  font-size: var(--font-size-xs);
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.progress-footer {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-align: right;
}

@keyframes progress-stripes {
  0% {
    background-position: 1rem 0;
  }
  100% {
    background-position: 0 0;
  }
}
</style>
