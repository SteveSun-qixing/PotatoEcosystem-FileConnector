/**
 * 文件工具函数
 * @module utils/file
 */

import { FILE_TYPE_MAP, type FileType } from '@/types/file';

/**
 * 获取文件扩展名
 * @param filename 文件名
 * @returns 扩展名（小写，不含点）
 */
export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return '';
  }
  return filename.substring(lastDot + 1).toLowerCase();
}

/**
 * 获取文件类型
 * @param filename 文件名
 * @returns 文件类型
 */
export function getFileType(filename: string): FileType {
  const ext = getExtension(filename);
  return FILE_TYPE_MAP[ext] || 'other';
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @param decimals 小数位数
 * @returns 格式化后的字符串
 */
export function formatSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  return `${value} ${sizes[i]}`;
}

/**
 * 检查文件类型是否匹配
 * @param filename 文件名
 * @param types 允许的类型
 * @returns 是否匹配
 */
export function matchesType(filename: string, types: FileType[]): boolean {
  const fileType = getFileType(filename);
  return types.includes(fileType);
}

/**
 * 生成唯一文件名
 * @param baseName 基础文件名
 * @param existingNames 已存在的文件名
 * @returns 唯一文件名
 */
export function uniqueName(baseName: string, existingNames: string[]): string {
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  const ext = getExtension(baseName);
  const nameWithoutExt = ext
    ? baseName.substring(0, baseName.length - ext.length - 1)
    : baseName;

  let counter = 1;
  let newName: string;

  do {
    newName = ext ? `${nameWithoutExt}_${counter}.${ext}` : `${nameWithoutExt}_${counter}`;
    counter++;
  } while (existingNames.includes(newName));

  return newName;
}

/**
 * 获取文件名（不含路径）
 * @param filePath 文件路径
 * @returns 文件名
 */
export function getFileName(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? normalized : normalized.substring(lastSlash + 1);
}

/**
 * 获取目录路径
 * @param filePath 文件路径
 * @returns 目录路径
 */
export function getDirPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? '' : normalized.substring(0, lastSlash);
}
