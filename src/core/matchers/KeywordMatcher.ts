/**
 * 关键词匹配器
 * 通过分词和相似度计算进行匹配
 * @module core/matchers/KeywordMatcher
 */

import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';
import type { BindingItem } from '@/types/binding';
import type { MatchMode, MatchOptions, MatchScheme } from '@/types/match';
import { BaseMatcher } from './BaseMatcher';
import { tokenize, jaccardSimilarity, editDistanceSimilarity, detectResourceField } from '@/utils/match';

/**
 * 关键词匹配器配置
 */
interface KeywordMatchConfig {
  /** 最低相似度阈值 (0-1) */
  minSimilarity: number;
  /** Jaccard相似度权重 */
  weightJaccard: number;
  /** 编辑距离相似度权重 */
  weightEdit: number;
  /** 数字匹配权重 */
  weightNumber: number;
  /** 忽略词列表 */
  ignoreWords: string[];
}

/**
 * 相似度条目
 */
interface SimilarityEntry {
  cardId: string;
  filePath: string;
  score: number;
  details: {
    jaccard: number;
    edit: number;
    numberMatch: boolean;
  };
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: KeywordMatchConfig = {
  minSimilarity: 0.3,
  weightJaccard: 0.5,
  weightEdit: 0.3,
  weightNumber: 0.2,
  ignoreWords: ['the', 'a', 'an', 'of', 'to', 'in', 'for', 'on', 'at', '的', '了', '是', '在', '和']
};

/**
 * 关键词匹配器
 * 通过分词提取关键词，计算综合相似度进行匹配
 */
export class KeywordMatcher extends BaseMatcher {
  readonly name = 'KeywordMatcher';
  readonly mode: MatchMode = 'keyword';
  
  private config: KeywordMatchConfig;
  
