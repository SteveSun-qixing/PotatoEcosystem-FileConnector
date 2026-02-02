<script setup lang="ts">
/**
 * 绑定表格组件
 * @description 展示所有卡片的绑定关系，支持批量选择、排序、筛选和虚拟滚动
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CardInfo } from '@/types/card';
import type { BindingItem } from '@/types/binding';
import type { FileInfo } from '@/types/file';
import BindingRow from './BindingRow.vue';

/** 排序类型 */
type SortType = 'name' | 'status';

/** 排序顺序 */
type SortOrder = 'asc' | 'desc';

/** 筛选类型 */
type FilterType = 'all' | 'bound' | 'unbound';

const props = withDefaults(
  defineProps<{
    /** 卡片列表 */
    cards: CardInfo[];
    /** 绑定列表 */
    bindings: BindingItem[];
    /** 文件列表 */
    files: FileInfo[];
    /** 是否只读 */
    readonly?: boolean;
  }>(),
  {
    readonly: false
  }
);

const emit = defineEmits<{
  /** 更新绑定列表 */
  'update:bindings': [bindings: BindingItem[]];
  /** 选择文件事件 */
  'select-file': [cardId: string];
  /** 删除绑定事件 */
  'remove-binding': [cardId: string];
}>();

const { t } = useI18n();

// 排序和筛选状态
const sortType = ref<SortType>('name');
const sortOrder = ref<SortOrder>('asc');
const filterType = ref<FilterType>('all');
const searchQuery = ref('');

// 选中的卡片ID集合
const selectedCardIds = ref<Set<string>>(new Set());

// 虚拟滚动相关
const containerRef = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const containerHeight = ref(0);
const itemHeight = 72; // 每个绑定行的固定高度
const bufferCount = 5; // 缓冲区数量

/** 绑定映射表（cardId -> BindingItem） */
const bindingMap = computed(() => {
  const map = new Map<string, BindingItem>();
  for (const binding of props.bindings) {
    map.set(binding.cardId, binding);
  }
  return map;
});

/** 检查卡片是否已绑定 */
function isBound(cardId: string): boolean {
  const binding = bindingMap.value.get(cardId);
  return !!binding?.filePath;
}

/** 获取卡片的绑定项 */
function getBinding(cardId: string): BindingItem | undefined {
  return bindingMap.value.get(cardId);
}

/** 筛选后的卡片列表 */
const filteredCards = computed(() => {
  let result = [...props.cards];

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (card) =>
        card.name.toLowerCase().includes(query) ||
        card.description?.toLowerCase().includes(query)
    );
  }

  // 状态筛选
  if (filterType.value === 'bound') {
    result = result.filter((card) => isBound(card.id));
  } else if (filterType.value === 'unbound') {
    result = result.filter((card) => !isBound(card.id));
  }

  return result;
});

/** 排序后的卡片列表 */
const sortedCards = computed(() => {
  const result = [...filteredCards.value];

  result.sort((a, b) => {
    let comparison = 0;

    if (sortType.value === 'name') {
      comparison = a.name.localeCompare(b.name, 'zh-CN');
    } else if (sortType.value === 'status') {
      const aBound = isBound(a.id) ? 1 : 0;
      const bBound = isBound(b.id) ? 1 : 0;
      comparison = aBound - bBound;
    }

    return sortOrder.value === 'asc' ? comparison : -comparison;
  });

  return result;
});

/** 虚拟滚动 - 可见范围 */
const visibleRange = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / itemHeight) - bufferCount);
  const visibleCount = Math.ceil(containerHeight.value / itemHeight);
  const end = Math.min(sortedCards.value.length, start + visibleCount + bufferCount * 2);
  return { start, end };
});

/** 虚拟滚动 - 可见卡片 */
const visibleCards = computed(() => {
  return sortedCards.value.slice(visibleRange.value.start, visibleRange.value.end);
});

/** 虚拟滚动 - 总高度 */
const totalHeight = computed(() => {
  return sortedCards.value.length * itemHeight;
});

/** 虚拟滚动 - 顶部偏移 */
const offsetTop = computed(() => {
  return visibleRange.value.start * itemHeight;
});

/** 是否全选 */
const isAllSelected = computed(() => {
  if (filteredCards.value.length === 0) return false;
  return filteredCards.value.every((card) => selectedCardIds.value.has(card.id));
});

/** 是否部分选中 */
const isPartialSelected = computed(() => {
  if (filteredCards.value.length === 0) return false;
  const selectedCount = filteredCards.value.filter((card) =>
    selectedCardIds.value.has(card.id)
  ).length;
  return selectedCount > 0 && selectedCount < filteredCards.value.length;
});

/** 统计信息 */
const stats = computed(() => {
  const total = props.cards.length;
  const filtered = filteredCards.value.length;
  const selected = selectedCardIds.value.size;
  const bound = props.bindings.filter((b) => !!b.filePath).length;
  const unbound = total - bound;
  return { total, filtered, selected, bound, unbound };
});

