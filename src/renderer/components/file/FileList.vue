<script setup lang="ts">
/**
 * 文件列表组件
 * @description 展示文件列表，支持虚拟滚动、文件拖入、搜索筛选、排序和统计信息
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FileInfo, FileType } from '@/types/file';
import { formatSize } from '@/utils/file';
import FileItem from './FileItem.vue';

/** 排序类型 */
type SortType = 'name' | 'size' | 'date' | 'type';

/** 排序顺序 */
type SortOrder = 'asc' | 'desc';

/** 筛选类型 */
type FilterType = 'all' | 'used' | 'unused';

const props = withDefaults(
  defineProps<{
    /** 文件列表 */
    files: FileInfo[];
    /** 选中的文件路径列表 */
    selectedPaths: string[];
    /** 已使用的文件路径列表（已绑定） */
    usedPaths: string[];
  }>(),
  {
    files: () => [],
    selectedPaths: () => [],
    usedPaths: () => []
  }
);

const emit = defineEmits<{
  /** 选择文件 */
  select: [filePath: string];
  /** 添加文件 */
  'add-files': [files: File[]];
  /** 移除文件 */
  'remove-file': [filePath: string];
}>();

const { t } = useI18n();

// 排序和筛选状态
const sortType = ref<SortType>('name');
const sortOrder = ref<SortOrder>('asc');
const filterType = ref<FilterType>('all');
const typeFilter = ref<FileType | 'all'>('all');
const searchQuery = ref('');

// 拖拽状态
const isDragging = ref(false);

// 虚拟滚动相关
const containerRef = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const containerHeight = ref(0);
const itemHeight = 60; // 每个文件项的固定高度
const bufferCount = 5; // 缓冲区数量

/** 可用的文件类型 */
const availableTypes = computed(() => {
  const types = new Set<FileType>();
  props.files.forEach((f) => types.add(f.type));
  return Array.from(types);
});

/** 检查文件是否已使用 */
function isUsed(filePath: string): boolean {
  return props.usedPaths.includes(filePath);
}

/** 检查文件是否选中 */
function isSelected(filePath: string): boolean {
  return props.selectedPaths.includes(filePath);
}

/** 筛选后的文件列表 */
const filteredFiles = computed(() => {
  let result = [...props.files];

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter((file) =>
      file.name.toLowerCase().includes(query)
    );
  }

  // 使用状态筛选
  if (filterType.value === 'used') {
    result = result.filter((file) => isUsed(file.path));
  } else if (filterType.value === 'unused') {
    result = result.filter((file) => !isUsed(file.path));
  }

  // 类型筛选
  if (typeFilter.value !== 'all') {
    result = result.filter((file) => file.type === typeFilter.value);
  }

  return result;
});

/** 排序后的文件列表 */
const sortedFiles = computed(() => {
  const result = [...filteredFiles.value];

  result.sort((a, b) => {
    let comparison = 0;

    switch (sortType.value) {
      case 'name':
        comparison = a.name.localeCompare(b.name, 'zh-CN');
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'date':
        comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
    }

    return sortOrder.value === 'asc' ? comparison : -comparison;
  });

  return result;
});

/** 虚拟滚动 - 可见范围 */
const visibleRange = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / itemHeight) - bufferCount);
  const visibleCount = Math.ceil(containerHeight.value / itemHeight);
  const end = Math.min(sortedFiles.value.length, start + visibleCount + bufferCount * 2);
  return { start, end };
});

/** 虚拟滚动 - 可见文件 */
const visibleFiles = computed(() => {
  return sortedFiles.value.slice(visibleRange.value.start, visibleRange.value.end);
});

/** 虚拟滚动 - 总高度 */
const totalHeight = computed(() => {
  return sortedFiles.value.length * itemHeight;
});

/** 虚拟滚动 - 顶部偏移 */
const offsetTop = computed(() => {
  return visibleRange.value.start * itemHeight;
});

/** 统计信息 */
const stats = computed(() => {
  const total = props.files.length;
  const filtered = filteredFiles.value.length;
  const selected = props.selectedPaths.length;
  const used = props.usedPaths.length;
  const totalSize = props.files.reduce((sum, f) => sum + f.size, 0);
  return { total, filtered, selected, used, totalSize };
});

/** 处理滚动 */
function handleScroll(event: Event) {
  const target = event.target as HTMLElement;
  scrollTop.value = target.scrollTop;
}

