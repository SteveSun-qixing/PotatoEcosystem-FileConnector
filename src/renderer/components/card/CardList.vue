<script setup lang="ts">
/**
 * 卡片列表组件
 * @description 展示卡片列表，支持虚拟滚动、排序、筛选和全选功能
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CardInfo } from '@/types/card';
import type { BindingItem } from '@/types/binding';
import CardItem from './CardItem.vue';

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
    /** 选中的卡片ID列表 */
    selectedIds: string[];
    /** 绑定列表 */
    bindings: BindingItem[];
    /** 是否显示状态 */
    showStatus?: boolean;
  }>(),
  {
    showStatus: true
  }
);

const emit = defineEmits<{
  /** 选择卡片 */
  select: [cardId: string];
  /** 全选/取消全选 */
  'select-all': [selected: boolean];
}>();

const { t } = useI18n();

// 排序和筛选状态
const sortType = ref<SortType>('name');
const sortOrder = ref<SortOrder>('asc');
const filterType = ref<FilterType>('all');
const searchQuery = ref('');

// 虚拟滚动相关
const containerRef = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const containerHeight = ref(0);
const itemHeight = 60; // 每个卡片项的固定高度
const bufferCount = 5; // 缓冲区数量

/** 已绑定的卡片ID集合 */
const boundCardIds = computed(() => {
  return new Set(props.bindings.map((b) => b.cardId));
});

/** 检查卡片是否已绑定 */
function isBound(cardId: string): boolean {
  return boundCardIds.value.has(cardId);
}

/** 检查卡片是否选中 */
function isSelected(cardId: string): boolean {
  return props.selectedIds.includes(cardId);
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
  return filteredCards.value.every((card) => isSelected(card.id));
});

/** 是否部分选中 */
const isPartialSelected = computed(() => {
  if (filteredCards.value.length === 0) return false;
  const selectedCount = filteredCards.value.filter((card) => isSelected(card.id)).length;
  return selectedCount > 0 && selectedCount < filteredCards.value.length;
});

/** 统计信息 */
const stats = computed(() => {
  const total = props.cards.length;
  const filtered = filteredCards.value.length;
  const selected = props.selectedIds.length;
  const bound = props.bindings.length;
  return { total, filtered, selected, bound };
});

/** 处理滚动 */
function handleScroll(event: Event) {
  const target = event.target as HTMLElement;
  scrollTop.value = target.scrollTop;
}

/** 处理卡片点击 */
function handleCardClick(cardId: string) {
  emit('select', cardId);
}

/** 处理全选切换 */
function handleSelectAllToggle() {
  emit('select-all', !isAllSelected.value);
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
  }
);
</script>

<template>
  <div class="card-list">
    <!-- 工具栏 -->
    <div class="card-list__toolbar">
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
    </div>

    <!-- 全选栏 -->
    <div class="card-list__header">
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
        <span class="select-all__text">
          {{ t('common.selectAll') }}
          <span class="select-all__count">({{ stats.filtered }})</span>
        </span>
      </label>

      <div class="stats">
        <span class="stat-item">
          {{ t('status.cardsSelected', { count: stats.selected }) }}
        </span>
        <span class="stat-divider">|</span>
        <span class="stat-item">
          {{ t('status.bindingCount', { bound: stats.bound, total: stats.total }) }}
        </span>
      </div>
    </div>

    <!-- 卡片列表（虚拟滚动） -->
    <div
      ref="containerRef"
      class="card-list__container"
      @scroll="handleScroll"
    >
      <div
        class="card-list__scroll-content"
        :style="{ height: `${totalHeight}px` }"
      >
        <div
          class="card-list__visible-area"
          :style="{ transform: `translateY(${offsetTop}px)` }"
        >
          <CardItem
            v-for="card in visibleCards"
            :key="card.id"
            :card="card"
            :selected="isSelected(card.id)"
            :bound="isBound(card.id)"
            class="card-list__item"
            @click="handleCardClick(card.id)"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="sortedCards.length === 0" class="card-list__empty">
        <div class="empty-icon">📭</div>
        <div class="empty-text">
          {{ searchQuery ? t('card.empty.noMatch') : t('card.empty.noCards') }}
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.card-list {
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
    justify-content: space-between;
    padding: var(--spacing-sm) var(--spacing-md);
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

// 全选栏
.select-all {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
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

  &__text {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
  }

  &__count {
    color: var(--color-text-tertiary);
    margin-left: 2px;
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
