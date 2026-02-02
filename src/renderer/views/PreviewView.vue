<script setup lang="ts">
/**
 * 预览视图
 * @description 执行前预览所有绑定
 */
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useConnectorStore } from '@/stores/connector';
import { useCardsStore } from '@/stores/cards';
import { useFilesStore } from '@/stores/files';
import type { BindingItem, BindingDetail } from '@/types/binding';

const router = useRouter();
const { t } = useI18n();
const connectorStore = useConnectorStore();
const cardsStore = useCardsStore();
const filesStore = useFilesStore();

/**
 * 绑定状态类型
 */
type BindingChangeType = 'add' | 'modify' | 'delete';

/**
 * 带状态的绑定详情
 */
interface PreviewBindingItem extends BindingDetail {
  changeType: BindingChangeType;
}

/**
 * 搜索关键词
 */
const searchKeyword = ref('');

/**
 * 当前编辑的绑定索引
 */
const editingIndex = ref<number | null>(null);

/**
 * 是否显示删除确认对话框
 */
const showDeleteConfirm = ref(false);
const deleteTargetIndex = ref<number | null>(null);

/**
 * 获取绑定列表带详情
 */
const bindingsWithDetails = computed<PreviewBindingItem[]>(() => {
  return connectorStore.bindings.map(binding => {
    const card = cardsStore.getCardById(binding.cardId);
    const file = filesStore.getFileByPath(binding.filePath);
    
    // 判断变更类型
    let changeType: BindingChangeType = 'add';
    if (card) {
      const existingBinding = getExistingBinding(card.id, binding.resourceField);
      if (existingBinding) {
        if (existingBinding !== binding.filePath) {
          changeType = 'modify';
        } else {
          changeType = 'add'; // 相同路径视为新增确认
        }
      }
    }

    return {
      ...binding,
      cardName: card?.name || binding.cardId,
      fileName: file?.name || getFileName(binding.filePath),
      fileSize: file?.size || 0,
      isNew: changeType === 'add',
      previousPath: changeType === 'modify' ? getExistingBinding(binding.cardId, binding.resourceField) : undefined,
      changeType
    };
  });
});

/**
 * 过滤后的绑定列表
 */
const filteredBindings = computed(() => {
  if (!searchKeyword.value) {
    return bindingsWithDetails.value;
  }
  
  const keyword = searchKeyword.value.toLowerCase();
  return bindingsWithDetails.value.filter(binding => 
    binding.cardName.toLowerCase().includes(keyword) ||
    binding.fileName.toLowerCase().includes(keyword)
  );
});

/**
 * 统计信息
 */
const statistics = computed(() => {
  const bindings = bindingsWithDetails.value;
  return {
    total: bindings.length,
    add: bindings.filter(b => b.changeType === 'add').length,
    modify: bindings.filter(b => b.changeType === 'modify').length,
    delete: bindings.filter(b => b.changeType === 'delete').length,
    totalSize: bindings.reduce((sum, b) => sum + b.fileSize, 0)
  };
});

/**
 * 获取现有绑定
 */
function getExistingBinding(cardId: string, resourceField: string): string | undefined {
  const card = cardsStore.getCardById(cardId);
  if (!card || !card.baseCards || card.baseCards.length === 0) {
    return undefined;
  }
  
  for (const baseCard of card.baseCards) {
    const field = baseCard.resourceFields.find(f => f.name === resourceField);
    if (field?.value) {
      return field.value;
    }
  }
  
  return undefined;
}

/**
 * 获取文件名
 */
function getFileName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1];
}

/**
 * 格式化文件大小
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '-';
  
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
 * 获取状态图标
 */
function getStatusIcon(type: BindingChangeType): string {
  switch (type) {
    case 'add':
      return '🟢';
    case 'modify':
      return '🟡';
    case 'delete':
      return '🔴';
    default:
      return '';
  }
}

/**
 * 获取状态文本
 */
