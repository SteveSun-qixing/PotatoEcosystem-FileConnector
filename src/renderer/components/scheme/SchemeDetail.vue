<script setup lang="ts">
/**
 * 方案详情组件
 * @description 展示选中方案的详细绑定列表
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MatchScheme, MatchMode } from '@/types/match';
import type { BindingItem } from '@/types/binding';
import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';

const props = defineProps<{
  /** 选中的方案 */
  scheme: MatchScheme | null;
  /** 卡片映射表 */
  cardMap?: Map<string, CardInfo>;
  /** 文件映射表 */
  fileMap?: Map<string, FileInfo>;
}>();

const { t } = useI18n();

/** 当前标签页 */
const activeTab = ref<'matched' | 'unmatched'>('matched');

/** 模式名称映射 */
const modeNames: Record<MatchMode, string> = {
  number_sequence: 'auto.numberMatch',
  keyword: 'auto.keywordMatch',
  file_order: 'auto.orderMatch'
};

/** 获取模式显示名称 */
const modeName = computed(() => {
  if (!props.scheme) return '';
  return t(modeNames[props.scheme.mode] || props.scheme.mode);
});

/** 获取卡片名称 */
function getCardName(cardId: string): string {
  const card = props.cardMap?.get(cardId);
  return card?.name || cardId;
}

/** 获取文件名 */
function getFileName(filePath: string): string {
  const file = props.fileMap?.get(filePath);
  return file?.name || filePath.split('/').pop() || filePath;
}

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/** 获取文件大小 */
function getFileSize(filePath: string): string {
  const file = props.fileMap?.get(filePath);
  return file ? formatSize(file.size) : '';
}

/** 置信度等级样式 */
const confidenceClass = computed(() => {
  if (!props.scheme) return '';
  const confidence = props.scheme.confidence;
  if (confidence >= 80) return 'confidence--high';
  if (confidence >= 50) return 'confidence--medium';
  return 'confidence--low';
});
</script>

