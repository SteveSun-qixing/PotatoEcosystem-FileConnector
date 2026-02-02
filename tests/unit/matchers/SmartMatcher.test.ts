/**
 * SmartMatcher 单元测试
 * @module tests/unit/matchers/SmartMatcher
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SmartMatcher } from '@/core/matchers/SmartMatcher';
import { AIServiceClient, AIServiceError } from '@/adapters/AIServiceClient';
import { createCardInfo, createFileInfo } from '../../fixtures';
import type { AIServiceConfig } from '@/types/config';

// Mock AIServiceClient
vi.mock('@/adapters/AIServiceClient', () => {
  return {
    AIServiceClient: vi.fn(),
    AIServiceError: class AIServiceError extends Error {
      constructor(public code: string, message: string, public details?: unknown) {
        super(message);
        this.name = 'AIServiceError';
      }
    }
  };
});

// 默认配置
const defaultConfig: AIServiceConfig = {
  endpoint: 'https://api.chips.ai',
  token: 'test-token',
  timeout: 5000,
  retry: {
    maxAttempts: 3,
    delay: 100
  },
  defaults: {
    language: 'auto',
    minConfidence: 30
  }
};

describe('SmartMatcher', () => {
  let mockIsAvailable: ReturnType<typeof vi.fn>;
  let mockSmartMatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockIsAvailable = vi.fn();
    mockSmartMatch = vi.fn();

    (AIServiceClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      isAvailable: mockIsAvailable,
      smartMatch: mockSmartMatch
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===== 基础功能测试 =====
  describe('基础功能', () => {
    it('应该正确初始化', () => {
      const matcher = new SmartMatcher(defaultConfig);
      expect(matcher).toBeDefined();
      expect(matcher.fallbackMode).toBe(false);
    });

    it('空输入应该返回空结果', async () => {
      const matcher = new SmartMatcher(defaultConfig);
      
      const result = await matcher.match([], []);
      
      expect(result.bindings).toHaveLength(0);
      expect(result.unmatchedCards).toHaveLength(0);
      expect(result.unmatchedFiles).toHaveLength(0);
    });
  });

  // ===== prepareRequest 测试 =====
  describe('prepareRequest', () => {
    it('应该正确准备请求数据', () => {
      const matcher = new SmartMatcher(defaultConfig);
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Episode 01', type: 'video', description: '第一集' }),
        createCardInfo({ id: 'card-2', name: 'Episode 02', type: 'video' })
      ];
      const files = [
        createFileInfo({ path: '/ep01.mp4', name: 'ep01.mp4', size: 1024, type: 'video' }),
        createFileInfo({ path: '/ep02.mp4', name: 'ep02.mp4', size: 2048, type: 'video' })
      ];
      
      const request = matcher.prepareRequest(cards, files);
      
      expect(request.cards).toHaveLength(2);
      expect(request.cards[0]).toEqual({
        id: 'card-1',
        name: 'Episode 01',
        type: 'video',
        description: '第一集'
      });
      
      expect(request.files).toHaveLength(2);
      expect(request.files[0]).toEqual({
        path: '/ep01.mp4',
        name: 'ep01.mp4',
        size: 1024,
        type: 'video'
      });
      
      expect(request.options).toEqual({
        language: 'auto',
        min_confidence: 30
      });
    });
  });

  // ===== match 测试 (AI成功场景) =====
  describe('match - AI成功场景', () => {
    it('应该成功调用AI服务并返回结果', async () => {
      mockIsAvailable.mockResolvedValue(true);
      mockSmartMatch.mockResolvedValue({
        matches: [
          { card_id: 'card-1', file_path: '/ep01.mp4', confidence: 95, reason: 'Number match' },
          { card_id: 'card-2', file_path: '/ep02.mp4', confidence: 90, reason: 'Number match' }
        ],
        unmatched: { cards: [], files: [] },
        metadata: { processing_time: 100, model_version: 'v1.0' }
      });

      const matcher = new SmartMatcher(defaultConfig);
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Episode 01' }),
        createCardInfo({ id: 'card-2', name: 'Episode 02' })
      ];
      const files = [
        createFileInfo({ path: '/ep01.mp4', name: 'ep01.mp4' }),
        createFileInfo({ path: '/ep02.mp4', name: 'ep02.mp4' })
      ];

      const result = await matcher.match(cards, files);

      expect(result.bindings).toHaveLength(2);
      expect(result.bindings[0].cardId).toBe('card-1');
      expect(result.bindings[0].filePath).toBe('/ep01.mp4');
      expect(result.bindings[0].confidence).toBe(95);
      expect(result.metadata.modelVersion).toBe('v1.0');
      expect(matcher.fallbackMode).toBe(false);
    });

    it('应该正确处理未匹配项', async () => {
      mockIsAvailable.mockResolvedValue(true);
      mockSmartMatch.mockResolvedValue({
        matches: [
          { card_id: 'card-1', file_path: '/ep01.mp4', confidence: 85 }
        ],
        unmatched: {
          cards: ['card-2', 'card-3'],
          files: ['/extra.mp4']
        },
        metadata: { processing_time: 100, model_version: 'v1.0' }
      });

      const matcher = new SmartMatcher(defaultConfig);
      const cards = [
        createCardInfo({ id: 'card-1' }),
        createCardInfo({ id: 'card-2' }),
        createCardInfo({ id: 'card-3' })
      ];
      const files = [
        createFileInfo({ path: '/ep01.mp4' }),
        createFileInfo({ path: '/extra.mp4' })
      ];

      const result = await matcher.match(cards, files);

      expect(result.bindings).toHaveLength(1);
      expect(result.unmatchedCards).toEqual(['card-2', 'card-3']);
      expect(result.unmatchedFiles).toEqual(['/extra.mp4']);
    });
  });

  // ===== match 测试 (AI降级场景) =====
  describe('match - AI降级场景', () => {
    it('AI服务不可用时应该降级到自动匹配', async () => {
      mockIsAvailable.mockResolvedValue(false);

      const matcher = new SmartMatcher(defaultConfig);
      const cards = [
        createCardInfo({ id: 'card-01', name: 'Episode 01' }),
        createCardInfo({ id: 'card-02', name: 'Episode 02' })
      ];
      const files = [
        createFileInfo({ path: '/ep01.mp4', name: 'ep01.mp4' }),
        createFileInfo({ path: '/ep02.mp4', name: 'ep02.mp4' })
      ];

      const result = await matcher.match(cards, files);

      expect(matcher.fallbackMode).toBe(true);
      expect(result.bindings.length).toBeGreaterThan(0);
      expect(result.metadata.modelVersion).toContain('fallback');
    });

    it('AI服务调用失败时应该降级', async () => {
      mockIsAvailable.mockResolvedValue(true);
      mockSmartMatch.mockRejectedValue(new AIServiceError('AI-004', '服务不可用'));

      const matcher = new SmartMatcher(defaultConfig);
      const cards = [
        createCardInfo({ id: 'card-01', name: 'Episode 01' })
      ];
      const files = [
        createFileInfo({ path: '/ep01.mp4', name: 'ep01.mp4' })
      ];

      const result = await matcher.match(cards, files);

      expect(matcher.fallbackMode).toBe(true);
      expect(result.bindings).toBeDefined();
    });

    it('降级结果应该包含原因说明', async () => {
      mockIsAvailable.mockResolvedValue(false);

      const matcher = new SmartMatcher(defaultConfig);
      const cards = [
        createCardInfo({ id: 'card-01', name: 'Episode 01' })
      ];
      const files = [
        createFileInfo({ path: '/ep01.mp4', name: 'ep01.mp4' })
      ];

      const result = await matcher.match(cards, files);

      if (result.bindings.length > 0) {
        expect(result.bindings[0].reason).toContain('AI服务不可用');
      }
    });
  });

  // ===== classifyConfidence 测试 =====
  describe('classifyConfidence', () => {
    it('应该正确分类高置信度匹配 (>=80%)', () => {
      const matcher = new SmartMatcher(defaultConfig);
      
      const bindings = [
        { cardId: 'c1', filePath: '/f1', resourceField: 'rf', confidence: 95 },
        { cardId: 'c2', filePath: '/f2', resourceField: 'rf', confidence: 80 },
        { cardId: 'c3', filePath: '/f3', resourceField: 'rf', confidence: 85 }
      ];

      const classified = matcher.classifyConfidence(bindings);

      expect(classified.high).toHaveLength(3);
      expect(classified.medium).toHaveLength(0);
      expect(classified.low).toHaveLength(0);
    });

    it('应该正确分类中置信度匹配 (50-79%)', () => {
      const matcher = new SmartMatcher(defaultConfig);
      
      const bindings = [
        { cardId: 'c1', filePath: '/f1', resourceField: 'rf', confidence: 79 },
        { cardId: 'c2', filePath: '/f2', resourceField: 'rf', confidence: 50 },
        { cardId: 'c3', filePath: '/f3', resourceField: 'rf', confidence: 65 }
      ];

      const classified = matcher.classifyConfidence(bindings);

      expect(classified.high).toHaveLength(0);
      expect(classified.medium).toHaveLength(3);
      expect(classified.low).toHaveLength(0);
    });

    it('应该正确分类低置信度匹配 (<50%)', () => {
      const matcher = new SmartMatcher(defaultConfig);
      
      const bindings = [
        { cardId: 'c1', filePath: '/f1', resourceField: 'rf', confidence: 49 },
        { cardId: 'c2', filePath: '/f2', resourceField: 'rf', confidence: 30 },
        { cardId: 'c3', filePath: '/f3', resourceField: 'rf', confidence: 10 }
      ];

      const classified = matcher.classifyConfidence(bindings);

      expect(classified.high).toHaveLength(0);
      expect(classified.medium).toHaveLength(0);
      expect(classified.low).toHaveLength(3);
    });

    it('应该正确处理混合置信度', () => {
      const matcher = new SmartMatcher(defaultConfig);
      
      const bindings = [
        { cardId: 'c1', filePath: '/f1', resourceField: 'rf', confidence: 95 },  // high
        { cardId: 'c2', filePath: '/f2', resourceField: 'rf', confidence: 65 },  // medium
        { cardId: 'c3', filePath: '/f3', resourceField: 'rf', confidence: 30 },  // low
        { cardId: 'c4', filePath: '/f4', resourceField: 'rf', confidence: 80 },  // high (边界)
        { cardId: 'c5', filePath: '/f5', resourceField: 'rf', confidence: 50 },  // medium (边界)
        { cardId: 'c6', filePath: '/f6', resourceField: 'rf', confidence: 49 }   // low (边界)
      ];

      const classified = matcher.classifyConfidence(bindings);

      expect(classified.high).toHaveLength(2);
      expect(classified.medium).toHaveLength(2);
      expect(classified.low).toHaveLength(2);
    });

    it('应该保留reason字段', () => {
      const matcher = new SmartMatcher(defaultConfig);
      
      const bindings = [
        { cardId: 'c1', filePath: '/f1', resourceField: 'rf', confidence: 95, reason: 'Perfect match' }
      ];

      const classified = matcher.classifyConfidence(bindings);

      expect(classified.high[0].reason).toBe('Perfect match');
    });

    it('空绑定应该返回空分类', () => {
      const matcher = new SmartMatcher(defaultConfig);
      
      const classified = matcher.classifyConfidence([]);

      expect(classified.high).toHaveLength(0);
      expect(classified.medium).toHaveLength(0);
      expect(classified.low).toHaveLength(0);
    });
  });

  // ===== 自定义阈值测试 =====
  describe('自定义阈值', () => {
    it('应该支持自定义置信度阈值', () => {
      const matcher = new SmartMatcher(defaultConfig, {
        high: 90,
        medium: 60
      });
      
      const bindings = [
        { cardId: 'c1', filePath: '/f1', resourceField: 'rf', confidence: 95 },  // high
        { cardId: 'c2', filePath: '/f2', resourceField: 'rf', confidence: 85 },  // medium (旧规则是high)
        { cardId: 'c3', filePath: '/f3', resourceField: 'rf', confidence: 55 },  // low (旧规则是medium)
      ];

      const classified = matcher.classifyConfidence(bindings);

      expect(classified.high).toHaveLength(1);
      expect(classified.medium).toHaveLength(1);
      expect(classified.low).toHaveLength(1);
    });
  });

  // ===== checkAvailability 测试 =====
  describe('checkAvailability', () => {
    it('应该正确检查AI服务可用性', async () => {
      mockIsAvailable.mockResolvedValue(true);

      const matcher = new SmartMatcher(defaultConfig);
      const available = await matcher.checkAvailability();

      expect(available).toBe(true);
    });

    it('AI服务不可用时应该返回false', async () => {
      mockIsAvailable.mockResolvedValue(false);

      const matcher = new SmartMatcher(defaultConfig);
      const available = await matcher.checkAvailability();

      expect(available).toBe(false);
    });
  });

  // ===== fallbackMatch 测试 =====
  describe('fallbackMatch', () => {
    it('应该使用SchemeGenerator进行降级匹配', () => {
      const matcher = new SmartMatcher(defaultConfig);
      
      const cards = [
        createCardInfo({ id: 'card-01', name: 'Episode 01' }),
        createCardInfo({ id: 'card-02', name: 'Episode 02' })
      ];
      const files = [
        createFileInfo({ path: '/ep01.mp4', name: 'ep01.mp4' }),
        createFileInfo({ path: '/ep02.mp4', name: 'ep02.mp4' })
      ];

      const result = matcher.fallbackMatch(cards, files);

      expect(result.bindings).toBeDefined();
      expect(result.metadata.modelVersion).toContain('fallback');
    });

    it('空数据应该返回空结果', () => {
      const matcher = new SmartMatcher(defaultConfig);
      
      const result = matcher.fallbackMatch([], []);

      expect(result.bindings).toHaveLength(0);
    });
  });

  // ===== parseResponse 测试 =====
  describe('parseResponse', () => {
    it('应该正确解析AI响应', () => {
      const matcher = new SmartMatcher(defaultConfig);
      
      const response = {
        matches: [
          { card_id: 'c1', file_path: '/f1.mp4', confidence: 95, reason: 'Test' }
        ],
        unmatched: { cards: ['c2'], files: ['/f2.mp4'] },
        metadata: { processing_time: 123, model_version: 'v2.0' }
      };

      const result = matcher.parseResponse(response);

      expect(result.bindings).toHaveLength(1);
      expect(result.bindings[0].cardId).toBe('c1');
      expect(result.bindings[0].filePath).toBe('/f1.mp4');
      expect(result.bindings[0].confidence).toBe(95);
      expect(result.bindings[0].reason).toBe('Test');
      expect(result.bindings[0].resourceField).toBe('primary_resource');
      expect(result.unmatchedCards).toEqual(['c2']);
      expect(result.unmatchedFiles).toEqual(['/f2.mp4']);
      expect(result.metadata.processingTime).toBe(123);
      expect(result.metadata.modelVersion).toBe('v2.0');
    });
  });
});
