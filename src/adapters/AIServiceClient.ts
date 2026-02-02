/**
 * AI服务客户端
 * 负责与AI服务通信，实现智能匹配功能
 * @module adapters/AIServiceClient
 */

import type { AIServiceConfig } from '@/types/config';

/**
 * AI匹配请求
 */
export interface AIMatchRequest {
  /** 卡片列表 */
  cards: Array<{
    id: string;
    name: string;
    type?: string;
    description?: string;
  }>;
  /** 文件列表 */
  files: Array<{
    path: string;
    name: string;
    size?: number;
    type?: string;
  }>;
  /** 选项 */
  options?: {
    language?: 'auto' | 'zh' | 'en' | 'ja';
    context?: string;
    max_matches?: number;
    min_confidence?: number;
  };
}

/**
 * AI匹配响应
 */
export interface AIMatchResponse {
  /** 匹配结果 */
  matches: Array<{
    card_id: string;
    file_path: string;
    confidence: number;
    reason?: string;
  }>;
  /** 未匹配项 */
  unmatched: {
    cards: string[];
    files: string[];
  };
  /** 元信息 */
  metadata: {
    processing_time: number;
    model_version: string;
  };
}

/**
 * AI服务错误
 */
export class AIServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

/**
 * 错误码映射
 */
const ERROR_CODE_MAP: Record<string, string> = {
  'AI-001': '请求格式错误',
  'AI-002': '认证失败',
  'AI-003': '配额超限',
  'AI-004': '服务不可用',
  'AI-005': '处理超时'
};

/**
 * AI服务客户端
 * 封装与AI服务的所有通信
 */
export class AIServiceClient {
  private readonly endpoint: string;
  private readonly token: string;
  private readonly timeout: number;
  private readonly maxAttempts: number;
  private readonly retryDelay: number;
  private readonly defaults: {
    language: string;
    minConfidence: number;
  };

  constructor(config: AIServiceConfig) {
    this.endpoint = config.endpoint;
    this.token = config.token;
    this.timeout = config.timeout;
    this.maxAttempts = config.retry.maxAttempts;
    this.retryDelay = config.retry.delay;
    this.defaults = {
      language: config.defaults?.language || 'auto',
      minConfidence: config.defaults?.minConfidence || 30
    };
  }

  /**
   * 智能匹配接口
   * @param request 匹配请求
   * @returns 匹配响应
   */
  async smartMatch(request: AIMatchRequest): Promise<AIMatchResponse> {
    // 合并默认选项
    const mergedRequest: AIMatchRequest = {
      ...request,
      options: {
        language: this.defaults.language as 'auto' | 'zh' | 'en' | 'ja',
        min_confidence: this.defaults.minConfidence,
        ...request.options
      }
    };

    return this.makeRequest<AIMatchResponse>('/api/v1/smart-match', mergedRequest);
  }

  /**
   * 检测服务可用性
   * @returns 服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.endpoint}/api/v1/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 发送HTTP请求（带重试和超时）
   * @param path API路径
   * @param data 请求数据
   * @returns 响应数据
   */
  private async makeRequest<T>(path: string, data: unknown): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await this.doRequest<T>(path, data);
      } catch (error) {
        lastError = error as Error;

        // 判断是否应该重试
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }

        // 指数退避延迟
        const delay = this.calculateDelay(attempt);
        console.warn(
          `AI service request failed (attempt ${attempt}/${this.maxAttempts}), ` +
          `retrying in ${delay}ms...`,
          error
        );
        await this.sleep(delay);
      }
    }

    throw lastError || new AIServiceError('AI-004', '服务不可用');
  }

  /**
   * 执行单次HTTP请求
   */
  private async doRequest<T>(path: string, data: unknown): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.endpoint}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AIServiceError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new AIServiceError('AI-005', '处理超时');
        }
        if (error.message.includes('fetch')) {
          throw new AIServiceError('AI-004', '服务不可用', error);
        }
      }

      throw new AIServiceError('AI-004', '网络错误', error);
    }
  }

  /**
   * 处理错误响应
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: { error?: { code?: string; message?: string; details?: unknown } } = {};

    try {
      errorData = await response.json();
    } catch {
      // JSON解析失败，使用HTTP状态
    }

    const code = errorData.error?.code || this.httpStatusToCode(response.status);
    const message = errorData.error?.message || ERROR_CODE_MAP[code] || `HTTP ${response.status}`;
    const details = errorData.error?.details;

    throw new AIServiceError(code, message, details);
  }

  /**
   * HTTP状态码转错误码
   */
  private httpStatusToCode(status: number): string {
    switch (status) {
      case 400:
        return 'AI-001';
      case 401:
      case 403:
        return 'AI-002';
      case 429:
        return 'AI-003';
      case 503:
      case 504:
        return 'AI-004';
      case 408:
        return 'AI-005';
      default:
        return 'AI-004';
    }
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.maxAttempts) {
      return false;
    }

    if (error instanceof AIServiceError) {
      // 这些错误不应该重试
      const nonRetryableCodes = ['AI-001', 'AI-002', 'AI-003'];
      return !nonRetryableCodes.includes(error.code);
    }

    // 网络错误应该重试
    return true;
  }

  /**
   * 计算指数退避延迟
   */
  private calculateDelay(attempt: number): number {
    // 指数退避: delay * 2^(attempt-1)，最大延迟30秒
    const exponentialDelay = this.retryDelay * Math.pow(2, attempt - 1);
    return Math.min(exponentialDelay, 30000);
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
