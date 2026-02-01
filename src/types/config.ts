/**
 * 配置相关类型定义
 * @module types/config
 */

import type { MatchMode, NumberPosition, ConflictStrategy, SortStrategy } from './match';

/**
 * 连接器模式
 */
export type ConnectorMode = 'manual' | 'auto' | 'smart' | 'convert';

/**
 * 视图模式
 */
export type ViewMode = 'table' | 'graph' | 'scheme' | 'preview' | 'execute';

/**
 * 文件连接器配置
 */
export interface FileConnectorConfig {
  /** AI服务配置 */
  aiService?: AIServiceConfig;
  /** 匹配配置 */
  matching?: MatchingConfig;
  /** UI配置 */
  ui?: UIConfig;
  /** 日志配置 */
  logger?: LoggerConfig;
}

/**
 * AI服务配置
 */
export interface AIServiceConfig {
  /** 服务端点 */
  endpoint: string;
  /** 认证令牌 */
  token: string;
  /** 超时（毫秒） */
  timeout: number;
  /** 重试配置 */
  retry: {
    maxAttempts: number;
    delay: number;
  };
  /** 默认选项 */
  defaults?: {
    language?: string;
    minConfidence?: number;
  };
}

/**
 * 匹配配置
 */
export interface MatchingConfig {
  /** 数字匹配配置 */
  number: {
    cardPosition: NumberPosition;
    filePosition: NumberPosition;
    conflictStrategy: ConflictStrategy;
  };
  /** 关键词匹配配置 */
  keyword: {
    minSimilarity: number;
    ignoreWords: string[];
    weightJaccard: number;
    weightEdit: number;
    weightNumber: number;
  };
  /** 顺序匹配配置 */
  order: {
    cardSort: SortStrategy;
    fileSort: SortStrategy;
  };
  /** 综合配置 */
  general: {
    preferredMode: MatchMode;
    autoSelectThreshold: number;
  };
}

/**
 * UI配置
 */
export interface UIConfig {
  /** 默认连接模式 */
  defaultMode: ConnectorMode;
  /** 默认视图 */
  defaultView: ViewMode;
  /** 每页显示数量 */
  pageSize: number;
  /** 是否显示预览 */
  showPreview: boolean;
  /** 主题 */
  theme: 'light' | 'dark' | 'system';
  /** 语言 */
  language: string;
}

/**
 * 日志配置
 */
export interface LoggerConfig {
  /** 日志级别 */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** 是否启用文件日志 */
  fileLog: boolean;
  /** 日志文件路径 */
  filePath?: string;
  /** 最大文件大小 */
  maxFileSize?: number;
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: FileConnectorConfig = {
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
  },
  logger: {
    level: 'info',
    fileLog: false
  }
};
