<script setup lang="ts">
/**
 * 自动匹配视图
 * @description 自动识别模式的主视图，整合卡片/文件选择和方案选择
 */
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useCardsStore } from '@/stores/cards';
import { useFilesStore } from '@/stores/files';
import { useConnectorStore } from '@/stores/connector';
import { useAutoMatch } from '@/composables/useAutoMatch';
import { SchemeSelector } from '@/components/scheme';
import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';

const { t } = useI18n();
const router = useRouter();

// Stores
const cardsStore = useCardsStore();
const filesStore = useFilesStore();
const connectorStore = useConnectorStore();

// Composable
const {
  schemes,
  selectedIndex,
  loading,
  error,
  selectedScheme,
  hasSchemes,
  recommendedScheme,
  generateSchemes,
  selectScheme,
  applyScheme,
  clearSchemes
} = useAutoMatch();

// 本地状态
const step = ref<'select' | 'match'>('select');
const selectedCardIds = ref<Set<string>>(new Set());
const selectedFilePaths = ref<Set<string>>(new Set());

// 计算属性

/** 所有卡片 */
const allCards = computed(() => cardsStore.cards);

/** 所有文件 */
const allFiles = computed(() => filesStore.files);

/** 选中的卡片列表 */
const selectedCards = computed<CardInfo[]>(() => {
  return allCards.value.filter(card => selectedCardIds.value.has(card.id));
});

/** 选中的文件列表 */
const selectedFiles = computed<FileInfo[]>(() => {
  return allFiles.value.filter(file => selectedFilePaths.value.has(file.path));
});

/** 是否可以开始匹配 */
const canStartMatch = computed(() => {
  return selectedCardIds.value.size > 0 && selectedFilePaths.value.size > 0;
});

/** 状态栏文本 */
const statusText = computed(() => {
  const parts: string[] = [];
  
  if (selectedCardIds.value.size > 0) {
    parts.push(t('status.cardsSelected', { count: selectedCardIds.value.size }));
  }
  
  if (selectedFilePaths.value.size > 0) {
    parts.push(t('status.filesSelected', { count: selectedFilePaths.value.size }));
  }
  
  if (recommendedScheme.value) {
    const modeNames: Record<string, string> = {
      number_sequence: t('auto.numberMatch'),
      keyword: t('auto.keywordMatch'),
      file_order: t('auto.orderMatch')
    };
    const modeName = modeNames[recommendedScheme.value.mode] || recommendedScheme.value.mode;
    parts.push(`${t('scheme.recommendedScheme')}: ${modeName} (${recommendedScheme.value.confidence}%)`);
  }
  
  return parts.join(' | ');
});

// 方法

/** 切换卡片选择 */
function toggleCard(cardId: string) {
  if (selectedCardIds.value.has(cardId)) {
    selectedCardIds.value.delete(cardId);
  } else {
    selectedCardIds.value.add(cardId);
  }
  selectedCardIds.value = new Set(selectedCardIds.value);
}

/** 全选/取消全选卡片 */
function toggleAllCards() {
  if (selectedCardIds.value.size === allCards.value.length) {
    selectedCardIds.value = new Set();
  } else {
    selectedCardIds.value = new Set(allCards.value.map(c => c.id));
  }
}

/** 切换文件选择 */
function toggleFile(filePath: string) {
  if (selectedFilePaths.value.has(filePath)) {
    selectedFilePaths.value.delete(filePath);
  } else {
    selectedFilePaths.value.add(filePath);
  }
  selectedFilePaths.value = new Set(selectedFilePaths.value);
}

/** 全选/取消全选文件 */
function toggleAllFiles() {
  if (selectedFilePaths.value.size === allFiles.value.length) {
    selectedFilePaths.value = new Set();
  } else {
    selectedFilePaths.value = new Set(allFiles.value.map(f => f.path));
  }
}

/** 开始匹配 */
async function handleStartMatch() {
  if (!canStartMatch.value) return;
  
  step.value = 'match';
  await generateSchemes(selectedCards.value, selectedFiles.value);
}