/** 处理滚动 */
function handleScroll(event: Event) {
  const target = event.target as HTMLElement;
  scrollTop.value = target.scrollTop;
}

/** 处理行选中变更 */
function handleRowSelect(cardId: string, selected: boolean) {
  if (selected) {
    selectedCardIds.value.add(cardId);
  } else {
    selectedCardIds.value.delete(cardId);
  }
  // 触发响应式更新
  selectedCardIds.value = new Set(selectedCardIds.value);
}

/** 处理全选切换 */
function handleSelectAllToggle() {
  if (isAllSelected.value) {
    // 取消全选
    selectedCardIds.value.clear();
  } else {
    // 全选当前筛选结果
    for (const card of filteredCards.value) {
      selectedCardIds.value.add(card.id);
    }
  }
  selectedCardIds.value = new Set(selectedCardIds.value);
}

/** 处理文件路径变更 */
function handleFilePathUpdate(cardId: string, filePath: string) {
  const existingBinding = bindingMap.value.get(cardId);
  const newBindings = [...props.bindings];

  if (existingBinding) {
    // 更新现有绑定
    const index = newBindings.findIndex((b) => b.cardId === cardId);
    if (index !== -1) {
      newBindings[index] = { ...existingBinding, filePath };
    }
  } else if (filePath) {
    // 创建新绑定
    const card = props.cards.find((c) => c.id === cardId);
    if (card) {
      newBindings.push({
        cardId,
        resourceField: getDefaultResourceField(card),
        filePath
      });
    }
  }

  emit('update:bindings', newBindings);
  emit('select-file', cardId);
}

/** 获取默认资源字段 */
function getDefaultResourceField(card: CardInfo): string {
  if (card.baseCards && card.baseCards.length > 0) {
    const firstBaseCard = card.baseCards[0];
    if (firstBaseCard.resourceFields && firstBaseCard.resourceFields.length > 0) {
      return firstBaseCard.resourceFields[0].name;
    }
  }
  return 'primary_resource';
}

/** 处理删除绑定 */
function handleRemoveBinding(cardId: string) {
  const newBindings = props.bindings.filter((b) => b.cardId !== cardId);
  emit('update:bindings', newBindings);
  emit('remove-binding', cardId);
}

/** 批量删除选中的绑定 */
function handleBatchRemove() {
  const newBindings = props.bindings.filter(
    (b) => !selectedCardIds.value.has(b.cardId)
  );
  emit('update:bindings', newBindings);
  selectedCardIds.value.clear();
  selectedCardIds.value = new Set(selectedCardIds.value);
}

