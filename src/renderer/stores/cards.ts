/**
 * 卡片状态管理
 * @module renderer/stores/cards
 */

import { defineStore } from 'pinia';
import type { CardInfo } from '@/types/card';

interface CardsState {
  /** 卡片列表 */
  cards: CardInfo[];
  /** 选中的卡片ID */
  selectedIds: string[];
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
}

export const useCardsStore = defineStore('cards', {
  state: (): CardsState => ({
    cards: [],
    selectedIds: [],
    loading: false,
    error: null
  }),

  getters: {
    /** 卡片数量 */
    count: (state) => state.cards.length,

    /** 选中数量 */
    selectedCount: (state) => state.selectedIds.length,

    /** 选中的卡片 */
    selectedCards: (state) => {
      return state.cards.filter(c => state.selectedIds.includes(c.id));
    },

    /** 是否全选 */
    isAllSelected: (state) => {
      return state.cards.length > 0 && state.selectedIds.length === state.cards.length;
    },

    /** 通过ID获取卡片 */
    getById: (state) => {
      return (id: string) => state.cards.find(c => c.id === id);
    }
  },

  actions: {
    /** 设置卡片列表 */
    setCards(cards: CardInfo[]) {
      this.cards = cards;
      // 清除不存在的选中项
      this.selectedIds = this.selectedIds.filter(
        id => cards.some(c => c.id === id)
      );
    },

    /** 添加卡片 */
    addCards(cards: CardInfo[]) {
      const newCards = cards.filter(
        c => !this.cards.some(existing => existing.id === c.id)
      );
      this.cards.push(...newCards);
    },

    /** 选择卡片 */
    select(id: string) {
      if (!this.selectedIds.includes(id)) {
        this.selectedIds.push(id);
      }
    },

    /** 取消选择 */
    deselect(id: string) {
      const index = this.selectedIds.indexOf(id);
      if (index >= 0) {
        this.selectedIds.splice(index, 1);
      }
    },

    /** 切换选择 */
    toggle(id: string) {
      if (this.selectedIds.includes(id)) {
        this.deselect(id);
      } else {
        this.select(id);
      }
    },

    /** 全选 */
    selectAll() {
      this.selectedIds = this.cards.map(c => c.id);
    },

    /** 取消全选 */
    deselectAll() {
      this.selectedIds = [];
    },

    /** 设置加载状态 */
    setLoading(loading: boolean) {
      this.loading = loading;
    },

    /** 设置错误 */
    setError(error: string | null) {
      this.error = error;
    },

    /** 清空 */
    clear() {
      this.cards = [];
      this.selectedIds = [];
      this.error = null;
    }
  }
});
