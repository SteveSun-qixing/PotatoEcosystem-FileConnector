/**
 * 绑定验证器
 * @description 验证绑定的有效性
 * @module core/validators/BindingValidator
 */

import type { BindingItem, ValidationResult, ValidationError, BatchValidationResult } from '@/types/binding';
import type { CardInfo, ResourceField } from '@/types/card';
import type { FileType, FILE_TYPE_MAP } from '@/types/file';
import { validateBinding as basicValidateBinding } from '@/utils/validation';

/**
 * SDK接口定义（适配层）
 */
interface ChipsSDK {
  getCard(cardId: string): Promise<CardInfo | null>;
  fileExists(path: string): Promise<boolean>;
}

/**
 * 验证错误码
 */
export const ValidationErrorCodes = {
  /** 卡片ID无效 */
  INVALID_CARD_ID: 'INVALID_CARD_ID',
  /** 文件路径无效 */
  INVALID_FILE_PATH: 'INVALID_FILE_PATH',
  /** 资源字段无效 */
  INVALID_RESOURCE_FIELD: 'INVALID_RESOURCE_FIELD',
  /** 卡片不存在 */
  CARD_NOT_FOUND: 'CARD_NOT_FOUND',
  /** 文件不存在 */
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  /** 资源字段不存在 */
  RESOURCE_FIELD_NOT_FOUND: 'RESOURCE_FIELD_NOT_FOUND',
  /** 文件类型不匹配 */
  FILE_TYPE_MISMATCH: 'FILE_TYPE_MISMATCH',
  /** 基础卡片不存在 */
  BASE_CARD_NOT_FOUND: 'BASE_CARD_NOT_FOUND'
} as const;

/**
 * 验证错误消息
 */
const ValidationErrorMessages: Record<string, string> = {
  [ValidationErrorCodes.INVALID_CARD_ID]: '卡片ID不能为空',
  [ValidationErrorCodes.INVALID_FILE_PATH]: '文件路径不能为空',
  [ValidationErrorCodes.INVALID_RESOURCE_FIELD]: '资源字段不能为空',
  [ValidationErrorCodes.CARD_NOT_FOUND]: '卡片不存在',
  [ValidationErrorCodes.FILE_NOT_FOUND]: '文件不存在',
  [ValidationErrorCodes.RESOURCE_FIELD_NOT_FOUND]: '资源字段不存在',
  [ValidationErrorCodes.FILE_TYPE_MISMATCH]: '文件类型不匹配',
  [ValidationErrorCodes.BASE_CARD_NOT_FOUND]: '基础卡片不存在'
};

/**
 * 文件类型映射表
 */
