/**
 * 设置状态管理
 * @module renderer/stores/settings
 */

import { defineStore } from 'pinia';
import type { MatchingConfig, UIConfig, DEFAULT_CONFIG } from '@/types/config';

interface SettingsState {
  /** 匹配配置 */
  matching: MatchingConfig;
  /** UI配置 */
  ui: UIConfig;
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    matching: {
      number: {
        cardPosition: 'auto',
        filePosition: 'auto',
        conflictStrategy: 'manual'
      },
      keyword: {
        minSimilarity: 0.3,
        ignoreWords: ['the', 'a', 'an', '的', '了', '是'],
        weightJaccard: 0.5,
        weightEdit: 0.3,
        weightNumber: 0.2
      },
      order: {
        cardSort: 'name_numeric',
        fileSort: 'name_numeric'
      },
      general: {
        preferredMode: 'number_sequence',
        autoSelectThreshold: 85
      }
    },
    ui: {
      defaultMode: 'manual',
      defaultView: 'table',
      pageSize: 50,
      showPreview: true,
      theme: 'system',
      language: 'zh-CN'
    }
  }),

  getters: {
    /** 获取主题 */
    theme: (state) => state.ui.theme,

    /** 获取语言 */
    language: (state) => state.ui.language
  },

  actions: {
    /** 更新匹配配置 */
    updateMatching(config: Partial<MatchingConfig>) {
      this.matching = { ...this.matching, ...config };
    },

    /** 更新UI配置 */
    updateUI(config: Partial<UIConfig>) {
      this.ui = { ...this.ui, ...config };
    },

    /** 设置主题 */
    setTheme(theme: 'light' | 'dark' | 'system') {
      this.ui.theme = theme;
    },

    /** 设置语言 */
    setLanguage(language: string) {
      this.ui.language = language;
    },

    /** 重置为默认配置 */
    resetToDefaults() {
      // 重置到默认值
      this.matching = {
        number: {
          cardPosition: 'auto',
          filePosition: 'auto',
          conflictStrategy: 'manual'
        },
        keyword: {
          minSimilarity: 0.3,
          ignoreWords: ['the', 'a', 'an', '的', '了', '是'],
          weightJaccard: 0.5,
          weightEdit: 0.3,
          weightNumber: 0.2
        },
        order: {
          cardSort: 'name_numeric',
          fileSort: 'name_numeric'
        },
        general: {
          preferredMode: 'number_sequence',
          autoSelectThreshold: 85
        }
      };
      this.ui = {
        defaultMode: 'manual',
        defaultView: 'table',
        pageSize: 50,
        showPreview: true,
        theme: 'system',
        language: 'zh-CN'
      };
    }
  },

  // 持久化配置（需要pinia-plugin-persistedstate插件）
  // persist: true
});
