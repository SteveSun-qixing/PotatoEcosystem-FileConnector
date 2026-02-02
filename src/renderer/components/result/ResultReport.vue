<script setup lang="ts">
/**
 * 结果报告组件
 * @description 展示执行结果的报告
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ExecuteResult, ExecutionError } from '@/types/execute';

/**
 * 组件属性
 */
interface Props {
  /** 执行结果 */
  result: ExecuteResult;
  /** 是否显示重试按钮 */
  showRetry?: boolean;
  /** 是否显示详情 */
  showDetails?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showRetry: true,
  showDetails: true
});

/**
 * 事件
 */
const emit = defineEmits<{
  (e: 'retry'): void;
  (e: 'retry-failed'): void;
  (e: 'complete'): void;
  (e: 'view-detail', error: ExecutionError): void;
}>();

const { t } = useI18n();

/**
 * 是否全部成功
 */
const isAllSuccess = computed(() => {
  return props.result.failed === 0 && props.result.skipped === 0;
});

/**
 * 是否有失败
 */
const hasFailed = computed(() => {
  return props.result.failed > 0;
});

/**
 * 格式化耗时
 */
const formattedDuration = computed(() => {
  const ms = props.result.duration;
  
  if (ms < 1000) {
    return `${ms}毫秒`;
  }
  
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}秒`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(0);
  return `${minutes}分${remainingSeconds}秒`;
});

/**
 * 总数
 */
const total = computed(() => {
  return props.result.success + props.result.failed + props.result.skipped;
});

/**
 * 成功率
 */
const successRate = computed(() => {
  if (total.value === 0) return 0;
  return Math.round((props.result.success / total.value) * 100);
});

/**
 * 获取文件名
 */
function getFileName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1];
}

/**
 * 重试失败项
 */
function retryFailed(): void {
  emit('retry-failed');
}

/**
 * 完成
 */
function complete(): void {
  emit('complete');
}

/**
 * 查看错误详情
 */
function viewDetail(error: ExecutionError): void {
  emit('view-detail', error);
}
</script>

<template>
  <div class="result-report">
    <!-- 结果摘要 -->
    <div class="result-summary" :class="{ 'all-success': isAllSuccess, 'has-failed': hasFailed }">
      <div class="summary-icon">
        <template v-if="isAllSuccess">✓</template>
        <template v-else-if="hasFailed">!</template>
        <template v-else>⊘</template>
      </div>
      
      <h3 class="summary-title">
        <template v-if="isAllSuccess">执行完成</template>
        <template v-else-if="hasFailed">执行完成（有失败）</template>
        <template v-else>执行完成（有跳过）</template>
      </h3>
      
      <p class="summary-duration">总耗时: {{ formattedDuration }}</p>
    </div>

    <!-- 统计数据 -->
    <div class="statistics">
      <div class="stat-card stat-success">
        <div class="stat-icon">✓</div>
        <div class="stat-info">
          <div class="stat-value">{{ result.success }}</div>
          <div class="stat-label">{{ t('common.success') }}</div>
        </div>
      </div>
      
      <div class="stat-card stat-failed">
        <div class="stat-icon">✗</div>
        <div class="stat-info">
          <div class="stat-value">{{ result.failed }}</div>
          <div class="stat-label">{{ t('common.failed') }}</div>
        </div>
      </div>
      
      <div class="stat-card stat-skipped">
        <div class="stat-icon">⊘</div>
        <div class="stat-info">
          <div class="stat-value">{{ result.skipped }}</div>
          <div class="stat-label">{{ t('common.skip') }}</div>
        </div>
      </div>
      
      <div class="stat-card stat-rate">
        <div class="stat-info">
          <div class="stat-value">{{ successRate }}%</div>
          <div class="stat-label">成功率</div>
        </div>
      </div>
    </div>

    <!-- 失败详情 -->
    <div v-if="showDetails && result.errors.length > 0" class="error-section">
      <h4 class="section-title">
        失败详情
        <span class="error-count">({{ result.errors.length }})</span>
      </h4>
      
      <div class="error-list">
        <div 
          v-for="(error, index) in result.errors" 
          :key="index" 
          class="error-item"
        >
          <div class="error-info">
            <div class="error-card">
              {{ error.binding.cardId }}
            </div>
            <div class="error-message">
              {{ error.message }}
            </div>
            <div class="error-file" v-if="error.binding.filePath">
              {{ getFileName(error.binding.filePath) }}
            </div>
          </div>
          <div class="error-actions">
            <button 
              class="btn-retry-single" 
              @click="viewDetail(error)"
              :title="error.retryable ? '可重试' : '不可重试'"
            >
              {{ error.retryable ? '重试' : '详情' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <button 
        v-if="showRetry && hasFailed"
        class="btn btn-secondary"
        @click="retryFailed"
      >
        {{ t('common.retry') }}失败项
      </button>
      <button 
        class="btn btn-primary"
        @click="complete"
      >
        {{ t('common.finish') }}
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.result-report {
  padding: var(--spacing-lg);
}

.result-summary {
  text-align: center;
  padding: var(--spacing-xl);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-lg);

  &.all-success {
    background: var(--color-success-bg);

    .summary-icon {
      color: var(--color-success);
      background: rgba(82, 196, 26, 0.2);
    }
  }

  &.has-failed {
    background: var(--color-error-bg);

    .summary-icon {
      color: var(--color-error);
      background: rgba(255, 77, 79, 0.2);
    }
  }

  &:not(.all-success):not(.has-failed) {
    background: var(--color-warning-bg);

    .summary-icon {
      color: var(--color-warning);
      background: rgba(250, 173, 20, 0.2);
    }
  }
}

.summary-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-md);
  font-size: 32px;
  font-weight: bold;
}

.summary-title {
  margin: 0 0 var(--spacing-sm);
  font-size: var(--font-size-lg);
}

.summary-duration {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.statistics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);

  .stat-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
  }

  .stat-value {
    font-size: var(--font-size-xl);
    font-weight: 600;
    line-height: 1.2;
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  &.stat-success {
    .stat-icon {
      background: var(--color-success-bg);
      color: var(--color-success);
    }
    .stat-value {
      color: var(--color-success);
    }
  }

  &.stat-failed {
    .stat-icon {
      background: var(--color-error-bg);
      color: var(--color-error);
    }
    .stat-value {
      color: var(--color-error);
    }
  }

  &.stat-skipped {
    .stat-icon {
      background: var(--color-warning-bg);
      color: var(--color-warning);
    }
    .stat-value {
      color: var(--color-warning);
    }
  }

  &.stat-rate {
    justify-content: center;
    
    .stat-value {
      color: var(--color-primary);
    }
  }
}

.error-section {
  margin-bottom: var(--spacing-lg);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin: 0 0 var(--spacing-md);
  font-size: var(--font-size-md);
  font-weight: 600;

  .error-count {
    font-size: var(--font-size-sm);
    color: var(--color-error);
    font-weight: normal;
  }
}

.error-list {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.error-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border-light);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--color-bg-hover);
  }
}

.error-info {
  flex: 1;
  min-width: 0;
}

.error-card {
  font-weight: 500;
  margin-bottom: 2px;
}

.error-message {
  font-size: var(--font-size-sm);
  color: var(--color-error);
}

.error-file {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.error-actions {
  flex-shrink: 0;
  margin-left: var(--spacing-md);
}

.btn-retry-single {
  padding: 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: var(--spacing-sm) var(--spacing-xl);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);

  &.btn-primary {
    background: var(--color-primary);
    color: white;

    &:hover {
      background: var(--color-primary-hover);
    }
  }

  &.btn-secondary {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);

    &:hover {
      background: var(--color-bg-active);
    }
  }
}
</style>
