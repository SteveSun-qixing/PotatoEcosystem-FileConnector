/**
 * 卡片相关类型定义
 * @module types/card
 */

/**
 * 卡片类型
 */
export type CardType = 'video' | 'audio' | 'image' | 'document' | 'text' | 'custom';

/**
 * 资源模式
 */
export type ResourceMode = 'full' | 'empty' | 'semi';

/**
 * 卡片基本信息
 */
export interface CardInfo {
  /** 卡片唯一标识 */
  id: string;
  /** 卡片名称 */
  name: string;
  /** 卡片类型 */
  type: CardType;
  /** 卡片文件路径 */
  path: string;
  /** 卡片描述 */
  description?: string;
  /** 基础卡片信息 */
  baseCards: BaseCardInfo[];
  /** 当前资源模式 */
  resourceMode: ResourceMode;
  /** 元数据 */
  metadata: CardMetadata;
}

/**
 * 基础卡片信息
 */
export interface BaseCardInfo {
  /** 基础卡片ID */
  id: string;
  /** 基础卡片插件类型 */
  pluginType: string;
  /** 资源字段列表 */
  resourceFields: ResourceField[];
}

/**
 * 资源字段
 */
export interface ResourceField {
  /** 字段名称 */
  name: string;
  /** 字段类型 */
  type: 'file' | 'url' | 'content';
  /** 当前值 */
  value?: string;
  /** 是否必需 */
  required: boolean;
  /** 允许的文件类型 */
  allowedTypes?: string[];
}

/**
 * 卡片元数据
 */
export interface CardMetadata {
  /** 创建时间 */
  created_at: string;
  /** 修改时间 */
  modified_at: string;
  /** 版本 */
  version: string;
  /** 标签 */
  tags: string[];
}

/**
 * 资源信息
 */
export interface ResourceInfo {
  /** 资源URI */
  uri: string;
  /** 资源名称 */
  name: string;
  /** 资源大小（字节） */
  size: number;
  /** MIME类型 */
  mimeType: string;
  /** 是否内部资源 */
  internal: boolean;
}
