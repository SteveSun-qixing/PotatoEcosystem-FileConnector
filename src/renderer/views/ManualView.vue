<script setup lang="ts">
/**
 * 手动连接主视图
 * @description 整合卡片列表、文件列表、表格模式和图形模式的手动绑定界面
 */
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useManualConnect } from '@/composables/useManualConnect';
import type { ManualMode } from '@/composables/useManualConnect';
import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';
import type { BindingItem } from '@/types/binding';

// 子组件
import CardList from '@/components/card/CardList.vue';
import FileList from '@/components/file/FileList.vue';
import { TableMode, GraphMode } from '@/views/manual';

const { t } = useI18n();
const router = useRouter();

// 使用手动连接组合式函数
const {
  cards,
  files,
  bindings,
  mode,
  loading,
  error,
  selectedCards,
  boundCount,
  unboundCount,
  usedFilePaths,
  addBinding,
  removeBinding,
  updateBinding,
  clearBindings,
  validateBindings,
  setMode,
  selectCard,
  deselectCard,
  toggleCard,
  selectAllCards,
  deselectAllCards,
  addFiles,
  removeFile,
  clearFiles,
  isCardBound,
  isFileBound,
  exportConfig,
  importConfig
} = useManualConnect();

// 侧边栏折叠状态
const leftPanelCollapsed = ref(false);
const rightPanelCollapsed = ref(false);

// 对话框状态
const showPreviewDialog = ref(false);
const showConfirmDialog = ref(false);

// 验证结果
const validationResult = ref<ReturnType<typeof validateBindings> | null>(null);

/** 统计信息 */
const stats = computed(() => {
  const totalCards = cards.value.length;
  const totalFiles = files.value.length;
  const bound = boundCount.value;
  const unbound = unboundCount.value;
  const filesUsed = usedFilePaths.value.length;
  const filesUnused = totalFiles - filesUsed;

  return {
    totalCards,
    totalFiles,
    bound,
    unbound,
    filesUsed,
    filesUnused,
    boundPercent: totalCards > 0 ? Math.round((bound / totalCards) * 100) : 0
  };
});

/** 是否有绑定 */
const hasBindings = computed(() => bindings.value.some(b => !!b.filePath));

/** 是否可以执行 */
const canExecute = computed(() => {
  if (!hasBindings.value) return false;
  const result = validateBindings();
  return result.valid;
});

/** 处理模式切换 */
function handleModeChange(newMode: ManualMode) {
  setMode(newMode);
}

/** 处理绑定列表更新 */
function handleBindingsUpdate(newBindings: BindingItem[]) {
  // 清空现有绑定并重新添加
  clearBindings();
  newBindings.forEach(b => {
    if (b.filePath) {
      addBinding(b.cardId, b.filePath, b.resourceField);
    }
  });
}

/** 处理卡片选择 */
function handleCardSelect(cardId: string) {
  toggleCard(cardId);
}

/** 处理卡片全选/取消全选 */
function handleCardSelectAll(selected: boolean) {
  if (selected) {
    selectAllCards();
  } else {
    deselectAllCards();
  }
}

/** 处理文件选择 */
function handleFileSelect(filePath: string) {
  // 文件选择逻辑：如果当前有选中的卡片，则自动创建绑定
  const selectedCardIds = selectedCards.value.map(c => c.id);
  if (selectedCardIds.length === 1) {
    const cardId = selectedCardIds[0];
    if (!isCardBound(cardId)) {
      addBinding(cardId, filePath);
    } else {
      updateBinding(cardId, filePath);
    }
  }
}

/** 处理添加文件（从组件拖入） */
function handleAddFiles(fileList: File[]) {
  // 将 File 对象转换为 FileInfo
  const fileInfos: FileInfo[] = fileList.map(file => ({
    name: file.name,
    path: (file as any).path || file.name, // Electron 中 File 对象有 path 属性
    size: file.size,
    mimeType: file.type,
    type: getFileType(file.name),
    extension: getFileExtension(file.name),
    modifiedAt: new Date(file.lastModified).toISOString(),
    createdAt: new Date().toISOString()
  }));
  addFiles(fileInfos);
}

/** 处理移除文件 */
function handleRemoveFile(filePath: string) {
  removeFile(filePath);
}

/** 处理选择卡片（表格模式工具栏） */
async function handleSelectCards() {
  try {
    const folderPath = await window.electronAPI?.openFolderDialog?.({
      title: t('manual.selectCardsFolder')
    });
    if (folderPath) {
      // 加载卡片的逻辑
      console.log('Loading cards from:', folderPath);
    }
  } catch (e) {
    console.error('Failed to select cards folder:', e);
  }
}