function getStatusText(type: BindingChangeType): string {
  switch (type) {
    case 'add':
      return t('binding.new');
    case 'modify':
      return t('binding.modified');
    case 'delete':
      return t('binding.deleted');
    default:
      return '';
  }
}

/**
 * 编辑绑定
 */
function editBinding(index: number): void {
  editingIndex.value = index;
  // 可以打开编辑对话框或跳转到手动模式
}

/**
 * 删除绑定
 */
function removeBinding(index: number): void {
  deleteTargetIndex.value = index;
  showDeleteConfirm.value = true;
}

/**
 * 确认删除
 */
function confirmDelete(): void {
  if (deleteTargetIndex.value !== null) {
    const binding = filteredBindings.value[deleteTargetIndex.value];
    connectorStore.removeBinding(binding.cardId);
  }
  showDeleteConfirm.value = false;
  deleteTargetIndex.value = null;
}

/**
 * 取消删除
 */
function cancelDelete(): void {
  showDeleteConfirm.value = false;
  deleteTargetIndex.value = null;
}

/**
 * 撤销删除标记
 */
function undoDelete(index: number): void {
  // 恢复删除标记的绑定
  const binding = filteredBindings.value[index];
  // 这里可以实现恢复逻辑
}

/**
 * 返回修改
 */
function goBack(): void {
  router.back();
}

/**
 * 确认执行
 */
function confirmExecute(): void {
  router.push('/execute');
}
</script>

<template>
  <div class="preview-view">
    <!-- 标题栏 -->
    <div class="preview-header">
      <h2>{{ t('binding.preview') }}</h2>
      <div class="header-actions">
        <input 
          v-model="searchKeyword"
          type="text"
          class="search-input"
          :placeholder="t('common.search')"
        />
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="statistics-bar">
      <div class="stat-item">
        <span class="stat-icon">🟢</span>
        <span class="stat-label">{{ t('binding.new') }}:</span>
        <span class="stat-value">{{ statistics.add }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🟡</span>
        <span class="stat-label">{{ t('binding.modified') }}:</span>
        <span class="stat-value">{{ statistics.modify }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🔴</span>
        <span class="stat-label">{{ t('binding.deleted') }}:</span>
        <span class="stat-value">{{ statistics.delete }}</span>
      </div>
      <div class="stat-item stat-total">
        <span class="stat-label">总计:</span>
        <span class="stat-value">{{ statistics.total }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">总大小:</span>
        <span class="stat-value">{{ formatSize(statistics.totalSize) }}</span>
      </div>
    </div>

    <!-- 绑定列表 -->
    <div class="binding-list">
      <table class="binding-table">
        <thead>
          <tr>
            <th class="col-status">状态</th>
            <th class="col-card">卡片名称</th>
            <th class="col-file">绑定文件</th>
            <th class="col-size">文件大小</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(binding, index) in filteredBindings" 
            :key="`${binding.cardId}-${index}`"
            :class="{ 
              'row-add': binding.changeType === 'add',
              'row-modify': binding.changeType === 'modify',
              'row-delete': binding.changeType === 'delete'
            }"
          >
            <td class="col-status">
              <span class="status-badge" :class="`status-${binding.changeType}`">
                {{ getStatusIcon(binding.changeType) }} {{ getStatusText(binding.changeType) }}
              </span>
            </td>
            <td class="col-card">
              <span class="card-name">{{ binding.cardName }}</span>
              <span class="resource-field">{{ binding.resourceField }}</span>
            </td>
            <td class="col-file">
              <span class="file-name">{{ binding.fileName }}</span>
              <span class="file-path" :title="binding.filePath">{{ binding.filePath }}</span>
              <template v-if="binding.previousPath">
                <span class="previous-path">
                  原: {{ getFileName(binding.previousPath) }}
                </span>
              </template>
            </td>
            <td class="col-size">
              {{ formatSize(binding.fileSize) }}
            </td>
            <td class="col-actions">
              <template v-if="binding.changeType === 'delete'">
                <button class="btn-action btn-undo" @click="undoDelete(index)">
                  撤销
                </button>
              </template>
              <template v-else>
                <button class="btn-action btn-edit" @click="editBinding(index)">
                  {{ t('common.edit') }}
                </button>
                <button class="btn-action btn-remove" @click="removeBinding(index)">
                  {{ t('common.remove') }}
                </button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- 空状态 -->
      <div v-if="filteredBindings.length === 0" class="empty-state">
        <p v-if="searchKeyword">没有匹配的绑定</p>
        <p v-else>暂无绑定数据</p>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="preview-footer">
      <button class="btn btn-secondary" @click="goBack">
        {{ t('common.back') }}
      </button>
      <button 
        class="btn btn-primary" 
        @click="confirmExecute"
        :disabled="statistics.total === 0"
      >
        {{ t('common.confirm') }}执行
      </button>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteConfirm" class="modal-overlay">
      <div class="modal-dialog">
        <h3>确认删除</h3>
        <p>确定要移除此绑定吗？</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="cancelDelete">
            {{ t('common.cancel') }}
          </button>
          <button class="btn btn-danger" @click="confirmDelete">
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.preview-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--spacing-md);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);

  h2 {
    margin: 0;
    font-size: var(--font-size-lg);
  }

  .search-input {
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    width: 200px;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }
}