/** 处理文件点击 */
function handleFileClick(filePath: string) {
  emit('select', filePath);
}

/** 处理文件移除 */
function handleFileRemove(filePath: string) {
  emit('remove-file', filePath);
}

/** 切换排序 */
function toggleSort(type: SortType) {
  if (sortType.value === type) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortType.value = type;
    sortOrder.value = 'asc';
  }
}

/** 设置筛选 */
function setFilter(type: FilterType) {
  filterType.value = type;
}

/** 设置类型筛选 */
function setTypeFilter(type: FileType | 'all') {
  typeFilter.value = type;
}

/** 清空搜索 */
function clearSearch() {
  searchQuery.value = '';
}

/** 拖拽进入 */
function handleDragEnter(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

/** 拖拽经过 */
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

/** 拖拽离开 */
function handleDragLeave(event: DragEvent) {
  // 检查是否离开了容器区域
  const rect = containerRef.value?.getBoundingClientRect();
  if (rect) {
    const { clientX, clientY } = event;
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      isDragging.value = false;
    }
  }
}

/** 拖拽放下 */
function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    emit('add-files', Array.from(files));
  }
}

// 监听容器大小变化
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight;

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight.value = entry.contentRect.height;
      }
    });
    resizeObserver.observe(containerRef.value);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

// 当文件列表变化时重置滚动位置
watch(
  () => props.files.length,
  () => {
    if (containerRef.value) {
      containerRef.value.scrollTop = 0;
      scrollTop.value = 0;
    }
  }
);
</script>

