/**
 * 匹配相关类型定义
 * @module types/match
 */

import type { BindingItem } from './binding';

/**
 * 匹配模式
 */
export type MatchMode = 'number_sequence' | 'keyword' | 'file_order';

/**
 * 数字位置选择
 */
export type NumberPosition = 'first' | 'last' | 'longest' | 'auto';

/**
 * 冲突处理策略
 */
export type ConflictStrategy = 'first' | 'manual' | 'skip';

/**
 * 排序策略
 */
export type SortStrategy = 'name' | 'name_numeric' | 'created' | 'modified' | 'size';

/**
 * 匹配方案
 */
export interface MatchScheme {
  /** 匹配模式 */
  mode: MatchMode;
  /** 置信度 (0-100) */
  confidence: number;
  /** 绑定列表 */
  bindings: BindingItem[];
  /** 未匹配的卡片 */
  unmatchedCards: string[];
  /** 未匹配的文件 */
  unmatchedFiles: string[];
  /** 冲突信息 */
  conflicts?: MatchConflict[];
  /** 警告信息 */
  warning?: string;
  /** 方案描述 */
  description?: string;
}

/**
 * 匹配冲突
 */
export interface MatchConflict {
  /** 冲突类型 */
  type: 'duplicate_card' | 'duplicate_file' | 'multiple_match';
  /** 相关卡片 */
  cards: string[];
  /** 相关文件 */
  files: string[];
  /** 冲突原因 */
  reason: string;
}

/**
 * 数字信息
 */
export interface NumberInfo {
  /** 数字值 */
  value: number;
  /** 原始字符串 */
  raw: string;
  /** 位置 */
  position: number;
  /** 长度 */
  length: number;
}

/**
 * 匹配选项
 */
export interface MatchOptions {
  /** 数字位置 */
  numberPosition?: NumberPosition;
  /** 冲突策略 */
  conflictStrategy?: ConflictStrategy;
  /** 最低相似度 */
  minSimilarity?: number;
  /** 忽略词 */
  ignoreWords?: string[];
  /** 排序策略 */
  sortStrategy?: SortStrategy;
}

/**
 * 智能匹配结果
 */
export interface SmartMatchResult {
  /** 匹配项 */
  bindings: Array<BindingItem & { confidence: number; reason?: string }>;
  /** 未匹配的卡片 */
  unmatchedCards: string[];
  /** 未匹配的文件 */
  unmatchedFiles: string[];
  /** 元信息 */
  metadata: {
    processingTime: number;
    modelVersion: string;
  };
}

/**
 * 置信度分级结果
 */
export interface ClassifiedMatches {
  /** 高置信度 (≥80%) */
  high: Array<BindingItem & { confidence: number; reason?: string }>;
  /** 中置信度 (50-79%) */
  medium: Array<BindingItem & { confidence: number; reason?: string }>;
  /** 低置信度 (<50%) */
  low: Array<BindingItem & { confidence: number; reason?: string }>;
}

/**
 * 方案评分
 */
export interface SchemeScore {
  /** 方案 */
  scheme: MatchScheme;
  /** 分数详情 */
  scores: {
    matchRate: number;
    conflictRate: number;
    coverage: number;
    consistency: number;
  };
  /** 总分 */
  totalScore: number;
}
