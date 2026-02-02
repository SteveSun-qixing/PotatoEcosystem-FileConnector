<script setup lang="ts">
/**
 * 转换视图
 * @description 资源模式转换的主视图
 */
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCardsStore } from '@/stores/cards';
import { useModeConvert } from '@/composables/useModeConvert';
import ProgressBar from '@/components/common/ProgressBar.vue';
import { ResultReport } from '@/components/result';
import type { CardInfo, ResourceMode } from '@/types/card';

const { t } = useI18n();
const cardsStore = useCardsStore();

/**
 * 使用模式转换组合式函数
 */
const {
  converting,
  progress,
  result,
  requiredSpace,
  availableSpace,
  currentMode,
  externalResources,
  internalResources,
  hasEnoughSpace,
  detectMode,
  loadCardResources,
  checkSpace,
  toFull,
  toEmpty,
  cancel,
  reset
} = useModeConvert();

/**
 * 转换阶段
 */
type ConvertPhase = 'select' | 'info' | 'converting' | 'complete';
const phase = ref<ConvertPhase>('select');

/**
 * 目标模式
 */
const targetMode = ref<'full' | 'empty'>('full');

/**
 * 选中的卡片ID列表
 */
const selectedCardIds = ref<string[]>([]);

/**
 * 目标路径（空壳模式使用）
 */
const targetPath = ref('');

/**
 * 搜索关键词
 */
const searchKeyword = ref('');

/**
 * 过滤后的卡片列表
 */
const filteredCards = computed(() => {
  let cards = cardsStore.cards;
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    cards = cards.filter(card => card.name.toLowerCase().includes(keyword));
  }
  
  return cards;
});

/**
 * 选中的卡片列表
 */
const selectedCards = computed(() => {
  return cardsStore.cards.filter(card => selectedCardIds.value.includes(card.id));
});

/**
 * 是否全选
 */
const isAllSelected = computed(() => {
  return filteredCards.value.length > 0 && 
    filteredCards.value.every(card => selectedCardIds.value.includes(card.id));
});

/**
 * 格式化文件大小
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * 获取模式文本
 */
function getModeText(mode: ResourceMode): string {
  switch (mode) {
    case 'full':
      return '全填充';
    case 'empty':
      return '空壳';
    case 'semi':
      return '半填充';
    default:
      return '未知';
  }
}

/**
 * 切换卡片选择
 */
function toggleCard(cardId: string): void {
  const index = selectedCardIds.value.indexOf(cardId);
  if (index >= 0) {
    selectedCardIds.value.splice(index, 1);
  } else {
    selectedCardIds.value.push(cardId);
  }
}

/**
 * 全选/取消全选
 */
function toggleSelectAll(): void {
  if (isAllSelected.value) {
    selectedCardIds.value = [];
  } else {
    selectedCardIds.value = filteredCards.value.map(card => card.id);
  }
}

/**
 * 下一步：显示转换信息
 */
async function nextStep(): Promise<void> {
  if (selectedCardIds.value.length === 0) {
    return;
  }

  // 检查空间
  const path = targetMode.value === 'empty' ? targetPath.value : '/';
  await checkSpace(selectedCardIds.value, path);

  // 加载第一个卡片的资源信息作为示例
  if (selectedCardIds.value.length > 0) {
    await loadCardResources(selectedCardIds.value[0]);
  }

  phase.value = 'info';
}

/**
 * 返回选择
 */
function goBack(): void {
  phase.value = 'select';
}

/**
 * 选择目标路径
 */
async function selectTargetPath(): Promise<void> {
  // 实际实现中应该调用文件选择对话框
  // const result = await window.api.showOpenDialog({ properties: ['openDirectory'] });
  // if (!result.canceled && result.filePaths.length > 0) {
  //   targetPath.value = result.filePaths[0];
  // }
  
  // 模拟选择
  targetPath.value = '/Users/user/Documents/CardResources';
}

/**
 * 开始转换
 */
async function startConvert(): Promise<void> {
  phase.value = 'converting';

  try {
    if (targetMode.value === 'full') {
      await toFull(selectedCardIds.value);
    } else {
      await toEmpty(selectedCardIds.value, targetPath.value);
    }

    phase.value = 'complete';
  } catch (error) {
    console.error('转换失败', error);
    phase.value = 'info';
  }
}

/**
 * 取消转换
 */