<template>
  <div
    class="file-list"
    :class="{ 'file-list--dragging': isDragging }"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- 工具栏 -->
    <div class="file-list__toolbar">
      <!-- 搜索框 -->
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="t('common.search')"
        />
        <button
          v-if="searchQuery"
          class="search-clear"
          @click="clearSearch"
          :title="t('common.clear')"
        >
          ×
        </button>
      </div>

      <!-- 状态筛选按钮组 -->
      <div class="filter-group">
        <button
          class="filter-btn"
          :class="{ active: filterType === 'all' }"
          @click="setFilter('all')"
        >
          {{ t('file.filter.all') }}
        </button>
        <button
          class="filter-btn"
          :class="{ active: filterType === 'used' }"
          @click="setFilter('used')"
        >
          {{ t('file.status.used') }}
        </button>
        <button
          class="filter-btn"
          :class="{ active: filterType === 'unused' }"
          @click="setFilter('unused')"
        >
          {{ t('file.status.unused') }}
        </button>
      </div>

      <!-- 类型筛选 -->
      <div v-if="availableTypes.length > 1" class="type-filter">
        <select v-model="typeFilter" class="type-select">
          <option value="all">{{ t('file.filter.allTypes') }}</option>
          <option v-for="type in availableTypes" :key="type" :value="type">
            {{ t(`file.type.${type}`) }}
          </option>
        </select>
      </div>
    </div>

    <!-- 排序栏 -->
    <div class="file-list__sort-bar">
      <div class="sort-group">
        <button
          class="sort-btn"
          :class="{ active: sortType === 'name' }"
          @click="toggleSort('name')"
        >
          {{ t('file.sort.name') }}
          <span v-if="sortType === 'name'" class="sort-indicator">
            {{ sortOrder === 'asc' ? '↑' : '↓' }}
          </span>
        </button>
        <button
          class="sort-btn"
          :class="{ active: sortType === 'size' }"
          @click="toggleSort('size')"
        >
          {{ t('file.sort.size') }}
          <span v-if="sortType === 'size'" class="sort-indicator">
            {{ sortOrder === 'asc' ? '↑' : '↓' }}
          </span>
        </button>
        <button
          class="sort-btn"
          :class="{ active: sortType === 'date' }"
          @click="toggleSort('date')"
        >
          {{ t('file.sort.date') }}
          <span v-if="sortType === 'date'" class="sort-indicator">
            {{ sortOrder === 'asc' ? '↑' : '↓' }}
          </span>
        </button>
        <button
          class="sort-btn"
          :class="{ active: sortType === 'type' }"
          @click="toggleSort('type')"
        >
          {{ t('file.sort.type') }}
          <span v-if="sortType === 'type'" class="sort-indicator">
            {{ sortOrder === 'asc' ? '↑' : '↓' }}
          </span>
        </button>
      </div>

      <!-- 统计信息 -->
      <div class="stats">
        <span class="stat-item">
          {{ t('file.stats.count', { count: stats.filtered, total: stats.total }) }}
        </span>
        <span class="stat-divider">|</span>
        <span class="stat-item">
          {{ t('file.stats.size', { size: formatSize(stats.totalSize) }) }}
        </span>
        <span class="stat-divider">|</span>
        <span class="stat-item">
          {{ t('file.stats.used', { count: stats.used }) }}
        </span>
      </div>
    </div>

    <!-- 文件列表（虚拟滚动） -->
    <div
      ref="containerRef"
      class="file-list__container"
      @scroll="handleScroll"
    >
      <div
        class="file-list__scroll-content"
        :style="{ height: `${totalHeight}px` }"
      >
        <div
          class="file-list__visible-area"
          :style="{ transform: `translateY(${offsetTop}px)` }"
        >
          <FileItem
            v-for="file in visibleFiles"
            :key="file.path"
            :file="file"
            :selected="isSelected(file.path)"
            :used="isUsed(file.path)"
            class="file-list__item"
            @click="handleFileClick(file.path)"
            @remove="handleFileRemove(file.path)"
          />
        </div>
      </div>

      <!-- 拖拽覆盖层 -->
      <div v-if="isDragging" class="file-list__drop-overlay">
        <div class="drop-content">
          <div class="drop-icon">📂</div>
          <div class="drop-text">{{ t('file.dropHint') }}</div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="sortedFiles.length === 0 && !isDragging" class="file-list__empty">
        <div class="empty-icon">📁</div>
        <div class="empty-text">
          {{ searchQuery || typeFilter !== 'all' || filterType !== 'all'
            ? t('file.empty.noMatch')
            : t('file.empty.noFiles')
          }}
        </div>
        <div class="empty-hint">{{ t('file.empty.hint') }}</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.file-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  position: relative;

  &--dragging {
    border-color: var(--color-primary);
    border-style: dashed;
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-light);
    flex-wrap: wrap;
  }

  &__sort-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-xs) var(--spacing-md);
    background: var(--color-bg-tertiary);
    border-bottom: 1px solid var(--color-border-light);
  }

  &__container {
    flex: 1;
    overflow-y: auto;
    position: relative;
  }

  &__scroll-content {
    position: relative;
  }

  &__visible-area {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
  }

  &__item {
    height: 60px;
    margin: 0 var(--spacing-sm);

    &:first-child {
      margin-top: var(--spacing-sm);
    }

    &:not(:last-child) {
      margin-bottom: var(--spacing-xs);
    }
  }

  &__drop-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--color-primary-rgb, 24, 144, 255), 0.1);
    backdrop-filter: blur(2px);
    z-index: 10;

    .drop-content {
      text-align: center;
    }

    .drop-icon {
      font-size: 48px;
      margin-bottom: var(--spacing-md);
    }

    .drop-text {
      font-size: var(--font-size-md);
      font-weight: 500;
      color: var(--color-primary);
    }
  }

  &__empty {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: var(--color-text-tertiary);

    .empty-icon {
      font-size: 48px;
      margin-bottom: var(--spacing-md);
    }

    .empty-text {
      font-size: var(--font-size-sm);
      margin-bottom: var(--spacing-sm);
    }

    .empty-hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-disabled);
    }
  }
}

// 搜索框
.search-box {
  position: relative;
  flex: 1;
  min-width: 150px;
  max-width: 250px;

  .search-input {
    width: 100%;
    padding: 6px 28px 6px 12px;
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);

    &:focus {
      border-color: var(--color-primary);
      outline: none;
    }

    &::placeholder {
      color: var(--color-text-tertiary);
    }
  }

  .search-clear {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: var(--color-text-tertiary);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      color: var(--color-text-primary);
      background: var(--color-bg-tertiary);
    }
  }
}

// 筛选按钮组
.filter-group,
.sort-group {
  display: flex;
  gap: 2px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 2px;
}

.filter-btn,
.sort-btn {
  padding: 4px 12px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: transparent;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);

  &:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
  }

  &.active {
    color: var(--color-primary);
    background: var(--color-bg-primary);
    font-weight: 500;
  }
}

.sort-indicator {
  margin-left: 2px;
}

// 类型筛选
.type-filter {
  .type-select {
    padding: 4px 8px;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;

    &:focus {
      border-color: var(--color-primary);
      outline: none;
    }
  }
}

// 统计信息
.stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.stat-divider {
  color: var(--color-border);
}
</style>
