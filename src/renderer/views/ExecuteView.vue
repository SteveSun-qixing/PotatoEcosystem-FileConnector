<script setup lang="ts">
/**
 * 执行视图
 * @description 执行绑定的主视图
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useConnectorStore } from '@/stores/connector';
import { useBindingExecute } from '@/composables/useBindingExecute';
import ProgressBar from '@/components/common/ProgressBar.vue';
import { ResultReport } from '@/components/result';
import type { ExecuteResult, ExecutionError, ErrorAction } from '@/types/execute';

const router = useRouter();
const { t } = useI18n();
const connectorStore = useConnectorStore();

/**
 * 使用绑定执行组合式函数
 */
const {
  executing,
  progress,
  result,
  currentBinding,
  execute,
  cancel,
  retryFailed
} = useBindingExecute();

/**
 * 执行阶段
 */
type ExecutePhase = 'ready' | 'executing' | 'error' | 'complete';
const phase = ref<ExecutePhase>('ready');

/**
 * 当前错误
 */
const currentError = ref<ExecutionError | null>(null);

/**
 * 错误处理选择
 */
const errorAction = ref<ErrorAction>('skip');

/**
 * 是否显示错误对话框
 */
const showErrorDialog = ref(false);

/**
 * 进度条状态
 */
const progressStatus = computed(() => {
  if (currentError.value) return 'paused';
  if (result.value) {
    return result.value.failed > 0 ? 'error' : 'success';
  }
  return 'running';
});

/**
 * 当前绑定信息
 */
const currentBindingInfo = computed(() => {
  if (!currentBinding.value) return null;
  
  const binding = currentBinding.value;
  return {
    cardId: binding.cardId,
    fileName: getFileName(binding.filePath),
    filePath: binding.filePath
  };
});

/**
 * 获取文件名
 */
function getFileName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1];
}

/**
 * 开始执行
 */
async function startExecute(): Promise<void> {
  phase.value = 'executing';
  currentError.value = null;

  try {
    await execute(connectorStore.bindings, {
      concurrency: 3,
      errorStrategy: 'skip',
      maxRetries: 2,
      onProgress: (p) => {
        connectorStore.updateProgress(p);
      },
      onError: (error) => {
        // 显示错误对话框让用户选择
        currentError.value = error;
        showErrorDialog.value = true;
        return errorAction.value;
      }
    });

    phase.value = 'complete';
    
    if (result.value) {
      connectorStore.setResult(result.value);
    }
  } catch (error) {
    phase.value = 'error';
    console.error('执行失败', error);
  }
}

/**
 * 取消执行
 */
function handleCancel(): void {
  cancel();
  phase.value = 'ready';
}

/**
 * 处理错误选择
 */
function handleErrorAction(action: ErrorAction): void {
  errorAction.value = action;
  showErrorDialog.value = false;
  currentError.value = null;
}

/**
 * 重试失败项
 */
async function handleRetryFailed(): Promise<void> {
  phase.value = 'executing';
  await retryFailed();
  phase.value = 'complete';
}

/**
 * 完成
 */
function handleComplete(): void {
  connectorStore.reset();
  router.push('/');
}

/**
 * 返回预览
 */
function goBack(): void {
  router.push('/preview');
}

/**
 * 查看错误详情
 */
function viewErrorDetail(error: ExecutionError): void {
  // 可以打开一个详情模态框
  console.log('Error detail:', error);
}

/**
 * 组件挂载时自动开始执行
 */
onMounted(() => {
  if (connectorStore.bindings.length > 0) {
    startExecute();
  } else {
    // 没有绑定数据，返回
    router.push('/');
  }
});
</script>