function handleCancel(): void {
  cancel();
  phase.value = 'info';
}

/**
 * 完成
 */
function handleComplete(): void {
  reset();
  selectedCardIds.value = [];
  targetPath.value = '';
  phase.value = 'select';
}

/**
 * 进度条状态
 */
const progressStatus = computed(() => {
  if (result.value) {
    return result.value.failed > 0 ? 'error' : 'success';
  }
  return 'running';
});

/**
 * 监听目标模式变化
 */
watch(targetMode, () => {
  if (targetMode.value === 'full') {
    targetPath.value = '';
  }
});
</script>

<template>
  <div class="convert-view">
    <!-- 选择阶段 -->
    <template v-if="phase === 'select'">
      <div class="convert-header">
        <h2>{{ t('convert.title') }}</h2>
        <p class="convert-subtitle">选择要转换的卡片和目标模式</p>
      </div>

      <!-- 目标模式选择 -->
      <div class="mode-selector">
        <label class="mode-option" :class="{ active: targetMode === 'full' }">
          <input type="radio" v-model="targetMode" value="full" />
          <div class="mode-content">
            <span class="mode-icon">📦</span>
            <span class="mode-name">{{ t('convert.toFull') }}</span>
            <span class="mode-desc">将外部资源复制到卡片内部</span>
          </div>
        </label>
        <label class="mode-option" :class="{ active: targetMode === 'empty' }">
          <input type="radio" v-model="targetMode" value="empty" />
          <div class="mode-content">
            <span class="mode-icon">📂</span>
            <span class="mode-name">{{ t('convert.toEmpty') }}</span>
            <span class="mode-desc">将内部资源移出到外部路径</span>
          </div>
        </label>
      </div>

      <!-- 目标路径（空壳模式） -->
      <div v-if="targetMode === 'empty'" class="target-path-section">
        <label class="path-label">{{ t('convert.selectTarget') }}</label>
        <div class="path-input-group">
          <input 
            type="text" 
            v-model="targetPath" 
            class="path-input"
            placeholder="选择资源存放路径..."
            readonly
          />
          <button class="btn btn-secondary" @click="selectTargetPath">
            浏览
          </button>
        </div>
      </div>

      <!-- 卡片选择 -->
      <div class="card-selector">
        <div class="selector-header">
          <span class="selector-title">选择卡片</span>
          <input 
            v-model="searchKeyword"
            type="text"
            class="search-input"
            :placeholder="t('common.search')"
          />
          <button class="btn-link" @click="toggleSelectAll">
            {{ isAllSelected ? t('common.cancel') + t('common.selectAll') : t('common.selectAll') }}
          </button>
        </div>
        
        <div class="card-list">
          <div 
            v-for="card in filteredCards" 
            :key="card.id"
            class="card-item"
            :class="{ selected: selectedCardIds.includes(card.id) }"
            @click="toggleCard(card.id)"
          >
            <input 
              type="checkbox" 
              :checked="selectedCardIds.includes(card.id)"
              @click.stop
              @change="toggleCard(card.id)"
            />
            <div class="card-info">
              <span class="card-name">{{ card.name }}</span>
              <span class="card-mode">{{ getModeText(card.resourceMode) }}</span>
            </div>
          </div>
          
          <div v-if="filteredCards.length === 0" class="empty-state">
            暂无卡片
          </div>
        </div>
        
        <div class="selector-footer">
          已选择 {{ selectedCardIds.length }} 个卡片
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="convert-actions">
        <button 
          class="btn btn-primary" 
          @click="nextStep"
          :disabled="selectedCardIds.length === 0 || (targetMode === 'empty' && !targetPath)"
        >
          {{ t('common.next') }}
        </button>
      </div>
    </template>

    <!-- 信息确认阶段 -->
    <template v-else-if="phase === 'info'">
      <div class="convert-header">
        <h2>确认转换</h2>
        <p class="convert-subtitle">请确认以下转换信息</p>
      </div>

      <div class="convert-info">
        <!-- 转换概要 -->
        <div class="info-card">
          <h3>转换概要</h3>
          <div class="info-row">
            <span class="info-label">目标模式:</span>
            <span class="info-value">
              {{ targetMode === 'full' ? '全填充' : '空壳' }}
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">卡片数量:</span>
            <span class="info-value">{{ selectedCardIds.length }}</span>
          </div>
          <div class="info-row" v-if="targetMode === 'empty'">
            <span class="info-label">目标路径:</span>
            <span class="info-value">{{ targetPath }}</span>
          </div>
        </div>

        <!-- 空间信息 -->
        <div class="info-card">
          <h3>空间信息</h3>
          <div class="info-row">
            <span class="info-label">{{ t('convert.spaceRequired') }}:</span>
            <span class="info-value">{{ formatSize(requiredSpace) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">{{ t('convert.spaceAvailable') }}:</span>
            <span class="info-value" :class="{ 'text-error': !hasEnoughSpace }">
              {{ formatSize(availableSpace) }}
            </span>
          </div>
          <div v-if="!hasEnoughSpace" class="space-warning">
            ⚠️ 磁盘空间不足，请释放空间后再试
          </div>
        </div>

        <!-- 资源信息 -->
        <div class="info-card" v-if="currentMode">
          <h3>当前资源模式</h3>
          <div class="info-row">
            <span class="info-label">模式:</span>
            <span class="info-value">{{ getModeText(currentMode) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">外部资源:</span>
            <span class="info-value">{{ externalResources.length }} 个</span>
          </div>
          <div class="info-row">
            <span class="info-label">内部资源:</span>
            <span class="info-value">{{ internalResources.length }} 个</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="convert-actions">
        <button class="btn btn-secondary" @click="goBack">
          {{ t('common.back') }}
        </button>
        <button 
          class="btn btn-primary" 
          @click="startConvert"
          :disabled="!hasEnoughSpace"
        >
          开始转换
        </button>
      </div>
    </template>

    <!-- 转换中阶段 -->
    <template v-else-if="phase === 'converting'">
      <div class="convert-header">
        <h2>{{ t('convert.converting') }}</h2>
        <p class="convert-subtitle">正在转换资源模式...</p>
      </div>

      <!-- 进度条 -->
      <div class="progress-section" v-if="progress">
        <ProgressBar
          :current="progress.bytesTransferred"
          :total="progress.totalBytes"
          :status="progressStatus"
          :show-percentage="true"
          :show-count="false"
          :height="12"
          label="转换进度"
        />
        
        <div class="progress-details">
          <div class="detail-item">
            <span class="detail-label">卡片进度:</span>
            <span class="detail-value">{{ progress.currentCard }}/{{ progress.totalCards }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">资源进度:</span>
            <span class="detail-value">{{ progress.currentResource }}/{{ progress.totalResources }}</span>
          </div>
          <div class="detail-item" v-if="progress.cardId">
            <span class="detail-label">当前卡片:</span>
            <span class="detail-value">{{ progress.cardId }}</span>
          </div>
        </div>
      </div>

      <!-- 取消按钮 -->
      <div class="convert-actions">
        <button class="btn btn-secondary" @click="handleCancel">
          {{ t('common.cancel') }}
        </button>
      </div>
    </template>

    <!-- 完成阶段 -->
    <template v-else-if="phase === 'complete' && result">
      <div class="convert-header">
        <h2>转换完成</h2>
      </div>

      <div class="result-section">
        <div class="result-summary" :class="{ 'has-error': result.failed > 0 }">
          <div class="summary-icon">{{ result.failed > 0 ? '!' : '✓' }}</div>
          <div class="summary-stats">
            <div class="stat-item stat-success">
              <span class="stat-value">{{ result.success }}</span>
              <span class="stat-label">成功</span>
            </div>
            <div class="stat-item stat-failed">
              <span class="stat-value">{{ result.failed }}</span>
              <span class="stat-label">失败</span>
            </div>
          </div>
          <div class="summary-info">
            <span>总大小: {{ formatSize(result.totalSize) }}</span>
            <span>耗时: {{ (result.duration / 1000).toFixed(1) }}秒</span>
          </div>
        </div>

        <!-- 错误详情 -->
        <div v-if="result.errors.length > 0" class="error-section">
          <h4>失败详情</h4>
          <div class="error-list">
            <div v-for="(error, index) in result.errors" :key="index" class="error-item">
              <span class="error-card">{{ error.cardId }}</span>
              <span class="error-message">{{ error.message }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="convert-actions">
        <button class="btn btn-primary" @click="handleComplete">
          {{ t('common.finish') }}
        </button>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.convert-view {
  height: 100%;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
}

.convert-header {
  margin-bottom: var(--spacing-lg);

  h2 {
    margin: 0 0 var(--spacing-xs);
    font-size: var(--font-size-lg);
  }

  .convert-subtitle {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }
}

.mode-selector {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.mode-option {
  flex: 1;
  cursor: pointer;

  input[type="radio"] {
    display: none;
  }

  .mode-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-lg);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);

    &:hover {
      border-color: var(--color-primary);
      background: var(--color-primary-bg);
    }
  }

  &.active .mode-content {
    border-color: var(--color-primary);
    background: var(--color-primary-bg);
  }

  .mode-icon {
    font-size: 32px;
    margin-bottom: var(--spacing-sm);
  }

  .mode-name {
    font-weight: 600;
    margin-bottom: var(--spacing-xs);
  }

  .mode-desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    text-align: center;
  }
}

.target-path-section {
  margin-bottom: var(--spacing-lg);

  .path-label {
    display: block;
    margin-bottom: var(--spacing-xs);
    font-weight: 500;
  }

  .path-input-group {
    display: flex;
    gap: var(--spacing-sm);
  }

  .path-input {
    flex: 1;
    padding: var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg-secondary);
  }
}

.card-selector {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.selector-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);

  .selector-title {
    font-weight: 500;
  }

  .search-input {
    flex: 1;
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
  }

  .btn-link {
    background: none;
    border: none;
    color: var(--color-primary);
    cursor: pointer;
    font-size: var(--font-size-sm);

    &:hover {
      text-decoration: underline;
    }
  }
}

.card-list {
  flex: 1;
  overflow-y: auto;
}

.card-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  transition: background var(--transition-fast);

  &:hover {
    background: var(--color-bg-hover);
  }

  &.selected {
    background: var(--color-primary-bg);
  }

  input[type="checkbox"] {
    cursor: pointer;
  }

  .card-info {
    display: flex;
    flex-direction: column;
  }

  .card-name {
    font-weight: 500;
  }

  .card-mode {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }
}

