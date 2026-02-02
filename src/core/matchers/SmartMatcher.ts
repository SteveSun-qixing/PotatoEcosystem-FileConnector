/**
 * 智能匹配器
 * 基于AI服务的智能匹配实现，支持降级到自动匹配
 * @module core/matchers/SmartMatcher
 */

import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';
import type { BindingItem } from '@/types/binding';
import type { SmartMatchResult, ClassifiedMatches } from '@/types/match';
import type { AIServiceConfig } from '@/types/config';
import { AIServiceClient, AIMatchRequest, AIMatchResponse, AIServiceError } from '@/adapters/AIServiceClient';
import { SchemeGenerator } from './SchemeGenerator';

/**
 * 置信度阈值配置
 */
interface ConfidenceThresholds {
  /** 高置信度阈值 */
  high: number;
  /** 中置信度阈值 */
  medium: number;
}

/**
 * 默认阈值
 */
const DEFAULT_THRESHOLDS: ConfidenceThresholds = {
  high: 80,
  medium: 50
};

/**
 * 智能匹配器
 * 使用AI服务进行智能匹配，AI不可用时自动降级到本地匹配
 */
export class SmartMatcher {
  private aiClient: AIServiceClient;
  private schemeGenerator: SchemeGenerator;
  private thresholds: ConfidenceThresholds;
  private _fallbackMode: boolean = false;

  constructor(
    config: AIServiceConfig,
    thresholds: Partial<ConfidenceThresholds> = {}
  ) {
    this.aiClient = new AIServiceClient(config);
    this.schemeGenerator = new SchemeGenerator({
      autoSelectThreshold: 85,
      includeAllSchemes: true
    });
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * 是否处于降级模式
   */
  get fallbackMode(): boolean {
    return this._fallbackMode;
  }

  /**
   * 准备AI请求数据
   * @param cards 卡片列表
   * @param files 文件列表
   * @returns AI请求对象
   */
  prepareRequest(cards: CardInfo[], files: FileInfo[]): AIMatchRequest {
    return {
      cards: cards.map(card => ({
        id: card.id,
        name: card.name,
        type: card.type,
        description: card.description
      })),
      files: files.map(file => ({
        path: file.path,
        name: file.name,
        size: file.size,
        type: this.getFileType(file)
      })),
      options: {
        language: 'auto',
        min_confidence: 30
      }
    };
  }

  /**
   * 执行智能匹配
   * @param cards 卡片列表
   * @param files 文件列表
   * @returns 智能匹配结果
   */
  async match(cards: CardInfo[], files: FileInfo[]): Promise<SmartMatchResult> {
    // 验证输入
    if (cards.length === 0 || files.length === 0) {
      return this.createEmptyResult();
    }

    // 重置降级标志
    this._fallbackMode = false;

    try {
      // 检查AI服务是否可用
      const isAvailable = await this.aiClient.isAvailable();
      
      if (!isAvailable) {
        console.warn('AI service is not available, falling back to auto match');
        this._fallbackMode = true;
        return this.fallbackMatch(cards, files);
      }

      // 准备请求
      const request = this.prepareRequest(cards, files);
      
      // 调用AI服务
      const response = await this.aiClient.smartMatch(request);
      
      // 解析响应
      return this.parseResponse(response);
    } catch (error) {
      // AI服务失败，降级到自动匹配
      console.warn('AI service failed, falling back to auto match:', error);
      this._fallbackMode = true;
      
      if (error instanceof AIServiceError) {
        console.warn(`AI Error [${error.code}]: ${error.message}`);
      }
      
      return this.fallbackMatch(cards, files);
    }
  }

  /**
   * 解析AI响应
   * @param response AI响应
   * @returns 智能匹配结果
   */
  parseResponse(response: AIMatchResponse): SmartMatchResult {
    const bindings: Array<BindingItem & { confidence: number; reason?: string }> = 
      response.matches.map(match => ({
        cardId: match.card_id,
        filePath: match.file_path,
        resourceField: 'primary_resource',
        confidence: match.confidence,
        reason: match.reason
      }));

    return {
      bindings,
      unmatchedCards: response.unmatched.cards,
      unmatchedFiles: response.unmatched.files,
      metadata: {
        processingTime: response.metadata.processing_time,
        modelVersion: response.metadata.model_version
      }
    };
  }

  /**
   * 置信度分级
   * @param bindings 带置信度的绑定列表
   * @returns 分级后的匹配结果
   */
  classifyConfidence(
    bindings: Array<BindingItem & { confidence: number; reason?: string }>
  ): ClassifiedMatches {
    const result: ClassifiedMatches = {
      high: [],
      medium: [],
      low: []
    };

    for (const binding of bindings) {
      if (binding.confidence >= this.thresholds.high) {
        result.high.push(binding);
      } else if (binding.confidence >= this.thresholds.medium) {
        result.medium.push(binding);
      } else {
        result.low.push(binding);
      }
    }

    return result;
  }

  /**
   * AI不可用时降级到自动匹配
   * @param cards 卡片列表
   * @param files 文件列表
   * @returns 降级后的匹配结果
   */
  fallbackMatch(cards: CardInfo[], files: FileInfo[]): SmartMatchResult {
    // 使用SchemeGenerator生成所有方案
    const schemes = this.schemeGenerator.generateAll(cards, files);
    
    if (schemes.length === 0) {
      return this.createEmptyResult();
    }

    // 选择最佳方案
    const best = schemes[0];
    
    // 将方案转换为智能匹配结果格式
    const bindings = best.bindings.map(binding => ({
      ...binding,
      confidence: best.confidence,
      reason: this.getFallbackReason(best.mode)
    }));

    return {
      bindings,
      unmatchedCards: best.unmatchedCards,
      unmatchedFiles: best.unmatchedFiles,
      metadata: {
        processingTime: 0,
        modelVersion: `fallback-${best.mode}`
      }
    };
  }

  /**
   * 检查AI服务是否可用
   */
  async checkAvailability(): Promise<boolean> {
    return this.aiClient.isAvailable();
  }

  /**
   * 获取文件类型字符串
   */
  private getFileType(file: FileInfo): string {
    return file.type || 'unknown';
  }

  /**
   * 获取降级模式原因说明
   */
  private getFallbackReason(mode: string): string {
    const modeNames: Record<string, string> = {
      number_sequence: '数字序列匹配',
      keyword: '关键词匹配',
      file_order: '文件顺序匹配'
    };
    return `使用${modeNames[mode] || mode}（AI服务不可用）`;
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(): SmartMatchResult {
    return {
      bindings: [],
      unmatchedCards: [],
      unmatchedFiles: [],
      metadata: {
        processingTime: 0,
        modelVersion: 'none'
      }
    };
  }
}

/**
 * 创建智能匹配器实例
 * @param config AI服务配置
 * @param thresholds 置信度阈值
 * @returns 智能匹配器实例
 */
export function createSmartMatcher(
  config: AIServiceConfig,
  thresholds?: Partial<ConfidenceThresholds>
): SmartMatcher {
  return new SmartMatcher(config, thresholds);
}