/** 方案选择 */
function handleSchemeSelect(index: number) {
  selectScheme(index);
}

/** 应用方案 */
function handleApplyScheme() {
  const bindings = applyScheme();
  
  if (bindings.length > 0) {
    // 导航到绑定预览页面
    connectorStore.setMode('auto');
    router.push('/preview');
  }
}

/** 手动调整 */
function handleManualAdjust() {
  // 先应用当前方案
  applyScheme();
  
  // 跳转到手动模式进行调整
  connectorStore.setMode('manual');
  router.push('/manual');
}

/** 返回选择 */
function handleBackToSelect() {
  step.value = 'select';
  clearSchemes();
}

/** 返回主页 */
function handleBack() {
  router.push('/');
}

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// 生命周期

onMounted(() => {
  // 如果之前已有选择，自动使用
  if (cardsStore.selectedCards.length > 0) {
    selectedCardIds.value = new Set(cardsStore.selectedCards.map(c => c.id));
  }
  
  if (filesStore.selectedFiles.length > 0) {
    selectedFilePaths.value = new Set(filesStore.selectedFiles.map(f => f.path));
  }
});
</script>

<template>
  <div class="auto-match-view">
    <!-- 头部工具栏 -->
    <header class="view-header">
      <div class="header-left">
        <h2 class="header-title">{{ t('auto.title') }}</h2>
      </div>
      <div class="header-actions">
        <button
          v-if="step === 'select'"
          class="btn btn--primary"
          :disabled="!canStartMatch"
          @click="handleStartMatch"
        >
          {{ t('scheme.startMatch') }}
        </button>
        <button
          v-if="step === 'match'"
          class="btn btn--secondary"
          @click="handleBackToSelect"
        >
          {{ t('scheme.backToSelect') }}
        </button>
        <button
          v-if="step === 'match' && hasSchemes"
          class="btn btn--primary"
          :disabled="!selectedScheme"
          @click="handleApplyScheme"
        >
          {{ t('auto.applyScheme') }}
        </button>
        <button class="btn btn--text" @click="handleBack">
          {{ t('common.back') }}
        </button>
      </div>
    </header>

    <!-- 选择步骤：卡片和文件选择 -->
    <div v-if="step === 'select'" class="select-step">
      <div class="select-panels">
        <!-- 卡片选择区域 -->
        <div class="select-panel">
          <div class="panel-header">
            <h3 class="panel-title">{{ t('manual.selectCards') }}</h3>
            <div class="panel-actions">
              <button class="link-btn" @click="toggleAllCards">
                {{ selectedCardIds.size === allCards.length ? t('scheme.deselectAll') : t('common.selectAll') }}
              </button>
              <span class="panel-count">{{ selectedCardIds.size }}/{{ allCards.length }}</span>
            </div>
          </div>
          <div class="panel-content">
            <div v-if="allCards.length === 0" class="panel-empty">
              <p>{{ t('card.empty.noCards') }}</p>
              <p class="hint">{{ t('scheme.loadCardsHint') }}</p>
            </div>
            <div v-else class="item-list">
              <div
                v-for="card in allCards"
                :key="card.id"
                class="item-row"
                :class="{ selected: selectedCardIds.has(card.id) }"
                @click="toggleCard(card.id)"
              >
                <span class="item-checkbox">
                  <span v-if="selectedCardIds.has(card.id)" class="check-mark">✓</span>
                </span>
                <span class="item-name">{{ card.name }}</span>
                <span class="item-type">{{ t(`card.type.${card.type}`) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 文件选择区域 -->
        <div class="select-panel">
          <div class="panel-header">
            <h3 class="panel-title">{{ t('manual.selectFiles') }}</h3>
            <div class="panel-actions">
              <button class="link-btn" @click="toggleAllFiles">
                {{ selectedFilePaths.size === allFiles.length ? t('scheme.deselectAll') : t('common.selectAll') }}
              </button>
              <span class="panel-count">{{ selectedFilePaths.size }}/{{ allFiles.length }}</span>
            </div>
          </div>
          <div class="panel-content">
            <div v-if="allFiles.length === 0" class="panel-empty">
              <p>{{ t('file.empty.noFiles') }}</p>
              <p class="hint">{{ t('scheme.loadFilesHint') }}</p>
            </div>
            <div v-else class="item-list">
              <div
                v-for="file in allFiles"
                :key="file.path"
                class="item-row"
                :class="{ selected: selectedFilePaths.has(file.path) }"
                @click="toggleFile(file.path)"
              >
                <span class="item-checkbox">
                  <span v-if="selectedFilePaths.has(file.path)" class="check-mark">✓</span>
                </span>
                <span class="item-name">{{ file.name }}</span>
                <span class="item-size">{{ formatSize(file.size) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 匹配步骤：方案选择 -->
    <div v-else class="match-step">
      <!-- 错误提示 -->
      <div v-if="error" class="error-banner">
        <span class="error-icon">⚠️</span>
        {{ error }}
        <button class="error-close" @click="error = null">×</button>
      </div>

      <!-- 方案选择器 -->
      <SchemeSelector
        :schemes="schemes"
        :selected-index="selectedIndex"
        :loading="loading"
        :cards="selectedCards"
        :files="selectedFiles"
        @select="handleSchemeSelect"
        @apply="handleApplyScheme"
        @manual="handleManualAdjust"
      />
    </div>

    <!-- 底部状态栏 -->
    <footer class="view-footer">
      <span class="footer-status">{{ statusText }}</span>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.auto-match-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-primary);
}

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .header-title {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .header-actions {
    display: flex;
    gap: var(--spacing-sm);
  }
}

.btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);

  &--primary {
    color: white;
    background: var(--color-primary);
    border: 1px solid var(--color-primary);

    &:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    &:disabled {
      background: var(--color-text-disabled);
      border-color: var(--color-text-disabled);
      cursor: not-allowed;
    }
  }

  &--secondary {
    color: var(--color-text-secondary);
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);

    &:hover {
      color: var(--color-text-primary);
      border-color: var(--color-text-tertiary);
    }
  }

  &--text {
    color: var(--color-text-tertiary);
    background: transparent;
    border: none;

    &:hover {
      color: var(--color-text-primary);
    }
  }
}