/** 清空所有绑定 */
function handleClearAll() {
  emit('update:bindings', []);
  selectedCardIds.value.clear();
  selectedCardIds.value = new Set(selectedCardIds.value);
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

/** 清空搜索 */
function clearSearch() {
  searchQuery.value = '';
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

// 当卡片列表变化时重置滚动位置
watch(
  () => props.cards.length,
  () => {
    if (containerRef.value) {
      containerRef.value.scrollTop = 0;
      scrollTop.value = 0;
    }
    // 清空选中
    selectedCardIds.value.clear();
    selectedCardIds.value = new Set(selectedCardIds.value);
  }
);
</script>

<template>
  <div class="binding-table">
    <!-- 工具栏 -->
    <div class="binding-table__toolbar">
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
          type="button"
          @click="clearSearch"
          :title="t('common.clear')"
        >
          ×
        </button>
      </div>

      <!-- 筛选按钮组 -->
      <div class="filter-group">
        <button
          class="filter-btn"
          :class="{ active: filterType === 'all' }"
          @click="setFilter('all')"
        >
          {{ t('card.filter.all') }}
        </button>
        <button
          class="filter-btn"
          :class="{ active: filterType === 'bound' }"
          @click="setFilter('bound')"
        >
          {{ t('binding.bound') }}
        </button>
        <button
          class="filter-btn"
          :class="{ active: filterType === 'unbound' }"
          @click="setFilter('unbound')"
        >
          {{ t('binding.unbound') }}
        </button>
      </div>

      <!-- 排序按钮组 -->
      <div class="sort-group">
        <button
          class="sort-btn"
          :class="{ active: sortType === 'name' }"
          @click="toggleSort('name')"
        >
          {{ t('card.sort.name') }}
          <span v-if="sortType === 'name'" class="sort-indicator">
            {{ sortOrder === 'asc' ? '↑' : '↓' }}
          </span>
        </button>
        <button
          class="sort-btn"
          :class="{ active: sortType === 'status' }"
          @click="toggleSort('status')"
        >
          {{ t('card.sort.status') }}
          <span v-if="sortType === 'status'" class="sort-indicator">
            {{ sortOrder === 'asc' ? '↑' : '↓' }}
          </span>
        </button>
      </div>

      <!-- 操作按钮 -->
      <div class="action-group" v-if="!readonly">
        <button
          class="action-btn"
          :disabled="selectedCardIds.size === 0"
          @click="handleBatchRemove"
          :title="t('bindingTable.batchRemove')"
        >
          {{ t('bindingTable.batchRemove') }}
        </button>
        <button
          class="action-btn action-btn--danger"
          :disabled="bindings.length === 0"
          @click="handleClearAll"
          :title="t('bindingTable.clearAll')"
        >
          {{ t('bindingTable.clearAll') }}
        </button>
      </div>
    </div>

    <!-- 表头 -->
    <div class="binding-table__header">
      <!-- 全选复选框 -->
      <div class="header-cell header-cell--checkbox">
        <label class="select-all" @click="handleSelectAllToggle">
          <span
            class="checkbox-icon"
            :class="{
              checked: isAllSelected,
              partial: isPartialSelected
            }"
          >
            <span v-if="isAllSelected" class="check-mark">✓</span>
            <span v-else-if="isPartialSelected" class="check-mark">−</span>
          </span>
        </label>
      </div>
      <div class="header-cell header-cell--card">
        {{ t('bindingTable.cardColumn') }}
      </div>
      <div class="header-cell header-cell--file">
        {{ t('bindingTable.fileColumn') }}
      </div>
      <div class="header-cell header-cell--status">
        {{ t('bindingTable.statusColumn') }}
      </div>
      <div class="header-cell header-cell--actions">
        {{ t('bindingTable.actionsColumn') }}
      </div>
    </div>

    <!-- 绑定行列表（虚拟滚动） -->
    <div
      ref="containerRef"
      class="binding-table__body"
      @scroll="handleScroll"
    >
      <div
        class="binding-table__scroll-content"
        :style="{ height: `${totalHeight}px` }"
      >
        <div
          class="binding-table__visible-area"
          :style="{ transform: `translateY(${offsetTop}px)` }"
        >
          <BindingRow
            v-for="card in visibleCards"
            :key="card.id"
            :card="card"
            :binding="getBinding(card.id)"
            :files="files"
            :selected="selectedCardIds.has(card.id)"
            :readonly="readonly"
            class="binding-table__row"
            @select="(selected) => handleRowSelect(card.id, selected)"
            @update:file-path="(filePath) => handleFilePathUpdate(card.id, filePath)"
            @remove="handleRemoveBinding(card.id)"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="sortedCards.length === 0" class="binding-table__empty">
        <div class="empty-icon">📋</div>
        <div class="empty-text">
          {{ searchQuery ? t('card.empty.noMatch') : t('card.empty.noCards') }}
        </div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="binding-table__footer">
      <div class="stats-left">
        <span class="stat-item">
          {{ t('status.cardsSelected', { count: stats.selected }) }}
        </span>
        <span class="stat-divider">|</span>
        <span class="stat-item">
          {{ t('bindingTable.showingCount', { count: stats.filtered, total: stats.total }) }}
        </span>
      </div>
      <div class="stats-right">
        <span class="stat-item stat-item--bound">
          {{ t('binding.bound') }}: {{ stats.bound }}
        </span>
        <span class="stat-divider">|</span>
        <span class="stat-item stat-item--unbound">
          {{ t('binding.unbound') }}: {{ stats.unbound }}
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.binding-table {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;

  &__toolbar {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-light);
    flex-wrap: wrap;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-tertiary);
    border-bottom: 1px solid var(--color-border-light);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  &__body {
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

  &__row {
    height: 72px;
    margin: 0 var(--spacing-sm);

    &:first-child {
      margin-top: var(--spacing-sm);
    }

    &:not(:last-child) {
      margin-bottom: var(--spacing-xs);
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
    }
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-secondary);
    border-top: 1px solid var(--color-border-light);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }
}

// 表头单元格
.header-cell {
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &--checkbox {
    flex-shrink: 0;
    width: 24px;
  }

  &--card {
    flex: 0 0 200px;
  }

  &--file {
    flex: 1;
  }

  &--status {
    flex-shrink: 0;
    width: 80px;
    text-align: center;
  }

  &--actions {
    flex-shrink: 0;
    width: 40px;
    text-align: center;
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

// 筛选和排序按钮组
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

// 操作按钮组
.action-group {
  display: flex;
  gap: var(--spacing-sm);
  margin-left: auto;

  .action-btn {
    padding: 4px 12px;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);

    &:hover:not(:disabled) {
      color: var(--color-text-primary);
      border-color: var(--color-border);
      background: var(--color-bg-hover);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &--danger {
      color: var(--color-error);

      &:hover:not(:disabled) {
        color: white;
        background: var(--color-error);
        border-color: var(--color-error);
      }
    }
  }
}

// 全选复选框
.select-all {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;

  .checkbox-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg-primary);
    transition: all var(--transition-fast);

    &.checked,
    &.partial {
      background: var(--color-primary);
      border-color: var(--color-primary);
    }

    .check-mark {
      color: white;
      font-size: 11px;
      font-weight: bold;
      line-height: 1;
    }
  }
}

// 统计信息
.stats-left,
.stats-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.stat-divider {
  color: var(--color-border);
}

.stat-item {
  &--bound {
    color: var(--color-success);
  }

  &--unbound {
    color: var(--color-text-tertiary);
  }
}
</style>