const FILE_EXTENSION_MAP: Record<string, FileType> = {
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
 * 从文件路径获取扩展名
 */
function getExtension(filePath: string): string {
  const parts = filePath.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * 从文件路径获取文件类型
 */
function getFileType(filePath: string): FileType {
  const ext = getExtension(filePath);
  return FILE_EXTENSION_MAP[ext] || 'other';
}

/**
 * 绑定验证器
 */
export class BindingValidator {
  private sdk: ChipsSDK;
  private cardCache: Map<string, CardInfo | null> = new Map();

  /**
   * 创建绑定验证器实例
   * @param sdk ChipsSDK实例
   */
  constructor(sdk: ChipsSDK) {
    this.sdk = sdk;
  }

  /**
   * 验证单个绑定
   * @param binding 绑定项
   * @returns 验证结果
   */
  async validateBinding(binding: BindingItem): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // 1. 基础验证（同步）
    const basicResult = basicValidateBinding(binding);
    if (!basicResult.valid) {
      errors.push(...basicResult.errors);
    }

    // 如果基础验证失败，直接返回
    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // 2. 验证卡片存在性
    const cardExists = await this.validateCard(binding.cardId);
    if (!cardExists) {
      errors.push({
        code: ValidationErrorCodes.CARD_NOT_FOUND,
        message: ValidationErrorMessages[ValidationErrorCodes.CARD_NOT_FOUND],
        field: 'cardId'
      });
      return { valid: false, errors };
    }

    // 3. 验证文件存在性
    const fileExists = await this.validateFile(binding.filePath);
    if (!fileExists) {
      errors.push({
        code: ValidationErrorCodes.FILE_NOT_FOUND,
        message: ValidationErrorMessages[ValidationErrorCodes.FILE_NOT_FOUND],
        field: 'filePath'
      });
    }

    // 4. 验证资源字段匹配
    const card = this.cardCache.get(binding.cardId);
    if (card) {
      const fileType = getFileType(binding.filePath);
      const fieldValidation = this.validateResourceField(card, binding.resourceField, fileType, binding.baseCardId);
      if (!fieldValidation.valid) {
        errors.push(...fieldValidation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 批量验证绑定
   * @param bindings 绑定列表
   * @returns 批量验证结果
   */
  async validateBindings(bindings: BindingItem[]): Promise<BatchValidationResult> {
    const results = new Map<string, ValidationResult>();
    let validCount = 0;
    let invalidCount = 0;

    // 预加载所有涉及的卡片
    const uniqueCardIds = [...new Set(bindings.map(b => b.cardId))];
    await Promise.all(uniqueCardIds.map(cardId => this.loadCard(cardId)));

    // 并行验证所有绑定
    const validationPromises = bindings.map(async binding => {
      const result = await this.validateBinding(binding);
      return { binding, result };
    });

    const validationResults = await Promise.all(validationPromises);

    for (const { binding, result } of validationResults) {
      results.set(binding.cardId, result);
      if (result.valid) {
        validCount++;
      } else {
        invalidCount++;
      }
    }

    return {
      total: bindings.length,
      valid: validCount,
      invalid: invalidCount,
      results
    };
  }

  /**
   * 验证卡片存在性
   * @param cardId 卡片ID
   * @returns 是否存在
   */
  async validateCard(cardId: string): Promise<boolean> {
    const card = await this.loadCard(cardId);
    return card !== null;
  }

  /**
   * 验证文件存在性
   * @param filePath 文件路径
   * @returns 是否存在
   */
  async validateFile(filePath: string): Promise<boolean> {
    try {
      return await this.sdk.fileExists(filePath);
    } catch {
      return false;
    }
  }

  /**
   * 验证资源字段匹配
   * @param card 卡片信息
   * @param field 资源字段名
   * @param fileType 文件类型
   * @param baseCardId 基础卡片ID（可选）
   * @returns 验证结果
   */
  validateResourceField(
    card: CardInfo,
    field: string,
    fileType: FileType,
    baseCardId?: string
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // 找到对应的基础卡片
    let targetBaseCard = card.baseCards[0]; // 默认使用第一个基础卡片
    
    if (baseCardId) {
      const found = card.baseCards.find(bc => bc.id === baseCardId);
      if (!found) {
        errors.push({
          code: ValidationErrorCodes.BASE_CARD_NOT_FOUND,
          message: ValidationErrorMessages[ValidationErrorCodes.BASE_CARD_NOT_FOUND],
          field: 'baseCardId'
        });
        return { valid: false, errors };
      }
      targetBaseCard = found;
    }

    if (!targetBaseCard) {
      // 卡片没有基础卡片，跳过字段验证
      return { valid: true, errors: [] };
    }

    // 查找资源字段
    const resourceField = targetBaseCard.resourceFields.find(rf => rf.name === field);
    
    if (!resourceField) {
      errors.push({
        code: ValidationErrorCodes.RESOURCE_FIELD_NOT_FOUND,
        message: `资源字段 "${field}" 不存在`,
        field: 'resourceField'
      });
      return { valid: false, errors };
    }

    // 验证文件类型是否允许
    if (resourceField.allowedTypes && resourceField.allowedTypes.length > 0) {
      const allowed = this.isFileTypeAllowed(fileType, resourceField.allowedTypes);
      if (!allowed) {
        errors.push({
          code: ValidationErrorCodes.FILE_TYPE_MISMATCH,
          message: `文件类型 "${fileType}" 不被允许，允许的类型: ${resourceField.allowedTypes.join(', ')}`,
          field: 'filePath'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查文件类型是否被允许
   * @param fileType 文件类型
   * @param allowedTypes 允许的类型列表
   * @returns 是否允许
   */
  private isFileTypeAllowed(fileType: FileType, allowedTypes: string[]): boolean {
    // 将允许的扩展名/类型转换为统一格式
    const allowedFileTypes = new Set<string>();
    
    for (const type of allowedTypes) {
      const lowerType = type.toLowerCase();
      // 如果是扩展名，转换为文件类型
      if (FILE_EXTENSION_MAP[lowerType]) {
        allowedFileTypes.add(FILE_EXTENSION_MAP[lowerType]);
      } else {
        // 直接是文件类型
        allowedFileTypes.add(lowerType);
      }
    }

    return allowedFileTypes.has(fileType);
  }

  /**
   * 加载卡片（带缓存）
   * @param cardId 卡片ID
   * @returns 卡片信息或null
   */
  private async loadCard(cardId: string): Promise<CardInfo | null> {
    if (this.cardCache.has(cardId)) {
      return this.cardCache.get(cardId) || null;
    }

    try {
      const card = await this.sdk.getCard(cardId);
      this.cardCache.set(cardId, card);
      return card;
    } catch {
      this.cardCache.set(cardId, null);
      return null;
    }
  }

  /**
   * 清除卡片缓存
   */
  clearCache(): void {
    this.cardCache.clear();
  }
}

export default BindingValidator;
