/**
 * 文件相关类型定义
 * @module types/file
 */

/**
 * 文件类型
 */
export type FileType = 'video' | 'audio' | 'image' | 'document' | 'subtitle' | 'archive' | 'other';

/**
 * 文件基本信息
 */
export interface FileInfo {
  /** 文件名（不含路径） */
  name: string;
  /** 完整路径 */
  path: string;
  /** 文件大小（字节） */
  size: number;
  /** MIME类型 */
  mimeType: string;
  /** 文件类型分类 */
  type: FileType;
  /** 扩展名 */
  extension: string;
  /** 修改时间 */
  modifiedAt: string;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 文件类型映射
 */
export const FILE_TYPE_MAP: Record<string, FileType> = {
  // 视频
  mp4: 'video',
  mkv: 'video',
  avi: 'video',
  mov: 'video',
  webm: 'video',
  flv: 'video',
  wmv: 'video',
  m4v: 'video',

  // 音频
  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
  aac: 'audio',
  ogg: 'audio',
  m4a: 'audio',
  wma: 'audio',

  // 图片
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  bmp: 'image',
  ico: 'image',

  // 文档
  pdf: 'document',
  doc: 'document',
  docx: 'document',
  xls: 'document',
  xlsx: 'document',
  ppt: 'document',
  pptx: 'document',
  txt: 'document',
  md: 'document',

  // 字幕
  srt: 'subtitle',
  ass: 'subtitle',
  ssa: 'subtitle',
  vtt: 'subtitle',

  // 压缩包
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive'
};

/**
 * 加载文件选项
 */
export interface LoadFilesOptions {
  /** 是否递归 */
  recursive?: boolean;
  /** 扩展名过滤 */
  extensions?: string[];
  /** 类型过滤 */
  types?: FileType[];
  /** 最大文件数 */
  maxFiles?: number;
}