<template>
  <div class="scheme-detail">
    <!-- 未选择状态 -->
    <div v-if="!scheme" class="scheme-detail__empty">
      <div class="empty-icon">👆</div>
      <p>{{ t('scheme.selectHint') }}</p>
    </div>

    <!-- 方案详情 -->
    <template v-else>
      <!-- 头部概览 -->
      <div class="scheme-detail__header">
        <div class="header-info">
          <h3 class="header-title">{{ modeName }}</h3>
          <span class="header-confidence" :class="confidenceClass">
            {{ t('auto.confidence') }}: {{ scheme.confidence }}%
          </span>
        </div>
        <div class="header-stats">
          <span class="stat">
            {{ t('scheme.matchedCount', { count: scheme.bindings.length }) }}
          </span>
          <span v-if="scheme.unmatchedCards.length > 0" class="stat stat--warning">
            {{ t('scheme.unmatchedCardsCount', { count: scheme.unmatchedCards.length }) }}
          </span>
          <span v-if="scheme.unmatchedFiles.length > 0" class="stat stat--warning">
            {{ t('scheme.unmatchedFilesCount', { count: scheme.unmatchedFiles.length }) }}
          </span>
        </div>
      </div>

      <!-- 标签页切换 -->
      <div class="scheme-detail__tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'matched' }"
          @click="activeTab = 'matched'"
        >
          {{ t('scheme.matchedTab') }}
          <span class="tab-count">{{ scheme.bindings.length }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'unmatched' }"
          @click="activeTab = 'unmatched'"
        >
          {{ t('scheme.unmatchedTab') }}
          <span class="tab-count">
            {{ scheme.unmatchedCards.length + scheme.unmatchedFiles.length }}
          </span>
        </button>
      </div>

      <!-- 绑定列表 -->
      <div v-if="activeTab === 'matched'" class="scheme-detail__content">
        <div v-if="scheme.bindings.length === 0" class="content-empty">
          {{ t('scheme.noBindings') }}
        </div>
        <table v-else class="binding-table">
          <thead>
            <tr>
              <th class="col-index">#</th>
              <th class="col-card">{{ t('bindingTable.cardColumn') }}</th>
              <th class="col-arrow"></th>
              <th class="col-file">{{ t('bindingTable.fileColumn') }}</th>
              <th class="col-size">{{ t('file.detail.size') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(binding, index) in scheme.bindings" :key="binding.cardId">
              <td class="col-index">{{ index + 1 }}</td>
              <td class="col-card" :title="getCardName(binding.cardId)">
                {{ getCardName(binding.cardId) }}
              </td>
              <td class="col-arrow">→</td>
              <td class="col-file" :title="binding.filePath">
                {{ getFileName(binding.filePath) }}
              </td>
              <td class="col-size">{{ getFileSize(binding.filePath) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 未匹配列表 -->
      <div v-else class="scheme-detail__content">
        <!-- 未匹配的卡片 -->
        <div v-if="scheme.unmatchedCards.length > 0" class="unmatched-section">
          <h4 class="section-title">
            {{ t('scheme.unmatchedCardsSection') }}
            <span class="section-count">{{ scheme.unmatchedCards.length }}</span>
          </h4>
          <div class="unmatched-list">
            <div 
              v-for="cardId in scheme.unmatchedCards" 
              :key="cardId"
              class="unmatched-item unmatched-item--card"
            >
              <span class="item-icon">📄</span>
              <span class="item-name">{{ getCardName(cardId) }}</span>
            </div>
          </div>
        </div>

        <!-- 未匹配的文件 -->
        <div v-if="scheme.unmatchedFiles.length > 0" class="unmatched-section">
          <h4 class="section-title">
            {{ t('scheme.unmatchedFilesSection') }}
            <span class="section-count">{{ scheme.unmatchedFiles.length }}</span>
          </h4>
          <div class="unmatched-list">
            <div 
              v-for="filePath in scheme.unmatchedFiles" 
              :key="filePath"
              class="unmatched-item unmatched-item--file"
            >
              <span class="item-icon">📁</span>
              <span class="item-name">{{ getFileName(filePath) }}</span>
            </div>
          </div>
        </div>

        <!-- 全部匹配 -->
        <div 
          v-if="scheme.unmatchedCards.length === 0 && scheme.unmatchedFiles.length === 0" 
          class="content-empty content-empty--success"
        >
          <span class="success-icon">✓</span>
          {{ t('scheme.allMatched') }}
        </div>
      </div>

      <!-- 警告信息 -->
      <div v-if="scheme.warning" class="scheme-detail__warning">
        <span class="warning-icon">⚠️</span>
        {{ scheme.warning }}
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.scheme-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  overflow: hidden;

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: var(--spacing-xl);
    text-align: center;
    color: var(--color-text-tertiary);

    .empty-icon {
      font-size: 48px;
      margin-bottom: var(--spacing-md);
      opacity: 0.5;
    }

    p {
      margin: 0;
      font-size: var(--font-size-sm);
    }
  }

  &__header {
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--color-border-light);

    .header-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-sm);
    }

    .header-title {
      margin: 0;
      font-size: var(--font-size-md);
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .header-confidence {
      font-size: var(--font-size-sm);
      font-weight: 500;
      padding: 2px 8px;
      border-radius: var(--radius-sm);

      &.confidence--high {
        color: var(--color-success);
        background: var(--color-success-bg);
      }

      &.confidence--medium {
        color: var(--color-warning);
        background: var(--color-warning-bg);
      }

      &.confidence--low {
        color: var(--color-error);
        background: var(--color-error-bg);
      }
    }

    .header-stats {
      display: flex;
      gap: var(--spacing-md);
      font-size: var(--font-size-xs);

      .stat {
        color: var(--color-text-secondary);

        &--warning {
          color: var(--color-warning);
        }
      }
    }
  }

  &__tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border-light);

    .tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--color-text-primary);
        background: var(--color-bg-hover);
      }

      &.active {
        color: var(--color-primary);
        border-bottom-color: var(--color-primary);
      }

      .tab-count {
        padding: 1px 6px;
        font-size: var(--font-size-xs);
        background: var(--color-bg-secondary);
        border-radius: var(--radius-full);
      }
    }
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-md);

    .content-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--color-text-tertiary);
      font-size: var(--font-size-sm);

      &--success {
        color: var(--color-success);
      }

      .success-icon {
        font-size: 32px;
        margin-bottom: var(--spacing-sm);
      }
    }
  }

  &__warning {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-xs);
    color: var(--color-warning);
    background: var(--color-warning-bg);
    border-top: 1px solid var(--color-border-light);

    .warning-icon {
      flex-shrink: 0;
    }
  }
}

.binding-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-xs);

  th, td {
    padding: var(--spacing-xs) var(--spacing-sm);
    text-align: left;
    border-bottom: 1px solid var(--color-border-light);
  }

  th {
    font-weight: 500;
    color: var(--color-text-tertiary);
    background: var(--color-bg-secondary);
    position: sticky;
    top: 0;
  }

  td {
    color: var(--color-text-secondary);
  }

  tr:hover td {
    background: var(--color-bg-hover);
  }

  .col-index {
    width: 40px;
    text-align: center;
    color: var(--color-text-tertiary);
  }

  .col-card, .col-file {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-arrow {
    width: 30px;
    text-align: center;
    color: var(--color-text-tertiary);
  }

  .col-size {
    width: 80px;
    text-align: right;
    color: var(--color-text-tertiary);
  }
}

.unmatched-section {
  margin-bottom: var(--spacing-lg);

  &:last-child {
    margin-bottom: 0;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin: 0 0 var(--spacing-sm);
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-secondary);

    .section-count {
      padding: 1px 6px;
      font-size: var(--font-size-xs);
      font-weight: normal;
      color: var(--color-text-tertiary);
      background: var(--color-bg-secondary);
      border-radius: var(--radius-full);
    }
  }
}

.unmatched-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.unmatched-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);

  .item-icon {
    flex-shrink: 0;
  }

  .item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }
}
</style>