<template>
  <div class="execute-view">
    <!-- 执行中状态 -->
    <template v-if="phase === 'executing'">
      <div class="execute-header">
        <h2>{{ t('binding.execute') }}</h2>
        <p class="execute-subtitle">正在执行绑定操作...</p>
      </div>

      <!-- 进度条 -->
      <div class="progress-section" v-if="progress">
        <ProgressBar
          :current="progress.current"
          :total="progress.total"
          :status="progressStatus"
          :show-percentage="true"
          :show-count="true"
          :show-remaining="true"
          :estimated-remaining="progress.estimatedRemaining"
          :height="12"
          label="执行进度"
        />
      </div>

      <!-- 当前执行项 -->
      <div class="current-item" v-if="currentBindingInfo">
        <div class="item-label">当前执行:</div>
        <div class="item-info">
          <span class="item-card">{{ currentBindingInfo.cardId }}</span>
          <span class="item-arrow">←</span>
          <span class="item-file">{{ currentBindingInfo.fileName }}</span>
        </div>
      </div>

      <!-- 实时统计 -->
      <div class="realtime-stats" v-if="progress">
        <div class="stat-item stat-success">
          <span class="stat-icon">✓</span>
          <span class="stat-value">{{ progress.completed }}</span>
          <span class="stat-label">成功</span>
        </div>
        <div class="stat-item stat-failed">
          <span class="stat-icon">✗</span>
          <span class="stat-value">{{ progress.failed }}</span>
          <span class="stat-label">失败</span>
        </div>
        <div class="stat-item stat-skipped">
          <span class="stat-icon">⊘</span>
          <span class="stat-value">{{ progress.skipped }}</span>
          <span class="stat-label">跳过</span>
        </div>
      </div>

      <!-- 取消按钮 -->
      <div class="execute-actions">
        <button class="btn btn-secondary" @click="handleCancel">
          {{ t('common.cancel') }}
        </button>
      </div>
    </template>

    <!-- 完成状态 -->
    <template v-else-if="phase === 'complete' && result">
      <ResultReport
        :result="result"
        :show-retry="true"
        :show-details="true"
        @retry-failed="handleRetryFailed"
        @complete="handleComplete"
        @view-detail="viewErrorDetail"
      />
    </template>

    <!-- 准备状态 -->
    <template v-else-if="phase === 'ready'">
      <div class="ready-state">
        <h2>准备执行</h2>
        <p>共 {{ connectorStore.bindings.length }} 个绑定待执行</p>
        <div class="ready-actions">
          <button class="btn btn-secondary" @click="goBack">
            {{ t('common.back') }}
          </button>
          <button class="btn btn-primary" @click="startExecute">
            开始执行
          </button>
        </div>
      </div>
    </template>

    <!-- 错误状态 -->
    <template v-else-if="phase === 'error'">
      <div class="error-state">
        <h2>执行出错</h2>
        <p>执行过程中发生了错误</p>
        <div class="error-actions">
          <button class="btn btn-secondary" @click="goBack">
            {{ t('common.back') }}
          </button>
          <button class="btn btn-primary" @click="startExecute">
            {{ t('common.retry') }}
          </button>
        </div>
      </div>
    </template>

    <!-- 错误处理对话框 -->
    <div v-if="showErrorDialog && currentError" class="modal-overlay">
      <div class="modal-dialog error-dialog">
        <h3>执行错误</h3>
        <div class="error-content">
          <p class="error-card">卡片: {{ currentError.binding.cardId }}</p>
          <p class="error-message">{{ currentError.message }}</p>
          <p class="error-file" v-if="currentError.binding.filePath">
            文件: {{ getFileName(currentError.binding.filePath) }}
          </p>
        </div>
        <p class="error-prompt">请选择处理方式:</p>
        <div class="error-options">
          <button 
            class="btn btn-option"
            :class="{ active: errorAction === 'skip' }"
            @click="handleErrorAction('skip')"
          >
            <span class="option-icon">⊘</span>
            <span class="option-text">
              <span class="option-title">跳过</span>
              <span class="option-desc">跳过此项继续执行</span>
            </span>
          </button>
          <button 
            class="btn btn-option"
            :class="{ active: errorAction === 'retry' }"
            @click="handleErrorAction('retry')"
            :disabled="!currentError.retryable"
          >
            <span class="option-icon">↻</span>
            <span class="option-text">
              <span class="option-title">重试</span>
              <span class="option-desc">重新尝试执行</span>
            </span>
          </button>
          <button 
            class="btn btn-option btn-abort"
            :class="{ active: errorAction === 'abort' }"
            @click="handleErrorAction('abort')"
          >
            <span class="option-icon">✗</span>
            <span class="option-text">
              <span class="option-title">中止</span>
              <span class="option-desc">停止所有执行</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.execute-view {
  height: 100%;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
}

.execute-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);

  h2 {
    margin: 0 0 var(--spacing-sm);
    font-size: var(--font-size-xl);
  }

  .execute-subtitle {
    margin: 0;
    color: var(--color-text-secondary);
  }
}

.progress-section {
  max-width: 600px;
  margin: 0 auto var(--spacing-xl);
  width: 100%;
}

.current-item {
  max-width: 600px;
  margin: 0 auto var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  text-align: center;

  .item-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-xs);
  }

  .item-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    font-size: var(--font-size-md);
  }

  .item-card {
    font-weight: 500;
    color: var(--color-primary);
  }

  .item-arrow {
    color: var(--color-text-tertiary);
  }

  .item-file {
    color: var(--color-text-primary);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.realtime-stats {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);

    .stat-icon {
      font-size: 24px;
      font-weight: bold;
    }

    .stat-value {
      font-size: var(--font-size-xl);
      font-weight: 600;
    }

    .stat-label {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    &.stat-success {
      .stat-icon, .stat-value {
        color: var(--color-success);
      }
    }

    &.stat-failed {
      .stat-icon, .stat-value {
        color: var(--color-error);
      }
    }

    &.stat-skipped {
      .stat-icon, .stat-value {
        color: var(--color-warning);
      }
    }
  }
}

.execute-actions,
.ready-actions,
.error-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: auto;
  padding-top: var(--spacing-lg);
}

.ready-state,
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;

  h2 {
    margin: 0 0 var(--spacing-md);
  }

  p {
    margin: 0 0 var(--spacing-lg);
    color: var(--color-text-secondary);
  }
}

.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-dialog {
  background: var(--color-bg-primary);
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
  min-width: 400px;
  max-width: 500px;

  h3 {
    margin: 0 0 var(--spacing-md);
    color: var(--color-error);
  }
}

.error-dialog {
  .error-content {
    padding: var(--spacing-md);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-md);

    p {
      margin: 0;
      
      &.error-card {
        font-weight: 500;
        margin-bottom: var(--spacing-xs);
      }

      &.error-message {
        color: var(--color-error);
        font-size: var(--font-size-sm);
      }

      &.error-file {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
        margin-top: var(--spacing-xs);
      }
    }
  }

  .error-prompt {
    margin: 0 0 var(--spacing-md);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .error-options {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .btn-option {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--color-bg-secondary);
    border: 2px solid transparent;
    border-radius: var(--radius-sm);
    text-align: left;
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--color-bg-tertiary);
    }

    &.active {
      border-color: var(--color-primary);
      background: var(--color-primary-bg);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &.btn-abort {
      &.active {
        border-color: var(--color-error);
        background: var(--color-error-bg);
      }
    }

    .option-icon {
      font-size: 24px;
      width: 40px;
      text-align: center;
    }

    .option-text {
      display: flex;
      flex-direction: column;
    }

    .option-title {
      font-weight: 500;
    }

    .option-desc {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }
  }
}
</style>
