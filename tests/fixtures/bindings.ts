/**
 * 测试用绑定数据
 * @module tests/fixtures/bindings
 */

import type { BindingItem, BindingDetail, ValidationResult, ValidationError } from '@/types/binding';

/**
 * 创建绑定项
 */
export function createBindingItem(overrides?: Partial<BindingItem>): BindingItem {
  return {
    cardId: 'card-1',
    resourceField: 'video_file',
    filePath: '/files/video.mp4',
    status: 'pending',
    ...overrides
  };
}

/**
 * 创建绑定详情
 */
export function createBindingDetail(overrides?: Partial<BindingDetail>): BindingDetail {
  return {
    cardId: 'card-1',
    resourceField: 'video_file',
    filePath: '/files/video.mp4',
    status: 'pending',
    cardName: '测试卡片',
    fileName: 'video.mp4',
    fileSize: 1024 * 1024 * 100,
    isNew: true,
    ...overrides
  };
}

/**
 * 有效的绑定列表
 */
export const mockValidBindings: BindingItem[] = [
  createBindingItem({
    cardId: 'video-001',
    resourceField: 'video_file',
    filePath: '/files/video001.mp4',
    status: 'pending'
  }),
  createBindingItem({
    cardId: 'video-002',
    resourceField: 'video_file',
    filePath: '/files/video002.mkv',
    status: 'pending'
  }),
  createBindingItem({
    cardId: 'video-003',
    resourceField: 'video_file',
    filePath: '/files/video003.avi',
    status: 'pending'
  })
];

/**
 * 无效的绑定（缺少卡片ID）
 */
export const mockInvalidBindingNoCardId: BindingItem = createBindingItem({
  cardId: '',
  filePath: '/files/video.mp4'
});

/**
 * 无效的绑定（缺少文件路径）
 */
export const mockInvalidBindingNoFilePath: BindingItem = createBindingItem({
  cardId: 'card-1',
  filePath: ''
});

/**
 * 无效的绑定（缺少资源字段）
 */
export const mockInvalidBindingNoResourceField: BindingItem = createBindingItem({
  cardId: 'card-1',
  filePath: '/files/video.mp4',
  resourceField: ''
});

/**
 * 完全无效的绑定
 */
export const mockCompletelyInvalidBinding: BindingItem = createBindingItem({
  cardId: '',
  filePath: '',
  resourceField: ''
});

/**
 * 包含空格的绑定
 */
export const mockBindingWithSpaces: BindingItem = createBindingItem({
  cardId: '   ',
  filePath: '   ',
  resourceField: '   '
});

/**
 * 已成功的绑定
 */
export const mockSuccessBindings: BindingItem[] = [
  createBindingItem({
    cardId: 'card-1',
    filePath: '/files/video1.mp4',
    status: 'success'
  }),
  createBindingItem({
    cardId: 'card-2',
    filePath: '/files/video2.mp4',
    status: 'success'
  })
];

/**
 * 失败的绑定
 */
export const mockFailedBindings: BindingItem[] = [
  createBindingItem({
    cardId: 'card-3',
    filePath: '/files/missing.mp4',
    status: 'failed'
  })
];

/**
 * 混合状态的绑定
 */
export const mockMixedStatusBindings: BindingItem[] = [
  createBindingItem({ cardId: 'card-1', status: 'pending' }),
  createBindingItem({ cardId: 'card-2', status: 'executing' }),
  createBindingItem({ cardId: 'card-3', status: 'success' }),
  createBindingItem({ cardId: 'card-4', status: 'failed' }),
  createBindingItem({ cardId: 'card-5', status: 'skipped' })
];

/**
 * 空绑定列表
 */
export const mockEmptyBindings: BindingItem[] = [];

/**
 * 重复文件路径的绑定（用于测试冲突检测）
 */
export const mockDuplicateFileBindings: BindingItem[] = [
  createBindingItem({
    cardId: 'card-1',
    filePath: '/files/shared-video.mp4'
  }),
  createBindingItem({
    cardId: 'card-2',
    filePath: '/files/shared-video.mp4' // 重复的文件路径
  })
];

/**
 * 带基础卡片ID的绑定
 */
export const mockBindingsWithBaseCard: BindingItem[] = [
  createBindingItem({
    cardId: 'card-1',
    baseCardId: 'base-card-1',
    resourceField: 'video_file',
    filePath: '/files/video.mp4'
  }),
  createBindingItem({
    cardId: 'card-1',
    baseCardId: 'base-card-2',
    resourceField: 'audio_file',
    filePath: '/files/audio.mp3'
  })
];

/**
 * 带额外信息的绑定
 */
export const mockBindingsWithExtra: BindingItem[] = [
  createBindingItem({
    cardId: 'card-1',
    extra: {
      matchConfidence: 0.95,
      matchReason: 'Number sequence match'
    }
  }),
  createBindingItem({
    cardId: 'card-2',
    extra: {
      matchConfidence: 0.78,
      matchReason: 'Keyword match'
    }
  })
];

/**
 * 验证结果示例 - 有效
 */
export const mockValidValidationResult: ValidationResult = {
  valid: true,
  errors: []
};

/**
 * 验证结果示例 - 无效
 */
export const mockInvalidValidationResult: ValidationResult = {
  valid: false,
  errors: [
    {
      code: 'INVALID_CARD_ID',
      message: '卡片ID不能为空',
      field: 'cardId'
    }
  ]
};

/**
 * 验证结果示例 - 多个错误
 */
export const mockMultipleErrorsValidationResult: ValidationResult = {
  valid: false,
  errors: [
    {
      code: 'INVALID_CARD_ID',
      message: '卡片ID不能为空',
      field: 'cardId'
    },
    {
      code: 'INVALID_FILE_PATH',
      message: '文件路径不能为空',
      field: 'filePath'
    },
    {
      code: 'INVALID_RESOURCE_FIELD',
      message: '资源字段不能为空',
      field: 'resourceField'
    }
  ]
};

/**
 * 各种验证错误
 */
export const mockValidationErrors: ValidationError[] = [
  { code: 'INVALID_CARD_ID', message: '卡片ID不能为空', field: 'cardId' },
  { code: 'INVALID_FILE_PATH', message: '文件路径不能为空', field: 'filePath' },
  { code: 'INVALID_RESOURCE_FIELD', message: '资源字段不能为空', field: 'resourceField' },
  { code: 'CARD_NOT_FOUND', message: '卡片不存在', field: 'cardId' },
  { code: 'FILE_NOT_FOUND', message: '文件不存在', field: 'filePath' },
  { code: 'DUPLICATE_BINDING', message: '重复的绑定' }
];