.statistics-bar {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);

  .stat-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);

    .stat-icon {
      font-size: var(--font-size-xs);
    }

    .stat-label {
      color: var(--color-text-secondary);
    }

    .stat-value {
      font-weight: 600;
      color: var(--color-text-primary);
    }

    &.stat-total {
      margin-left: auto;
      padding-left: var(--spacing-lg);
      border-left: 1px solid var(--color-border);
    }
  }
}

.binding-list {
  flex: 1;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.binding-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);

  th, td {
    padding: var(--spacing-sm) var(--spacing-md);
    text-align: left;
    border-bottom: 1px solid var(--color-border-light);
  }

  th {
    background: var(--color-bg-secondary);
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  tr:hover {
    background: var(--color-bg-hover);
  }

  .col-status {
    width: 100px;
  }

  .col-card {
    width: 200px;
  }

  .col-file {
    min-width: 250px;
  }

  .col-size {
    width: 100px;
    text-align: right;
  }

  .col-actions {
    width: 120px;
    text-align: center;
  }
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);

  &.status-add {
    background: var(--color-success-bg);
    color: var(--color-success);
  }

  &.status-modify {
    background: var(--color-warning-bg);
    color: var(--color-warning);
  }

  &.status-delete {
    background: var(--color-error-bg);
    color: var(--color-error);
  }
}

.card-name {
  display: block;
  font-weight: 500;
}

.resource-field {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.file-name {
  display: block;
  font-weight: 500;
}

.file-path {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.previous-path {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-decoration: line-through;
}

.btn-action {
  padding: 4px 8px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-fast);

  &.btn-edit {
    background: var(--color-primary-bg);
    color: var(--color-primary);

    &:hover {
      background: var(--color-primary);
      color: white;
    }
  }

  &.btn-remove {
    background: var(--color-error-bg);
    color: var(--color-error);
    margin-left: var(--spacing-xs);

    &:hover {
      background: var(--color-error);
      color: white;
    }
  }

  &.btn-undo {
    background: var(--color-warning-bg);
    color: var(--color-warning);

    &:hover {
      background: var(--color-warning);
      color: white;
    }
  }
}

.row-delete {
  opacity: 0.6;
  text-decoration: line-through;
}

.empty-state {
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--color-text-tertiary);
}

.preview-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  margin-top: var(--spacing-md);
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

  &.btn-danger {
    background: var(--color-error);
    color: white;

    &:hover {
      opacity: 0.9;
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
  min-width: 300px;

  h3 {
    margin: 0 0 var(--spacing-md);
  }

  p {
    margin: 0 0 var(--spacing-lg);
    color: var(--color-text-secondary);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-sm);
  }
}
</style>
