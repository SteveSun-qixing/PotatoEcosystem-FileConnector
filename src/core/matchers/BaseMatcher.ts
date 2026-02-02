/**
 * 匹配器基础接口定义
 * @module core/matchers/BaseMatcher
 */

import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';
import type { MatchMode, MatchOptions, MatchScheme } from '@/types/match';

/**
 * 匹配器接口
 * 所有匹配算法都需要实现此接口
 */
export interface IMatcher {
  /** 匹配器名称 */
  readonly name: string;
  /** 匹配模式 */
  readonly mode: MatchMode;
  
  /**
   * 执行匹配
   * @param cards 卡片列表
   * @param files 文件列表
   * @param options 匹配选项
   * @returns 匹配方案
   */
  match(cards: CardInfo[], files: FileInfo[], options?: MatchOptions): MatchScheme;
  
  /**
   * 检查此匹配器是否适用于当前数据
   * @param cards 卡片列表
   * @param files 文件列表
   * @returns 是否适用
   */
  isApplicable(cards: CardInfo[], files: FileInfo[]): boolean;
}

/**
 * 匹配器基类
 * 提供公共功能的默认实现
 */
export abstract class BaseMatcher implements IMatcher {
  abstract readonly name: string;
  abstract readonly mode: MatchMode;
  
  abstract match(cards: CardInfo[], files: FileInfo[], options?: MatchOptions): MatchScheme;
  
  /**
   * 默认实现：总是适用
   */
  isApplicable(_cards: CardInfo[], _files: FileInfo[]): boolean {
    return true;
  }
  
  /**
   * 创建空的匹配方案
   */
  protected createEmptyScheme(): MatchScheme {
    return {
      mode: this.mode,
      confidence: 0,
      bindings: [],
      unmatchedCards: [],
      unmatchedFiles: []
    };
  }
  
  /**
   * 计算基础置信度
   * @param matchedCount 匹配数量
   * @param totalCards 总卡片数
   * @param totalFiles 总文件数
   */
  protected calculateBaseConfidence(
    matchedCount: number,
    totalCards: number,
    totalFiles: number
  ): number {
    if (totalCards === 0 || totalFiles === 0) return 0;
    
    const maxTotal = Math.max(totalCards, totalFiles);
    const matchRate = matchedCount / maxTotal;
    
    // 基础分数：匹配率 * 100
    let confidence = matchRate * 100;
    
    // 数量一致性加分
    if (totalCards === totalFiles) {
      confidence += 5;
    }
    
    return Math.min(100, Math.max(0, confidence));
  }
}
