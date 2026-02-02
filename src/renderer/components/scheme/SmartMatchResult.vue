<script setup lang="ts">
/**
 * 智能匹配结果组件
 * @description 分级展示智能匹配结果，支持修改和确认
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SmartMatchResult, ClassifiedMatches } from '@/types/match';
import type { BindingItem } from '@/types/binding';

const props = defineProps<{
  /** 匹配结果 */
  result: SmartMatchResult;
  /** 分级后的匹配 */
  classified: ClassifiedMatches;
  /** 可用文件列表（用于修改绑定） */
  availableFiles?: Array<{ path: string; name: string }>;
  /** 卡片名称映射 */
  cardNames?: Map<string, string>;
  /** 是否处于降级模式 */
  fallbackMode?: boolean;
}>();

const emit = defineEmits<{
  /** 修改绑定 */
  'modify': [cardId: string, newFilePath: string];
  /** 确认绑定 */
  'confirm': [cardId: string];
  /** 移除绑定 */
  'remove': [cardId: string];
}>();

const { t } = useI18n();

/** 各分组展开状态 */
const expandedGroups = ref({
  high: true,
  medium: true,
  low: true,
  unmatched: true
});

/** 已确认的绑定ID集合 */
const confirmedIds = ref(new Set<string>());

/** 正在编辑的绑定ID */
const editingId = ref<string | null>(null);

/** 编辑中的新文件路径 */
const editingFilePath = ref<string>('');

/** 高置信度数量 */
const highCount = computed(() => props.classified.high.length);

/** 中置信度数量 */
const mediumCount = computed(() => props.classified.medium.length);

/** 低置信度数量 */
const lowCount = computed(() => props.classified.low.length);

/** 未匹配卡片数量 */
const unmatchedCardsCount = computed(() => props.result.unmatchedCards.length);

/** 未匹配文件数量 */
const unmatchedFilesCount = computed(() => props.result.unmatchedFiles.length);

/** 获取卡片名称 */
function getCardName(cardId: string): string {
  return props.cardNames?.get(cardId) || cardId;
}

/** 获取文件名 */
function getFileName(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}

/** 切换分组展开状态 */
function toggleGroup(group: keyof typeof expandedGroups.value) {
  expandedGroups.value[group] = !expandedGroups.value[group];
}

/** 确认绑定 */
function handleConfirm(cardId: string) {
  confirmedIds.value.add(cardId);
  emit('confirm', cardId);
}

/** 取消确认 */
function handleUnconfirm(cardId: string) {
  confirmedIds.value.delete(cardId);
}

/** 移除绑定 */
function handleRemove(cardId: string) {
  confirmedIds.value.delete(cardId);
  emit('remove', cardId);
}

/** 开始编辑 */
function startEdit(binding: BindingItem & { confidence: number }) {
  editingId.value = binding.cardId;
  editingFilePath.value = binding.filePath;
}

/** 保存编辑 */
function saveEdit(cardId: string) {
  if (editingFilePath.value && editingFilePath.value !== '') {
    emit('modify', cardId, editingFilePath.value);
  }
  editingId.value = null;
  editingFilePath.value = '';
}

/** 取消编辑 */
function cancelEdit() {
  editingId.value = null;
  editingFilePath.value = '';
}

/** 是否已确认 */
function isConfirmed(cardId: string): boolean {
  return confirmedIds.value.has(cardId);
}

