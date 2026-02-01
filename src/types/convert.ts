/**
 * 转换相关类型定义
 * @module types/convert
 */

import type { FileType } from './file';

/**
 * 转换选项
 */
export interface ConvertOptions {
  /** 目标路径（空壳模式） */
  targetPath?: string;
  /** 资源类型过滤 */
  resourceTypes?: FileType[];
  /** 大小限制（字节） */
  sizeLimit?: number;
  /** 冲突处理 */
  conflictStrategy?: 'overwrite' | 'rename' | 'skip';
  /** 进度回调 */
  onProgress?: (progress: ConvertProgress) => void;
}

/**
 * 转换进度
 */
export interface ConvertProgress {
  /** 当前卡片索引 */
  currentCard: number;
  /** 总卡片数 */
  totalCards: number;
  /** 当前资源索引 */
  currentResource: number;
  /** 当前卡片资源总数 */
  totalResources: number;
  /** 已传输字节数 */
  bytesTransferred: number;
  /** 总字节数 */
  totalBytes: number;
  /** 百分比 */
  percentage: number;
  /** 当前卡片ID */
  cardId?: string;
  /** 当前资源路径 */
  resourcePath?: string;
}

/**
 * 转换结果
 */
export interface ConvertResult {
  /** 成功数量 */
  success: number;
  /** 失败数量 */
  failed: number;
  /** 总转换大小（字节） */
  totalSize: number;
  /** 总耗时（毫秒） */
  duration: number;
  /** 详细结果 */
  details: ConvertDetail[];
  /** 错误列表 */
  errors: ConvertError[];
}

/**
 * 转换详情
 */
export interface ConvertDetail {
  /** 卡片ID */
  cardId: string;
  /** 卡片名称 */
  cardName: string;
  /** 状态 */
  status: 'success' | 'failed' | 'partial';
  /** 转换的资源数 */
  resourceCount: number;
  /** 转换的大小 */
  size: number;
}

/**
 * 转换错误
 */
export interface ConvertError {
  /** 卡片ID */
  cardId: string;
  /** 资源路径 */
  resourcePath?: string;
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
}
