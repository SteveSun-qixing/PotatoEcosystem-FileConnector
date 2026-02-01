/**
 * 连接器状态管理
 * @module renderer/stores/connector
 */

import { defineStore } from 'pinia';
import type { ConnectorMode, ViewMode } from '@/types/config';
import type { BindingItem } from '@/types/binding';
import type { MatchScheme } from '@/types/match';
import type { ExecuteResult, ExecutionProgress } from '@/types/execute';

interface ConnectorState {
  /** 当前模式 */
  mode: ConnectorMode;
  /** 当前视图 */
  view: ViewMode;
  /** 当前绑定列表 */
  bindings: BindingItem[];
  /** 匹配方案列表 */
  schemes: MatchScheme[];
  /** 当前选中的方案索引 */
  selectedSchemeIndex: number;
  /** 是否正在执行 */
  executing: boolean;
  /** 执行进度 */
  progress: ExecutionProgress | null;
  /** 最后执行结果 */
  lastResult: ExecuteResult | null;
  /** 错误信息 */
  error: string | null;
}

export const useConnectorStore = defineStore('connector', {
  state: (): ConnectorState => ({
    mode: 'manual',
    view: 'table',
    bindings: [],
    schemes: [],
    selectedSchemeIndex: -1,
    executing: false,
    progress: null,
    lastResult: null,
    error: null
  }),

  getters: {
    /** 已绑定数量 */
    boundCount: (state) => state.bindings.length,

    /** 当前选中的方案 */
    selectedScheme: (state) => {
      if (state.selectedSchemeIndex >= 0 && state.selectedSchemeIndex < state.schemes.length) {
        return state.schemes[state.selectedSchemeIndex];
      }
      return null;
    },

    /** 是否有绑定 */
    hasBindings: (state) => state.bindings.length > 0,

    /** 是否有方案 */
    hasSchemes: (state) => state.schemes.length > 0
  },

  actions: {
    /** 设置模式 */
    setMode(mode: ConnectorMode) {
      this.mode = mode;
    },

    /** 设置视图 */
    setView(view: ViewMode) {
      this.view = view;
    },

    /** 设置绑定列表 */
    setBindings(bindings: BindingItem[]) {
      this.bindings = bindings;
    },

    /** 添加绑定 */
    addBinding(binding: BindingItem) {
      const existing = this.bindings.findIndex(b => b.cardId === binding.cardId);
      if (existing >= 0) {
        this.bindings[existing] = binding;
      } else {
        this.bindings.push(binding);
      }
    },

    /** 移除绑定 */
    removeBinding(cardId: string) {
      const index = this.bindings.findIndex(b => b.cardId === cardId);
      if (index >= 0) {
        this.bindings.splice(index, 1);
      }
    },

    /** 清空绑定 */
    clearBindings() {
      this.bindings = [];
    },

    /** 设置方案列表 */
    setSchemes(schemes: MatchScheme[]) {
      this.schemes = schemes;
      this.selectedSchemeIndex = schemes.length > 0 ? 0 : -1;
    },

    /** 选择方案 */
    selectScheme(index: number) {
      if (index >= 0 && index < this.schemes.length) {
        this.selectedSchemeIndex = index;
      }
    },

    /** 应用选中的方案 */
    applySelectedScheme() {
      const scheme = this.selectedScheme;
      if (scheme) {
        this.bindings = [...scheme.bindings];
      }
    },

    /** 设置执行状态 */
    setExecuting(executing: boolean) {
      this.executing = executing;
    },

    /** 更新进度 */
    updateProgress(progress: ExecutionProgress) {
      this.progress = progress;
    },

    /** 设置执行结果 */
    setResult(result: ExecuteResult) {
      this.lastResult = result;
      this.executing = false;
      this.progress = null;
    },

    /** 设置错误 */
    setError(error: string | null) {
      this.error = error;
    },

    /** 重置状态 */
    reset() {
      this.bindings = [];
      this.schemes = [];
      this.selectedSchemeIndex = -1;
      this.executing = false;
      this.progress = null;
      this.lastResult = null;
      this.error = null;
    }
  }
});