.selector-footer {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.empty-state {
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--color-text-tertiary);
}

.convert-info {
  display: grid;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.info-card {
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);

  h3 {
    margin: 0 0 var(--spacing-md);
    font-size: var(--font-size-md);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: var(--spacing-xs) 0;

    .info-label {
      color: var(--color-text-secondary);
    }

    .info-value {
      font-weight: 500;

      &.text-error {
        color: var(--color-error);
      }
    }
  }

  .space-warning {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--color-error-bg);
    border-radius: var(--radius-sm);
    color: var(--color-error);
    font-size: var(--font-size-sm);
  }
}

.progress-section {
  max-width: 600px;
  margin: 0 auto var(--spacing-xl);
  width: 100%;
}

.progress-details {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xl);
  margin-top: var(--spacing-md);
  font-size: var(--font-size-sm);

  .detail-item {
    .detail-label {
      color: var(--color-text-secondary);
      margin-right: var(--spacing-xs);
    }

    .detail-value {
      font-weight: 500;
    }
  }
}

.result-section {
  flex: 1;
}

.result-summary {
  text-align: center;
  padding: var(--spacing-xl);
  background: var(--color-success-bg);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-lg);

  &.has-error {
    background: var(--color-error-bg);

    .summary-icon {
      color: var(--color-error);
    }
  }

  .summary-icon {
    font-size: 48px;
    color: var(--color-success);
    margin-bottom: var(--spacing-md);
  }

  .summary-stats {
    display: flex;
    justify-content: center;
    gap: var(--spacing-xl);
    margin-bottom: var(--spacing-md);

    .stat-item {
      text-align: center;

      .stat-value {
        font-size: var(--font-size-xl);
        font-weight: 600;
        display: block;
      }

      .stat-label {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }

      &.stat-success .stat-value {
        color: var(--color-success);
      }

      &.stat-failed .stat-value {
        color: var(--color-error);
      }
    }
  }

  .summary-info {
    display: flex;
    justify-content: center;
    gap: var(--spacing-lg);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
}

.error-section {
  h4 {
    margin: 0 0 var(--spacing-sm);
  }

  .error-list {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .error-item {
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: 1px solid var(--color-border-light);

    &:last-child {
      border-bottom: none;
    }

    .error-card {
      font-weight: 500;
    }

    .error-message {
      color: var(--color-error);
      font-size: var(--font-size-sm);
    }
  }
}

.convert-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  margin-top: auto;
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

    &:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
