/**
 * 执行相关类型定义
 * @module types/execute
 */

import type { BindingItem } from './binding';

/**
 * 错误处理动作
 */
export type ErrorAction = 'skip' | 'retry' | 'abort';

/**
 * 执行选项
 */
export interface ExecuteOptions {
  /** 是否复制文件到卡片内部 */
  copyToInternal?: boolean;
  /** 错误处理策略 */
  errorStrategy?: ErrorAction;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 并发数 */
  concurrency?: number;
  /** 进度回调 */
  onProgress?: (progress: ExecutionProgress) => void;
  /** 错误回调 */
  onError?: (error: ExecutionError) => ErrorAction;
}

/**
 * 执行进度
 */
export interface ExecutionProgress {
  /** 当前索引 */
  current: number;
  /** 总数 */
  total: number;
  /** 当前绑定 */
  currentBinding?: BindingItem;
  /** 已完成数 */
  completed: number;
  /** 失败数 */
  failed: number;
  /** 跳过数 */
  skipped: number;
  /** 百分比 */
  percentage: number;
  /** 预计剩余时间（毫秒） */
  estimatedRemaining?: number;
}

/**
 * 执行结果
 */
export interface ExecuteResult {
  /** 成功数量 */
  success: number;
  /** 失败数量 */
  failed: number;
  /** 跳过数量 */
  skipped: number;
  /** 总耗时（毫秒） */
  duration: number;
  /** 详细结果 */
  details: ExecutionDetail[];
  /** 错误列表 */
  errors: ExecutionError[];
}

/**
 * 执行详情
 */
export interface ExecutionDetail {
  /** 绑定项 */
  binding: BindingItem;
  /** 状态 */
  status: 'success' | 'failed' | 'skipped';
  /** 耗时（毫秒） */
  duration: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 执行错误
 */
export interface ExecutionError {
  /** 绑定项 */
  binding: BindingItem;
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误栈 */
  stack?: string;
  /** 是否可重试 */
  retryable: boolean;
}

/**
 * 单个执行结果
 */
export interface SingleExecuteResult {
  /** 是否成功 */
  success: boolean;
  /** 耗时 */
  duration: number;
  /** 错误 */
  error?: ExecutionError;
}