/** 获取置信度颜色 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'var(--color-success)';
  if (confidence >= 50) return 'var(--color-warning)';
  return 'var(--color-error)';
}
</script>

<template>
  <div class="smart-match-result">
    <!-- 降级模式提示 -->
    <div v-if="fallbackMode" class="fallback-notice">
      <span class="notice-icon">⚠️</span>
      <span class="notice-text">{{ t('smart.fallbackMode') }}</span>
    </div>

    <!-- 高置信度匹配 -->
    <section v-if="highCount > 0" class="result-section result-section--high">
      <div class="section-header" @click="toggleGroup('high')">
        <div class="section-title">
          <span class="confidence-icon">🟢</span>
          <span class="title-text">{{ t('smart.highConfidence') }}</span>
          <span class="count-badge">{{ highCount }}</span>
        </div>
        <span class="toggle-icon">{{ expandedGroups.high ? '▼' : '▶' }}</span>
      </div>
      
      <div v-show="expandedGroups.high" class="section-content">
        <div 
          v-for="binding in classified.high" 
          :key="binding.cardId"
          class="binding-item binding-item--high"
        >
          <div class="binding-info">
            <span class="card-name">{{ getCardName(binding.cardId) }}</span>
            <span class="binding-arrow">→</span>
            <span class="file-name">{{ getFileName(binding.filePath) }}</span>
            <span class="confidence" :style="{ color: getConfidenceColor(binding.confidence) }">
              ({{ binding.confidence }}%)
            </span>
          </div>
          <div v-if="binding.reason" class="binding-reason">
            {{ binding.reason }}
          </div>
        </div>
      </div>
    </section>

    <!-- 中置信度匹配 -->
    <section v-if="mediumCount > 0" class="result-section result-section--medium">
      <div class="section-header" @click="toggleGroup('medium')">
        <div class="section-title">
          <span class="confidence-icon">🟡</span>
          <span class="title-text">{{ t('smart.mediumConfidence') }}</span>
          <span class="count-badge">{{ mediumCount }}</span>
        </div>
        <span class="toggle-icon">{{ expandedGroups.medium ? '▼' : '▶' }}</span>
      </div>
      
      <div v-show="expandedGroups.medium" class="section-content">
        <div 
          v-for="binding in classified.medium" 
          :key="binding.cardId"
          class="binding-item binding-item--medium"
          :class="{ 'binding-item--confirmed': isConfirmed(binding.cardId) }"
        >
          <div class="binding-main">
            <div class="binding-checkbox">
              <input 
                type="checkbox"
                :checked="isConfirmed(binding.cardId)"
                @change="isConfirmed(binding.cardId) ? handleUnconfirm(binding.cardId) : handleConfirm(binding.cardId)"
              />
            </div>
            <div class="binding-info">
              <span class="card-name">{{ getCardName(binding.cardId) }}</span>
              <span class="binding-arrow">→</span>
              
              <!-- 编辑模式 -->
              <template v-if="editingId === binding.cardId">
                <select v-model="editingFilePath" class="file-select">
                  <option v-for="file in availableFiles" :key="file.path" :value="file.path">
                    {{ file.name }}
                  </option>
                </select>
                <button class="btn-action btn-save" @click="saveEdit(binding.cardId)">✓</button>
                <button class="btn-action btn-cancel" @click="cancelEdit">✗</button>
              </template>
              
              <!-- 显示模式 -->
              <template v-else>
                <span class="file-name">{{ getFileName(binding.filePath) }}</span>
                <span class="confidence" :style="{ color: getConfidenceColor(binding.confidence) }">
                  ({{ binding.confidence }}%)
                </span>
                <button class="btn-edit" @click="startEdit(binding)">{{ t('common.edit') }}</button>
              </template>
            </div>
          </div>
          <div v-if="binding.reason" class="binding-reason">
            {{ binding.reason }}
          </div>
        </div>
      </div>
    </section>

    <!-- 低置信度匹配 -->
    <section v-if="lowCount > 0" class="result-section result-section--low">
      <div class="section-header" @click="toggleGroup('low')">
        <div class="section-title">
          <span class="confidence-icon">🔴</span>
          <span class="title-text">{{ t('smart.lowConfidence') }}</span>
          <span class="count-badge">{{ lowCount }}</span>
        </div>
        <span class="toggle-icon">{{ expandedGroups.low ? '▼' : '▶' }}</span>
      </div>
      
      <div v-show="expandedGroups.low" class="section-content">
        <div 
          v-for="binding in classified.low" 
          :key="binding.cardId"
          class="binding-item binding-item--low"
        >
          <div class="binding-main">
            <div class="binding-info">
              <span class="card-name">{{ getCardName(binding.cardId) }}</span>
              <span class="binding-arrow">→</span>
              
              <!-- 编辑模式 -->
              <template v-if="editingId === binding.cardId">
                <select v-model="editingFilePath" class="file-select">
                  <option value="">{{ t('common.select') }}...</option>
                  <option v-for="file in availableFiles" :key="file.path" :value="file.path">
                    {{ file.name }}
                  </option>
                </select>
                <button class="btn-action btn-save" @click="saveEdit(binding.cardId)">✓</button>
                <button class="btn-action btn-cancel" @click="cancelEdit">✗</button>
              </template>
              
              <!-- 显示模式 -->
              <template v-else>
                <span class="file-name file-name--uncertain">{{ getFileName(binding.filePath) }}</span>
                <span class="confidence" :style="{ color: getConfidenceColor(binding.confidence) }">
                  ({{ binding.confidence }}%)
                </span>
                <button class="btn-edit" @click="startEdit(binding)">{{ t('common.select') }}</button>
              </template>
            </div>
            <button class="btn-remove" @click="handleRemove(binding.cardId)">{{ t('common.remove') }}</button>
          </div>
          <div v-if="binding.reason" class="binding-reason">
            {{ binding.reason }}
          </div>
        </div>
      </div>
    </section>

    <!-- 未匹配项 -->
    <section v-if="unmatchedCardsCount > 0 || unmatchedFilesCount > 0" class="result-section result-section--unmatched">
      <div class="section-header" @click="toggleGroup('unmatched')">
        <div class="section-title">
          <span class="confidence-icon">⚪</span>
          <span class="title-text">{{ t('smart.unmatched') }}</span>
          <span class="count-badge">{{ unmatchedCardsCount + unmatchedFilesCount }}</span>
        </div>
        <span class="toggle-icon">{{ expandedGroups.unmatched ? '▼' : '▶' }}</span>
      </div>
      
      <div v-show="expandedGroups.unmatched" class="section-content">
        <!-- 未匹配的卡片 -->
        <div v-if="unmatchedCardsCount > 0" class="unmatched-group">
          <div class="unmatched-label">{{ t('scheme.unmatchedCardsSection') }}:</div>
          <div class="unmatched-items">
            <span 
              v-for="cardId in result.unmatchedCards" 
              :key="cardId"
              class="unmatched-item unmatched-item--card"
            >
              {{ getCardName(cardId) }}
            </span>
          </div>
        </div>
        
        <!-- 未匹配的文件 -->
        <div v-if="unmatchedFilesCount > 0" class="unmatched-group">
          <div class="unmatched-label">{{ t('scheme.unmatchedFilesSection') }}:</div>
          <div class="unmatched-items">
            <span 
              v-for="filePath in result.unmatchedFiles" 
              :key="filePath"
              class="unmatched-item unmatched-item--file"
            >
              {{ getFileName(filePath) }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- 空状态 -->
    <div v-if="highCount === 0 && mediumCount === 0 && lowCount === 0" class="empty-state">
      <span class="empty-icon">📭</span>
      <span class="empty-text">{{ t('scheme.noBindings') }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.smart-match-result {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.fallback-notice {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-warning-bg);
  border-radius: var(--radius-md);
  color: var(--color-warning);
  font-size: var(--font-size-sm);

  .notice-icon {
    font-size: var(--font-size-md);
  }
}

.result-section {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  overflow: hidden;

  &--high {
    border-left: 3px solid var(--color-success);
  }

  &--medium {
    border-left: 3px solid var(--color-warning);
  }

  &--low {
    border-left: 3px solid var(--color-error);
  }

  &--unmatched {
    border-left: 3px solid var(--color-text-tertiary);
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  cursor: pointer;
  user-select: none;

  &:hover {
    background: var(--color-bg-hover);
  }
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);

  .confidence-icon {
    font-size: var(--font-size-md);
  }

  .title-text {
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .count-badge {
    padding: 2px 8px;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    background: var(--color-bg-tertiary);
    border-radius: var(--radius-full);
  }
}

.toggle-icon {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.section-content {
  padding: var(--spacing-sm);
}

.binding-item {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);

  &:hover {
    background: var(--color-bg-hover);
  }

  &--confirmed {
    background: var(--color-success-bg);
  }
}

.binding-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.binding-checkbox {
  input {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
}

.binding-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
  flex-wrap: wrap;

  .card-name {
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .binding-arrow {
    color: var(--color-text-tertiary);
  }

  .file-name {
    color: var(--color-text-secondary);
    
    &--uncertain {
      font-style: italic;
    }
  }

  .confidence {
    font-size: var(--font-size-xs);
  }
}

.binding-reason {
  margin-top: var(--spacing-xs);
  padding-left: var(--spacing-lg);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.file-select {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  min-width: 150px;
}

.btn-edit,
.btn-remove {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-xs);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-edit {
  color: var(--color-primary);
  background: var(--color-primary-bg);

  &:hover {
    background: var(--color-primary);
    color: white;
  }
}

.btn-remove {
  color: var(--color-error);
  background: var(--color-error-bg);

  &:hover {
    background: var(--color-error);
    color: white;
  }
}

.btn-action {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);

  &.btn-save {
    color: white;
    background: var(--color-success);

    &:hover {
      background: var(--color-success-bg);
      color: var(--color-success);
    }
  }

  &.btn-cancel {
    color: var(--color-text-secondary);
    background: var(--color-bg-tertiary);

    &:hover {
      background: var(--color-bg-hover);
    }
  }
}

.unmatched-group {
  padding: var(--spacing-sm);

  .unmatched-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
    margin-bottom: var(--spacing-xs);
  }

  .unmatched-items {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .unmatched-item {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
    border-radius: var(--radius-sm);

    &--card {
      color: var(--color-text-primary);
      background: var(--color-bg-tertiary);
    }

    &--file {
      color: var(--color-text-secondary);
      background: var(--color-bg-secondary);
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--color-text-tertiary);

  .empty-icon {
    font-size: 48px;
    margin-bottom: var(--spacing-md);
  }

  .empty-text {
    font-size: var(--font-size-sm);
  }
}
</style>
