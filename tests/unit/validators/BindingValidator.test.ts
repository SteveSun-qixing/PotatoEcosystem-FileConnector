/**
 * BindingValidator 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BindingValidator, ValidationErrorCodes } from '@/core/validators/BindingValidator';
import type { BindingItem } from '@/types/binding';
import type { CardInfo, ResourceMode } from '@/types/card';

// Mock SDK
const createMockSDK = () => ({
  getCard: vi.fn(),
  fileExists: vi.fn()
});

// 创建测试卡片
const createMockCard = (id: string, overrides?: Partial<CardInfo>): CardInfo => ({
  id,
  name: `Card ${id}`,
  type: 'video',
  path: `/cards/${id}`,
  baseCards: [
    {
      id: 'base1',
      pluginType: 'video',
      resourceFields: [
        {
          name: 'videoFile',
          type: 'file',
          required: true,
          allowedTypes: ['video']
        },
        {
          name: 'coverImage',
          type: 'file',
          required: false,
          allowedTypes: ['image']
        }
      ]
    }
  ],
  resourceMode: 'empty' as ResourceMode,
  metadata: {
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
    version: '1.0.0',
    tags: []
  },
  ...overrides
});

// 创建测试绑定
const createMockBinding = (overrides?: Partial<BindingItem>): BindingItem => ({
  cardId: 'card1',
  resourceField: 'videoFile',
  filePath: '/path/to/video.mp4',
  ...overrides
});

describe('BindingValidator', () => {
  let sdk: ReturnType<typeof createMockSDK>;
  let validator: BindingValidator;

  beforeEach(() => {
    sdk = createMockSDK();
    validator = new BindingValidator(sdk);
  });

  describe('validateBinding', () => {
    it('应该验证通过有效的绑定', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));
      sdk.fileExists.mockResolvedValue(true);

      const binding = createMockBinding();
      const result = await validator.validateBinding(binding);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝空的卡片ID', async () => {
      const binding = createMockBinding({ cardId: '' });
      const result = await validator.validateBinding(binding);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.INVALID_CARD_ID)).toBe(true);
    });

    it('应该拒绝空的文件路径', async () => {
      const binding = createMockBinding({ filePath: '' });
      const result = await validator.validateBinding(binding);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.INVALID_FILE_PATH)).toBe(true);
    });

    it('应该拒绝空的资源字段', async () => {
      const binding = createMockBinding({ resourceField: '' });
      const result = await validator.validateBinding(binding);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.INVALID_RESOURCE_FIELD)).toBe(true);
    });

    it('应该检测不存在的卡片', async () => {
      sdk.getCard.mockResolvedValue(null);

      const binding = createMockBinding();
      const result = await validator.validateBinding(binding);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.CARD_NOT_FOUND)).toBe(true);
    });

    it('应该检测不存在的文件', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));
      sdk.fileExists.mockResolvedValue(false);

      const binding = createMockBinding();
      const result = await validator.validateBinding(binding);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.FILE_NOT_FOUND)).toBe(true);
    });

    it('应该检测不存在的资源字段', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));
      sdk.fileExists.mockResolvedValue(true);

      const binding = createMockBinding({ resourceField: 'nonExistentField' });
      const result = await validator.validateBinding(binding);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.RESOURCE_FIELD_NOT_FOUND)).toBe(true);
    });

    it('应该检测文件类型不匹配', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));
      sdk.fileExists.mockResolvedValue(true);

      // 尝试将图片绑定到视频字段
      const binding = createMockBinding({ filePath: '/path/to/image.jpg' });
      const result = await validator.validateBinding(binding);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.FILE_TYPE_MISMATCH)).toBe(true);
    });

    it('应该允许正确的文件类型', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));
      sdk.fileExists.mockResolvedValue(true);

      // 将图片绑定到图片字段
      const binding = createMockBinding({ 
        resourceField: 'coverImage',
        filePath: '/path/to/image.jpg' 
      });
      const result = await validator.validateBinding(binding);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateBindings', () => {
    it('应该批量验证绑定', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));
      sdk.fileExists.mockResolvedValue(true);

      const bindings = [
        createMockBinding({ cardId: 'card1' }),
        createMockBinding({ cardId: 'card1', filePath: '/path/to/video2.mp4' })
      ];

      const result = await validator.validateBindings(bindings);

      expect(result.total).toBe(2);
      expect(result.valid).toBe(2);
      expect(result.invalid).toBe(0);
    });

    it('应该正确统计无效绑定', async () => {
      sdk.getCard
        .mockResolvedValueOnce(createMockCard('card1'))
        .mockResolvedValueOnce(null);
      sdk.fileExists.mockResolvedValue(true);

      const bindings = [
        createMockBinding({ cardId: 'card1' }),
        createMockBinding({ cardId: 'card2' })
      ];

      const result = await validator.validateBindings(bindings);

      expect(result.total).toBe(2);
      expect(result.valid).toBe(1);
      expect(result.invalid).toBe(1);
    });
  });

  describe('validateCard', () => {
    it('应该返回true当卡片存在时', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));

      const result = await validator.validateCard('card1');

      expect(result).toBe(true);
    });

    it('应该返回false当卡片不存在时', async () => {
      sdk.getCard.mockResolvedValue(null);

      const result = await validator.validateCard('nonexistent');

      expect(result).toBe(false);
    });

    it('应该缓存卡片信息', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));

      await validator.validateCard('card1');
      await validator.validateCard('card1');

      expect(sdk.getCard).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateFile', () => {
    it('应该返回true当文件存在时', async () => {
      sdk.fileExists.mockResolvedValue(true);

      const result = await validator.validateFile('/path/to/file.mp4');

      expect(result).toBe(true);
    });

    it('应该返回false当文件不存在时', async () => {
      sdk.fileExists.mockResolvedValue(false);

      const result = await validator.validateFile('/path/to/nonexistent.mp4');

      expect(result).toBe(false);
    });

    it('应该处理文件检查异常', async () => {
      sdk.fileExists.mockRejectedValue(new Error('File access error'));

      const result = await validator.validateFile('/path/to/file.mp4');

      expect(result).toBe(false);
    });
  });

  describe('validateResourceField', () => {
    it('应该验证资源字段匹配', () => {
      const card = createMockCard('card1');
      const result = validator.validateResourceField(card, 'videoFile', 'video');

      expect(result.valid).toBe(true);
    });

    it('应该检测不匹配的文件类型', () => {
      const card = createMockCard('card1');
      const result = validator.validateResourceField(card, 'videoFile', 'image');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.FILE_TYPE_MISMATCH)).toBe(true);
    });

    it('应该检测不存在的基础卡片', () => {
      const card = createMockCard('card1');
      const result = validator.validateResourceField(card, 'videoFile', 'video', 'nonexistent');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCodes.BASE_CARD_NOT_FOUND)).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('应该清除缓存', async () => {
      sdk.getCard.mockResolvedValue(createMockCard('card1'));

      await validator.validateCard('card1');
      validator.clearCache();
      await validator.validateCard('card1');

      expect(sdk.getCard).toHaveBeenCalledTimes(2);
    });
  });
});
