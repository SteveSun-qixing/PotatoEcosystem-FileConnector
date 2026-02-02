/**
 * 方案生成器
 * 整合所有匹配器，生成并评估多个匹配方案
 * @module core/matchers/SchemeGenerator
 */

import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';
import type { MatchScheme, MatchOptions, SchemeScore } from '@/types/match';
import { IMatcher } from './BaseMatcher';
import { NumberSequenceMatcher } from './NumberSequenceMatcher';
import { KeywordMatcher } from './KeywordMatcher';
import { FileOrderMatcher } from './FileOrderMatcher';

/**
 * 方案生成器配置
 */
interface SchemeGeneratorConfig {
  /** 自动选择置信度阈值 */
  autoSelectThreshold: number;
  /** 是否包含所有方案（即使不适用） */
  includeAllSchemes: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: SchemeGeneratorConfig = {
  autoSelectThreshold: 85,
  includeAllSchemes: false
};

/**
 * 方案生成器
 * 整合三种匹配器，生成多个匹配方案并进行评估和排序
 */
export class SchemeGenerator {
  private matchers: IMatcher[];
  private config: SchemeGeneratorConfig;
  
  constructor(config: Partial<SchemeGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // 初始化所有匹配器
    this.matchers = [
      new NumberSequenceMatcher(),
      new KeywordMatcher(),
      new FileOrderMatcher()
    ];
  }
  
  /**
   * 添加自定义匹配器
   */
  addMatcher(matcher: IMatcher): void {
    this.matchers.push(matcher);
  }
  
  /**
   * 生成所有可能的匹配方案
   * @param cards 卡片列表
   * @param files 文件列表
   * @param options 匹配选项
   * @returns 按置信度排序的方案列表
   */
  generateAll(
    cards: CardInfo[],
    files: FileInfo[],
    options?: MatchOptions
  ): MatchScheme[] {
    const schemes: MatchScheme[] = [];
    
    for (const matcher of this.matchers) {
      // 检查匹配器是否适用
      const isApplicable = matcher.isApplicable(cards, files);
      
      if (isApplicable || this.config.includeAllSchemes) {
        try {
          const scheme = matcher.match(cards, files, options);
          
          // 只添加有实际绑定的方案（或顺序匹配作为后备）
          if (scheme.bindings.length > 0 || matcher.mode === 'file_order') {
            schemes.push(scheme);
          }
        } catch (error) {
          console.warn(`Matcher ${matcher.name} failed:`, error);
        }
      }
    }
    
    // 按置信度降序排序
    return schemes.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * 评估单个方案的质量
   * @param scheme 方案
   * @param totalCards 总卡片数
   * @param totalFiles 总文件数
   * @returns 方案评分详情
   */
  evaluateScheme(
    scheme: MatchScheme,
    totalCards: number,
    totalFiles: number
  ): SchemeScore {
    // 匹配率
    const maxTotal = Math.max(totalCards, totalFiles);
    const matchRate = maxTotal > 0 ? scheme.bindings.length / maxTotal : 0;
    
    // 冲突率
    const conflictCount = scheme.conflicts?.length || 0;
    const conflictRate = maxTotal > 0 ? conflictCount / maxTotal : 0;
    
    // 覆盖率（卡片和文件各占50%权重）
    const cardCoverage = totalCards > 0 
      ? (totalCards - scheme.unmatchedCards.length) / totalCards 
      : 0;
    const fileCoverage = totalFiles > 0 
      ? (totalFiles - scheme.unmatchedFiles.length) / totalFiles 
      : 0;
    const coverage = (cardCoverage + fileCoverage) / 2;
    
    // 一致性（数量是否一致）
    const consistency = totalCards === totalFiles
      ? 1
      : 1 - Math.abs(totalCards - totalFiles) / Math.max(totalCards, totalFiles);
    
    // 综合评分（加权平均）
    const totalScore = (
      matchRate * 0.4 +
      (1 - conflictRate) * 0.2 +
      coverage * 0.3 +
      consistency * 0.1
    ) * 100;
    
    return {
      scheme,
      scores: {
        matchRate,
        conflictRate,
        coverage,
        consistency
      },
      totalScore: Math.round(totalScore)
    };
  }
  
  /**
   * 评估所有方案
   */
  evaluateAll(
    schemes: MatchScheme[],
    totalCards: number,
    totalFiles: number
  ): SchemeScore[] {
    return schemes
      .map(scheme => this.evaluateScheme(scheme, totalCards, totalFiles))
      .sort((a, b) => b.totalScore - a.totalScore);
  }
  
  /**
   * 选择最佳方案
   * @param schemes 方案列表
   * @returns 最佳方案，如果没有则返回null
   */
  selectBestScheme(schemes: MatchScheme[]): MatchScheme | null {
    if (schemes.length === 0) {
      return null;
    }
    
    // 找到置信度最高的方案
    const sorted = [...schemes].sort((a, b) => b.confidence - a.confidence);
    return sorted[0];
  }
  
  /**
   * 自动选择方案
   * 如果最佳方案的置信度超过阈值，自动选择它
   * @param schemes 方案列表
   * @returns 自动选择的方案，或null表示需要手动选择
   */
  autoSelect(schemes: MatchScheme[]): MatchScheme | null {
    const best = this.selectBestScheme(schemes);
    
    if (best && best.confidence >= this.config.autoSelectThreshold) {
      return best;
    }
    
    return null;
  }
  
  /**
   * 生成方案并自动选择
   * 便捷方法，一步完成生成和选择
   */
  generateAndSelect(
    cards: CardInfo[],
    files: FileInfo[],
    options?: MatchOptions
  ): {
    schemes: MatchScheme[];
    selected: MatchScheme | null;
    autoSelected: boolean;
  } {
    const schemes = this.generateAll(cards, files, options);
    const autoSelected = this.autoSelect(schemes);
    
    return {
      schemes,
      selected: autoSelected || this.selectBestScheme(schemes),
      autoSelected: autoSelected !== null
    };
  }
  
  /**
   * 获取方案统计摘要
   */
  getSchemeSummary(schemes: MatchScheme[]): {
    total: number;
    byMode: Record<string, number>;
    bestConfidence: number;
    averageConfidence: number;
  } {
    const byMode: Record<string, number> = {};
    let totalConfidence = 0;
    let bestConfidence = 0;
    
    for (const scheme of schemes) {
      byMode[scheme.mode] = (byMode[scheme.mode] || 0) + 1;
      totalConfidence += scheme.confidence;
      bestConfidence = Math.max(bestConfidence, scheme.confidence);
    }
    
    return {
      total: schemes.length,
      byMode,
      bestConfidence,
      averageConfidence: schemes.length > 0 
        ? Math.round(totalConfidence / schemes.length) 
        : 0
    };
  }
}