/** 处理添加文件（工具栏按钮） */
async function handleAddFilesClick() {
  try {
    const filePaths = await window.electronAPI?.openFileDialog?.({
      title: t('manual.addFiles'),
      multiple: true
    });
    if (filePaths && filePaths.length > 0) {
      // 将路径转换为 FileInfo 对象（需要通过主进程获取文件详情）
      console.log('Adding files:', filePaths);
    }
  } catch (e) {
    console.error('Failed to add files:', e);
  }
}

/** 处理批量设置文件夹 */
async function handleBatchFolder() {
  try {
    const folderPath = await window.electronAPI?.openFolderDialog?.({
      title: t('manual.batchFolder')
    });
    if (folderPath) {
      // 批量设置文件夹的逻辑
      console.log('Batch folder:', folderPath);
    }
  } catch (e) {
    console.error('Failed to select batch folder:', e);
  }
}

/** 处理清空绑定 */
function handleClearBindings() {
  if (hasBindings.value) {
    clearBindings();
  }
}

/** 处理导入配置 */
async function handleImportConfig() {
  try {
    const filePaths = await window.electronAPI?.openFileDialog?.({
      title: t('manual.importConfig'),
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (filePaths && filePaths.length > 0) {
      // 读取并导入配置
      console.log('Importing config from:', filePaths[0]);
    }
  } catch (e) {
    console.error('Failed to import config:', e);
  }
}

/** 处理导出配置 */
function handleExportConfig() {
  const config = exportConfig();
  // 保存配置文件
  console.log('Exporting config:', config);
}

/** 处理创建连接（图形模式） */
function handleCreateConnection(cardId: string, filePath: string) {
  addBinding(cardId, filePath);
}

/** 处理删除连接（图形模式） */
function handleDeleteConnection(cardId: string) {
  removeBinding(cardId);
}

/** 处理预览 */
function handlePreview() {
  validationResult.value = validateBindings();
  showPreviewDialog.value = true;
}

/** 处理确认执行 */
function handleConfirm() {
  validationResult.value = validateBindings();
  if (validationResult.value.valid) {
    // 跳转到预览/执行页面
    router.push('/preview');
  } else {
    showConfirmDialog.value = true;
  }
}

/** 处理取消 */
function handleCancel() {
  // 返回上一页或主页
  router.push('/');
}

/** 切换左侧面板 */
function toggleLeftPanel() {
  leftPanelCollapsed.value = !leftPanelCollapsed.value;
}

/** 切换右侧面板 */
function toggleRightPanel() {
  rightPanelCollapsed.value = !rightPanelCollapsed.value;
}

/** 获取文件类型 */
function getFileType(filename: string): FileInfo['type'] {
  const ext = getFileExtension(filename).toLowerCase();
  const typeMap: Record<string, FileInfo['type']> = {
    mp4: 'video', mkv: 'video', avi: 'video', mov: 'video', webm: 'video',
    mp3: 'audio', wav: 'audio', flac: 'audio', aac: 'audio', ogg: 'audio',
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image',
    pdf: 'document', doc: 'document', docx: 'document', txt: 'document',
    srt: 'subtitle', ass: 'subtitle', vtt: 'subtitle',
    zip: 'archive', rar: 'archive', '7z': 'archive'
  };
  return typeMap[ext] || 'other';
}

/** 获取文件扩展名 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(lastDot + 1) : '';
}
</script>

<template>
  <div class="manual-view">
    <!-- 顶部标题栏 -->
    <header class="manual-view__header">
      <div class="header-left">
        <h1 class="header-title">{{ t('manual.title') }}</h1>
        <span class="header-subtitle">{{ t('manual.subtitle') }}</span>
      </div>

      <div class="header-center">
        <!-- 模式切换标签 -->
        <div class="mode-tabs">
          <button
            class="mode-tab"
            :class="{ active: mode === 'table' }"
            @click="handleModeChange('table')"
          >
            <span class="tab-icon">📊</span>
            <span class="tab-text">{{ t('manual.tableMode') }}</span>
          </button>
          <button
            class="mode-tab"
            :class="{ active: mode === 'graph' }"
            @click="handleModeChange('graph')"
          >
            <span class="tab-icon">🔗</span>
            <span class="tab-text">{{ t('manual.graphMode') }}</span>
          </button>
        </div>
      </div>

      <div class="header-right">
        <!-- 操作按钮 -->
        <button
          class="header-btn header-btn--secondary"
          @click="handlePreview"
          :disabled="!hasBindings"
        >
          <span class="btn-icon">👁️</span>
          <span class="btn-text">{{ t('common.preview') }}</span>
        </button>
        <button
          class="header-btn header-btn--primary"
          @click="handleConfirm"
          :disabled="!hasBindings"
        >
          <span class="btn-icon">✓</span>
          <span class="btn-text">{{ t('common.confirm') }}</span>
        </button>
        <button
          class="header-btn"
          @click="handleCancel"
        >
          <span class="btn-text">{{ t('common.cancel') }}</span>
        </button>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="manual-view__main">
      <!-- 左侧面板 - 卡片列表 -->
      <aside
        class="manual-view__panel manual-view__panel--left"
        :class="{ collapsed: leftPanelCollapsed }"
      >
        <div class="panel-header">
          <h2 class="panel-title">
            <span class="title-icon">📋</span>
            {{ t('manual.cardList') }}
            <span class="title-count">({{ stats.totalCards }})</span>
          </h2>
          <button class="panel-toggle" @click="toggleLeftPanel">
            {{ leftPanelCollapsed ? '▶' : '◀' }}
          </button>
        </div>
        <div v-if="!leftPanelCollapsed" class="panel-content">
          <CardList
            :cards="cards"
            :selected-ids="selectedCards.map(c => c.id)"
            :bindings="bindings"
            :show-status="true"
            @select="handleCardSelect"
            @select-all="handleCardSelectAll"
          />
        </div>
      </aside>

      <!-- 中央工作区 -->
      <section class="manual-view__workspace">
        <!-- 表格模式 -->
        <TableMode
          v-if="mode === 'table'"
          :cards="cards"
          :files="files"
          :bindings="bindings"
          @update:bindings="handleBindingsUpdate"
          @select-cards="handleSelectCards"
          @add-files="handleAddFilesClick"
          @batch-folder="handleBatchFolder"
          @clear-bindings="handleClearBindings"
          @import-config="handleImportConfig"
          @export-config="handleExportConfig"
        />

        <!-- 图形模式 -->
        <GraphMode
          v-if="mode === 'graph'"
          :cards="cards"
          :files="files"
          :bindings="bindings"
          @update:bindings="handleBindingsUpdate"
          @add-files="handleAddFilesClick"
          @create-connection="handleCreateConnection"
          @delete-connection="handleDeleteConnection"
        />
      </section>

      <!-- 右侧面板 - 文件列表 -->
      <aside
        class="manual-view__panel manual-view__panel--right"
        :class="{ collapsed: rightPanelCollapsed }"
      >
        <div class="panel-header">
          <button class="panel-toggle" @click="toggleRightPanel">
            {{ rightPanelCollapsed ? '◀' : '▶' }}
          </button>
          <h2 class="panel-title">
            <span class="title-icon">📁</span>
            {{ t('manual.fileList') }}
            <span class="title-count">({{ stats.totalFiles }})</span>
          </h2>
        </div>
        <div v-if="!rightPanelCollapsed" class="panel-content">
          <FileList
            :files="files"
            :selected-paths="[]"
            :used-paths="usedFilePaths"
            @select="handleFileSelect"
            @add-files="handleAddFiles"
            @remove-file="handleRemoveFile"
          />
        </div>
      </aside>
    </main>

    <!-- 底部状态栏 -->
    <footer class="manual-view__footer">
      <div class="footer-left">
        <div class="status-item">
          <span class="status-icon">📋</span>
          <span class="status-label">{{ t('status.cards') }}:</span>
          <span class="status-value">{{ stats.totalCards }}</span>
        </div>
        <div class="status-divider">|</div>
        <div class="status-item status-item--success">
          <span class="status-label">{{ t('binding.bound') }}:</span>
          <span class="status-value">{{ stats.bound }}</span>
        </div>
        <div class="status-divider">|</div>
        <div class="status-item status-item--muted">
          <span class="status-label">{{ t('binding.unbound') }}:</span>
          <span class="status-value">{{ stats.unbound }}</span>
        </div>
      </div>

      <div class="footer-center">
        <!-- 进度条 -->
        <div class="progress-container">
          <div class="progress-bar">
            <div
              class="progress-bar__fill"
              :style="{ width: `${stats.boundPercent}%` }"
            ></div>
          </div>
          <span class="progress-text">{{ stats.boundPercent }}%</span>
        </div>
      </div>

      <div class="footer-right">
        <div class="status-item">
          <span class="status-icon">📁</span>
          <span class="status-label">{{ t('status.files') }}:</span>
          <span class="status-value">{{ stats.totalFiles }}</span>
        </div>
        <div class="status-divider">|</div>
        <div class="status-item status-item--success">
          <span class="status-label">{{ t('file.status.used') }}:</span>
          <span class="status-value">{{ stats.filesUsed }}</span>
        </div>
        <div class="status-divider">|</div>
        <div class="status-item status-item--muted">
          <span class="status-label">{{ t('file.status.unused') }}:</span>
          <span class="status-value">{{ stats.filesUnused }}</span>
        </div>
      </div>
    </footer>

    <!-- 加载遮罩 -->
    <div v-if="loading" class="manual-view__loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">{{ t('common.loading') }}</div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="manual-view__error">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ error }}</span>
      <button class="error-close" @click="error = null">×</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.manual-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg-secondary);
  overflow: hidden;

  // 顶部标题栏
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-lg);
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--color-bg-primary);
    border-bottom: 1px solid var(--color-border);
    min-height: 56px;
  }

  // 主内容区
  &__main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  // 侧边面板
  &__panel {
    display: flex;
    flex-direction: column;
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-light);
    transition: width var(--transition-normal);

    &--left {
      width: 280px;
      min-width: 280px;
      border-right: none;
      margin: var(--spacing-md);
      margin-right: 0;
      border-radius: var(--radius-md);

      &.collapsed {
        width: 44px;
        min-width: 44px;
      }
    }

    &--right {
      width: 280px;
      min-width: 280px;
      border-left: none;
      margin: var(--spacing-md);
      margin-left: 0;
      border-radius: var(--radius-md);

      &.collapsed {
        width: 44px;
        min-width: 44px;
      }
    }
  }

  // 工作区
  &__workspace {
    flex: 1;
    margin: var(--spacing-md);
    overflow: hidden;
  }

  // 底部状态栏
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-lg);
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--color-bg-primary);
    border-top: 1px solid var(--color-border);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  // 加载遮罩
  &__loading {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
  }

  // 错误提示
  &__error {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-error-bg);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    color: var(--color-error);
    z-index: 100;
  }
}

// 头部样式
.header-left {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-sm);
}

.header-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.header-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.header-center {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

// 模式切换标签
.mode-tabs {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
  }

  &.active {
    color: var(--color-primary);
    background: var(--color-bg-primary);
    font-weight: 500;
    box-shadow: var(--shadow-sm);
  }

  .tab-icon {
    font-size: 16px;
  }
}

// 头部按钮
.header-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover:not(:disabled) {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &--primary {
    color: white;
    background: var(--color-primary);
    border-color: var(--color-primary);

    &:hover:not(:disabled) {
      background: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
    }
  }

  &--secondary {
    color: var(--color-primary);
    border-color: var(--color-primary);
    background: var(--color-primary-bg);

    &:hover:not(:disabled) {
      color: white;
      background: var(--color-primary);
    }
  }

  .btn-icon {
    font-size: 14px;
  }
}

// 面板样式
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border-light);
  min-height: 44px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
}

.title-icon {
  font-size: 16px;
}

.title-count {
  color: var(--color-text-tertiary);
  font-weight: 400;
}

.panel-toggle {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--color-text-tertiary);
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
  }
}

.panel-content {
  flex: 1;
  overflow: hidden;
}

// 折叠状态下的面板
.manual-view__panel.collapsed {
  .panel-header {
    flex-direction: column;
    justify-content: flex-start;
    padding: var(--spacing-sm);
  }

  .panel-title {
    writing-mode: vertical-lr;
    transform: rotate(180deg);
    margin-top: var(--spacing-sm);
  }

  .title-count {
    display: none;
  }

  &.manual-view__panel--right {
    .panel-header {
      flex-direction: column-reverse;
    }

    .panel-title {
      transform: rotate(0deg);
    }
  }
}

// 底部状态栏样式
.footer-left,
.footer-center,
.footer-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;

  &--success {
    color: var(--color-success);
  }

  &--muted {
    color: var(--color-text-tertiary);
  }
}

.status-icon {
  font-size: 12px;
}

.status-label {
  color: var(--color-text-tertiary);
}

.status-value {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.status-divider {
  color: var(--color-border);
}

// 进度条
.progress-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.progress-bar {
  width: 120px;
  height: 6px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;

  &__fill {
    height: 100%;
    background: var(--color-success);
    border-radius: var(--radius-full);
    transition: width var(--transition-normal);
  }
}

.progress-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  min-width: 36px;
  text-align: right;
}

// 加载动画
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-bg-tertiary);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  margin-top: var(--spacing-md);
  color: white;
  font-size: var(--font-size-sm);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// 错误提示样式
.error-icon {
  font-size: 16px;
}

.error-text {
  font-size: var(--font-size-sm);
}

.error-close {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--color-error);
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  margin-left: var(--spacing-sm);

  &:hover {
    background: rgba(255, 77, 79, 0.2);
  }
}
</style>
