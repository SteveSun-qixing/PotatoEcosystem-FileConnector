/**
 * 文件状态管理
 * @module renderer/stores/files
 */

import { defineStore } from 'pinia';
import type { FileInfo } from '@/types/file';

interface FilesState {
  /** 文件列表 */
  files: FileInfo[];
  /** 选中的文件路径 */
  selectedPaths: string[];
  /** 已使用的文件路径（已绑定） */
  usedPaths: string[];
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
}

export const useFilesStore = defineStore('files', {
  state: (): FilesState => ({
    files: [],
    selectedPaths: [],
    usedPaths: [],
    loading: false,
    error: null
  }),

  getters: {
    /** 文件数量 */
    count: (state) => state.files.length,

    /** 选中数量 */
    selectedCount: (state) => state.selectedPaths.length,

    /** 选中的文件 */
    selectedFiles: (state) => {
      return state.files.filter(f => state.selectedPaths.includes(f.path));
    },

    /** 未使用的文件 */
    unusedFiles: (state) => {
      return state.files.filter(f => !state.usedPaths.includes(f.path));
    },

    /** 通过路径获取文件 */
    getByPath: (state) => {
      return (path: string) => state.files.find(f => f.path === path);
    },

    /** 总大小 */
    totalSize: (state) => {
      return state.files.reduce((sum, f) => sum + f.size, 0);
    }
  },

  actions: {
    /** 设置文件列表 */
    setFiles(files: FileInfo[]) {
      this.files = files;
      // 清除不存在的选中项
      this.selectedPaths = this.selectedPaths.filter(
        path => files.some(f => f.path === path)
      );
    },

    /** 添加文件 */
    addFiles(files: FileInfo[]) {
      const newFiles = files.filter(
        f => !this.files.some(existing => existing.path === f.path)
      );
      this.files.push(...newFiles);
    },

    /** 移除文件 */
    removeFile(path: string) {
      const index = this.files.findIndex(f => f.path === path);
      if (index >= 0) {
        this.files.splice(index, 1);
      }
      // 同时从选中列表移除
      this.deselect(path);
    },

    /** 选择文件 */
    select(path: string) {
      if (!this.selectedPaths.includes(path)) {
        this.selectedPaths.push(path);
      }
    },

    /** 取消选择 */
    deselect(path: string) {
      const index = this.selectedPaths.indexOf(path);
      if (index >= 0) {
        this.selectedPaths.splice(index, 1);
      }
    },

    /** 设置已使用路径 */
    setUsedPaths(paths: string[]) {
      this.usedPaths = paths;
    },

    /** 标记为已使用 */
    markAsUsed(path: string) {
      if (!this.usedPaths.includes(path)) {
        this.usedPaths.push(path);
      }
    },

    /** 标记为未使用 */
    markAsUnused(path: string) {
      const index = this.usedPaths.indexOf(path);
      if (index >= 0) {
        this.usedPaths.splice(index, 1);
      }
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
      this.files = [];
      this.selectedPaths = [];
      this.usedPaths = [];
      this.error = null;
    }
  }
});
