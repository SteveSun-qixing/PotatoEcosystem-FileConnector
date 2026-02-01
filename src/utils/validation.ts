/**
 * 验证工具函数
 * @module utils/validation
 */

import type { BindingItem, ValidationResult, ValidationError } from '@/types/binding';

/**
 * 验证绑定项
 * @param binding 绑定项
 * @returns 验证结果
 */
export function validateBinding(binding: BindingItem): ValidationResult {
  const errors: ValidationError[] = [];

  // 验证卡片ID
  if (!binding.cardId || binding.cardId.trim() === '') {
    errors.push({
      code: 'INVALID_CARD_ID',
      message: '卡片ID不能为空',
      field: 'cardId'
    });
  }

  // 验证文件路径
  if (!binding.filePath || binding.filePath.trim() === '') {
    errors.push({
      code: 'INVALID_FILE_PATH',
      message: '文件路径不能为空',
      field: 'filePath'
    });
  }

  // 验证资源字段
  if (!binding.resourceField || binding.resourceField.trim() === '') {
    errors.push({
      code: 'INVALID_RESOURCE_FIELD',
      message: '资源字段不能为空',
      field: 'resourceField'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 验证绑定列表
 * @param bindings 绑定列表
 * @returns 验证结果数组
 */
export function validateBindings(bindings: BindingItem[]): ValidationResult[] {
  return bindings.map(binding => validateBinding(binding));
}

/**
 * 检查路径安全性（防止路径遍历）
 * @param path 文件路径
 * @returns 是否安全
 */
export function isPathSafe(path: string): boolean {
  const normalized = path.replace(/\\/g, '/');

  // 检查是否包含 .. 
  if (normalized.includes('..')) {
    return false;
  }

  // 检查是否是绝对路径（允许）或相对路径
  // 这里只做基本检查，实际使用时应该结合具体场景
  return true;
}

/**
 * 验证文件扩展名
 * @param filename 文件名
 * @param allowedExtensions 允许的扩展名
 * @returns 是否有效
 */
export function validateExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return allowedExtensions.includes(ext);
}
