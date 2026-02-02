/**
 * AIServiceClient 单元测试
 * @module tests/unit/adapters/AIServiceClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIServiceClient, AIServiceError, AIMatchRequest } from '@/adapters/AIServiceClient';
import type { AIServiceConfig } from '@/types/config';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

// 创建模拟响应
function createMockResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data)
  });
}

// 创建错误响应
function createErrorResponse(code: string, message: string, status = 400) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({
      error: { code, message }
    })
  });
}

describe('AIServiceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===== 基础功能测试 =====
  describe('基础功能', () => {
    it('应该正确初始化', () => {
      const client = new AIServiceClient(defaultConfig);
      expect(client).toBeDefined();
    });
  });

  // ===== isAvailable 测试 =====
  describe('isAvailable', () => {
    it('当服务健康时应该返回 true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      });

      const client = new AIServiceClient(defaultConfig);
      const available = await client.isAvailable();

      expect(available).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.chips.ai/api/v1/health',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Authorization': 'Bearer test-token' }
        })
      );
    });

    it('当服务不可用时应该返回 false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503
      });

      const client = new AIServiceClient(defaultConfig);
      const available = await client.isAvailable();

      expect(available).toBe(false);
    });

    it('当网络错误时应该返回 false', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = new AIServiceClient(defaultConfig);
      const available = await client.isAvailable();

      expect(available).toBe(false);
    });
  });

  // ===== smartMatch 测试 =====
  describe('smartMatch', () => {
    const mockRequest: AIMatchRequest = {
      cards: [{ id: 'card-1', name: 'Episode 01' }],
      files: [{ path: '/ep01.mp4', name: 'ep01.mp4' }]
    };

    const mockSuccessResponse = {
      matches: [
        { card_id: 'card-1', file_path: '/ep01.mp4', confidence: 95, reason: 'Number match' }
      ],
      unmatched: { cards: [], files: [] },
      metadata: { processing_time: 100, model_version: 'v1.0' }
    };

    it('应该成功调用智能匹配接口', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockSuccessResponse));

      const client = new AIServiceClient(defaultConfig);
      const result = await client.smartMatch(mockRequest);

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].card_id).toBe('card-1');
      expect(result.matches[0].confidence).toBe(95);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.chips.ai/api/v1/smart-match',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }
        })
      );
    });

    it('应该合并默认选项', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockSuccessResponse));

      const client = new AIServiceClient(defaultConfig);
      await client.smartMatch(mockRequest);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.options.language).toBe('auto');
      expect(body.options.min_confidence).toBe(30);
    });

    it('应该正确处理认证失败 (AI-002)', async () => {
      mockFetch.mockResolvedValue(createErrorResponse('AI-002', '认证失败', 401));

      const client = new AIServiceClient({
        ...defaultConfig,
        retry: { maxAttempts: 1, delay: 10 }
      });

      await expect(client.smartMatch(mockRequest)).rejects.toThrow(AIServiceError);
    }, 10000);

    it('应该正确处理请求格式错误 (AI-001)', async () => {
      mockFetch.mockResolvedValueOnce(createErrorResponse('AI-001', '请求格式错误', 400));

      const client = new AIServiceClient(defaultConfig);

      await expect(client.smartMatch(mockRequest)).rejects.toThrow(AIServiceError);
    });

    it('应该正确处理配额超限 (AI-003)', async () => {
      mockFetch.mockResolvedValueOnce(createErrorResponse('AI-003', '配额超限', 429));

      const client = new AIServiceClient(defaultConfig);

      await expect(client.smartMatch(mockRequest)).rejects.toMatchObject({
        code: 'AI-003'
      });
    });
  });

  // ===== 重试逻辑测试 =====
  describe('重试逻辑', () => {
    it('应该在服务不可用时重试', async () => {
      const mockResponse = {
        matches: [],
        unmatched: { cards: [], files: [] },
        metadata: { processing_time: 100, model_version: 'v1.0' }
      };

      // 前两次失败，第三次成功
      mockFetch
        .mockResolvedValueOnce(createErrorResponse('AI-004', '服务不可用', 503))
        .mockResolvedValueOnce(createErrorResponse('AI-004', '服务不可用', 503))
        .mockResolvedValueOnce(createMockResponse(mockResponse));

      const client = new AIServiceClient({
        ...defaultConfig,
        retry: { maxAttempts: 3, delay: 10 }
      });

      // 需要advance timers来处理重试延迟
      const promise = client.smartMatch({
        cards: [],
        files: []
      });

      // 处理第一次重试的延迟
      await vi.advanceTimersByTimeAsync(20);
      // 处理第二次重试的延迟
      await vi.advanceTimersByTimeAsync(40);

      const result = await promise;

      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('不应该在认证失败时重试', async () => {
      mockFetch.mockResolvedValue(createErrorResponse('AI-002', '认证失败', 401));

      const client = new AIServiceClient({
        ...defaultConfig,
        retry: { maxAttempts: 3, delay: 10 }
      });

      await expect(client.smartMatch({ cards: [], files: [] })).rejects.toThrow();

      // 认证失败不应该重试
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('不应该在配额超限时重试', async () => {
      mockFetch.mockResolvedValue(createErrorResponse('AI-003', '配额超限', 429));

      const client = new AIServiceClient({
        ...defaultConfig,
        retry: { maxAttempts: 3, delay: 10 }
      });

      await expect(client.smartMatch({ cards: [], files: [] })).rejects.toThrow();

      // 配额超限不应该重试
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('达到最大重试次数后应该抛出错误', async () => {
      // 使用真实计时器进行这个测试
      vi.useRealTimers();
      
      mockFetch.mockResolvedValue(createErrorResponse('AI-004', '服务不可用', 503));

      const client = new AIServiceClient({
        ...defaultConfig,
        retry: { maxAttempts: 2, delay: 10 }
      });

      await expect(client.smartMatch({ cards: [], files: [] })).rejects.toThrow(AIServiceError);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // 恢复fake timers
      vi.useFakeTimers();
    }, 10000);
  });

  // ===== 超时测试 =====
  describe('超时处理', () => {
    it('应该在超时后抛出错误', async () => {
      // 使用真实计时器
      vi.useRealTimers();
      
      // 清除之前的mock并模拟一个响应AbortSignal的请求
      mockFetch.mockReset();
      mockFetch.mockImplementation((url: string, options: { signal?: AbortSignal }) => {
        return new Promise((resolve, reject) => {
          // 监听abort事件
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }
          // 这个Promise永远不会resolve，等待被abort
        });
      });

      const client = new AIServiceClient({
        ...defaultConfig,
        timeout: 50,
        retry: { maxAttempts: 1, delay: 10 }
      });

      await expect(client.smartMatch({ cards: [], files: [] })).rejects.toMatchObject({
        code: 'AI-005'
      });
      
      // 恢复fake timers
      vi.useFakeTimers();
    }, 10000);
  });

  // ===== 错误码映射测试 =====
  describe('错误码映射', () => {
    const testCases = [
      { status: 400, expectedCode: 'AI-001' },
      { status: 401, expectedCode: 'AI-002' },
      { status: 403, expectedCode: 'AI-002' },
      { status: 429, expectedCode: 'AI-003' },
      { status: 503, expectedCode: 'AI-004' },
      { status: 504, expectedCode: 'AI-004' },
      { status: 408, expectedCode: 'AI-005' },
      { status: 500, expectedCode: 'AI-004' }
    ];

    testCases.forEach(({ status, expectedCode }) => {
      it(`HTTP ${status} 应该映射到 ${expectedCode}`, async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
          json: () => Promise.resolve({})
        });

        const client = new AIServiceClient({
          ...defaultConfig,
          retry: { maxAttempts: 1, delay: 10 }
        });

        try {
          await client.smartMatch({ cards: [], files: [] });
        } catch (error) {
          expect(error).toBeInstanceOf(AIServiceError);
          expect((error as AIServiceError).code).toBe(expectedCode);
        }
      });
    });
  });

  // ===== AIServiceError 测试 =====
  describe('AIServiceError', () => {
    it('应该正确创建错误实例', () => {
      const error = new AIServiceError('AI-001', '测试错误', { detail: 'info' });

      expect(error.code).toBe('AI-001');
      expect(error.message).toBe('测试错误');
      expect(error.details).toEqual({ detail: 'info' });
      expect(error.name).toBe('AIServiceError');
    });
  });
});