  constructor(config: Partial<KeywordMatchConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * 分词并过滤忽略词
   * @param text 输入文本
   * @returns 过滤后的词条数组
   */
  tokenizeAndFilter(text: string): string[] {
    const tokens = tokenize(text);
    const ignoreSet = new Set(this.config.ignoreWords.map(w => w.toLowerCase()));
    return tokens.filter(t => !ignoreSet.has(t.toLowerCase()));
  }
  
  /**
   * 计算两个名称之间的综合相似度
   * @param cardName 卡片名称
   * @param fileName 文件名称
   * @returns 相似度 (0-1) 及详情
   */
  calculateSimilarity(
    cardName: string,
    fileName: string
  ): { score: number; details: { jaccard: number; edit: number; numberMatch: boolean } } {
    // 分词
    const cardTokens = new Set(this.tokenizeAndFilter(cardName));
    const fileTokens = new Set(this.tokenizeAndFilter(fileName));
    
    // Jaccard相似度
    const jaccard = jaccardSimilarity(cardTokens, fileTokens);
    
    // 编辑距离相似度（使用原始名称，转小写）
    const edit = editDistanceSimilarity(
      this.removeExtension(cardName),
      this.removeExtension(fileName)
    );
    
    // 数字匹配检查
    const cardNumbers = cardName.match(/\d+/g) || [];
    const fileNumbers = fileName.match(/\d+/g) || [];
    const numberMatch = cardNumbers.some(cn =>
      fileNumbers.some(fn => parseInt(cn, 10) === parseInt(fn, 10))
    );
    
    // 加权计算综合分数
    const score =
      jaccard * this.config.weightJaccard +
      edit * this.config.weightEdit +
      (numberMatch ? 1 : 0) * this.config.weightNumber;
    
    return {
      score,
      details: { jaccard, edit, numberMatch }
    };
  }
  
  /**
   * 移除文件扩展名
   */
  private removeExtension(name: string): string {
    const lastDot = name.lastIndexOf('.');
    if (lastDot > 0) {
      return name.substring(0, lastDot);
    }
    return name;
  }
  
  /**
   * 检查此匹配器是否适用
   * 关键词匹配器总是适用作为后备方案
   */
  isApplicable(cards: CardInfo[], files: FileInfo[]): boolean {
    return cards.length > 0 && files.length > 0;
  }
  
  /**
   * 执行关键词匹配
   */
  match(cards: CardInfo[], files: FileInfo[], options?: MatchOptions): MatchScheme {
    const minSimilarity = options?.minSimilarity ?? this.config.minSimilarity;
    
    // 如果数据为空，返回空方案
    if (cards.length === 0 || files.length === 0) {
      return {
        ...this.createEmptyScheme(),
        unmatchedCards: cards.map(c => c.id),
        unmatchedFiles: files.map(f => f.path)
      };
    }
    
    // 计算所有卡片-文件对的相似度
    const similarities: SimilarityEntry[] = [];
    
    for (const card of cards) {
      for (const file of files) {
        const { score, details } = this.calculateSimilarity(card.name, file.name);
        
        // 只保留达到阈值的匹配
        if (score >= minSimilarity) {
          similarities.push({
            cardId: card.id,
            filePath: file.path,
            score,
            details
          });
        }
      }
    }
    
    // 按分数降序排序
    similarities.sort((a, b) => b.score - a.score);
    
    // 贪心选择最佳匹配（每个卡片和文件只能匹配一次）
    const usedCards = new Set<string>();
    const usedFiles = new Set<string>();
    const bindings: BindingItem[] = [];
    const confidenceScores: number[] = [];
    
    const cardMap = new Map(cards.map(c => [c.id, c]));
    const fileMap = new Map(files.map(f => [f.path, f]));
    
    for (const entry of similarities) {
      if (!usedCards.has(entry.cardId) && !usedFiles.has(entry.filePath)) {
        const card = cardMap.get(entry.cardId)!;
        const file = fileMap.get(entry.filePath)!;
        
        bindings.push({
          cardId: entry.cardId,
          filePath: entry.filePath,
          resourceField: detectResourceField(card.type, file.type)
        });
        
        usedCards.add(entry.cardId);
        usedFiles.add(entry.filePath);
        confidenceScores.push(entry.score);
      }
    }
    
    // 收集未匹配项
    const unmatchedCards = cards
      .filter(c => !usedCards.has(c.id))
      .map(c => c.id);
    const unmatchedFiles = files
      .filter(f => !usedFiles.has(f.path))
      .map(f => f.path);
    
    // 计算总体置信度
    const confidence = this.calculateConfidence(
      bindings.length,
      confidenceScores,
      cards.length,
      files.length
    );
    
    return {
      mode: this.mode,
      confidence,
      bindings,
      unmatchedCards,
      unmatchedFiles,
      description: this.generateDescription(bindings.length, cards.length, files.length, minSimilarity)
    };
  }
  
  /**
   * 计算置信度
   */
  private calculateConfidence(
    matchedCount: number,
    confidenceScores: number[],
    totalCards: number,
    totalFiles: number
  ): number {
    if (matchedCount === 0) return 0;
    
    // 平均相似度分数
    const avgScore = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
    
    // 匹配率
    const maxTotal = Math.max(totalCards, totalFiles);
    const matchRate = matchedCount / maxTotal;
    
    // 综合计算：平均分数 * 60 + 匹配率 * 40
    let confidence = avgScore * 60 + matchRate * 40;
    
    // 数量一致性加分
    if (totalCards === totalFiles && matchedCount === totalCards) {
      confidence += 5;
    }
    
    return Math.max(0, Math.min(100, Math.round(confidence)));
  }
  
  /**
   * 生成方案描述
   */
  private generateDescription(
    matchedCount: number,
    totalCards: number,
    totalFiles: number,
    threshold: number
  ): string {
    const parts: string[] = [];
    
    parts.push(`通过关键词相似度匹配了 ${matchedCount} 对`);
    parts.push(`相似度阈值 ${(threshold * 100).toFixed(0)}%`);
    
    const unmatchedCards = totalCards - matchedCount;
    const unmatchedFiles = totalFiles - matchedCount;
    
    if (unmatchedCards > 0 || unmatchedFiles > 0) {
      parts.push(`${unmatchedCards} 个卡片和 ${unmatchedFiles} 个文件未匹配`);
    }
    
    return parts.join('，');
  }
}