.link-btn {
  padding: 0;
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  background: transparent;
  border: none;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.select-step {
  flex: 1;
  display: flex;
  padding: var(--spacing-lg);
  overflow: hidden;
}

.select-panels {
  display: flex;
  gap: var(--spacing-lg);
  flex: 1;
  min-height: 0;
}

.select-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  overflow: hidden;

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--color-border-light);
  }

  .panel-title {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .panel-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .panel-count {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-sm);
  }

  .panel-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: var(--color-text-tertiary);

    p {
      margin: 0 0 var(--spacing-xs);
    }

    .hint {
      font-size: var(--font-size-xs);
    }
  }
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.item-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-border);
    background: var(--color-bg-hover);
  }

  &.selected {
    border-color: var(--color-primary);
    background: var(--color-primary-bg);
  }

  .item-checkbox {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg-primary);
    flex-shrink: 0;

    .selected & {
      background: var(--color-primary);
      border-color: var(--color-primary);
    }

    .check-mark {
      color: white;
      font-size: 11px;
      font-weight: bold;
    }
  }

  .item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
  }

  .item-type,
  .item-size {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    flex-shrink: 0;
  }
}

.match-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  overflow: hidden;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-md);
  background: var(--color-error-bg);
  color: var(--color-error);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);

  .error-icon {
    flex-shrink: 0;
  }

  .error-close {
    margin-left: auto;
    padding: 0;
    font-size: var(--font-size-lg);
    color: var(--color-error);
    background: transparent;
    border: none;
    cursor: pointer;
    line-height: 1;

    &:hover {
      opacity: 0.7;
    }
  }
}

.view-footer {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border-light);

  .footer-status {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }
}
</style>
