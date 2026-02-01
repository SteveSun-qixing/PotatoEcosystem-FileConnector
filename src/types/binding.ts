/**
 * 绑定相关类型定义
 * @module types/binding
 */

/**
 * 绑定状态
 */
export type BindingStatus = 'pending' | 'executing' | 'success' | 'failed' | 'skipped';

/**
 * 绑定项
 */
export interface BindingItem {
  /** 卡片ID */
  cardId: string;
  /** 基础卡片ID */
  baseCardId?: string;
  /** 资源字段名 */
  resourceField: string;
  /** 文件路径 */
  filePath: string;
  /** 绑定状态 */
  status?: BindingStatus;
  /** 额外信息 */
  extra?: Record<string, unknown>;
}

/**
 * 绑定详细信息
 */
export interface BindingDetail extends BindingItem {
  /** 卡片名称 */
  cardName: string;
  /** 文件名称 */
  fileName: string;
  /** 文件大小 */
  fileSize: number;
  /** 是否为新绑定 */
  isNew: boolean;
  /** 原有绑定 */
  previousPath?: string;
  /** 置信度 */
  confidence?: number;
  /** 匹配原因 */
  matchReason?: string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: ValidationError[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 相关字段 */
  field?: string;
}

/**
 * 批量验证结果
 */
export interface BatchValidationResult {
  /** 总数 */
  total: number;
  /** 有效数 */
  valid: number;
  /** 无效数 */
  invalid: number;
  /** 详细结果 */
  results: Map<string, ValidationResult>;
}
