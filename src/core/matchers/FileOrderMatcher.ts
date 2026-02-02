/**
 * 文件顺序匹配器
 * 将卡片和文件分别排序后按顺序一一对应
 * @module core/matchers/FileOrderMatcher
 */

import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';
import type { BindingItem } from '@/types/binding';
import type { MatchMode, MatchOptions, MatchScheme, SortStrategy } from '@/types/match';
import { BaseMatcher } from './BaseMatcher';
import { detectResourceField } from '@/utils/match';

/**
 * 顺序匹配器配置
 */
interface OrderMatchConfig {
  /** 卡片排序策略 */
  cardSort: SortStrategy;
  /** 文件排序策略 */
  fileSort: SortStrategy;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: OrderMatchConfig = {
  cardSort: 'name_numeric',
  fileSort: 'name_numeric'
};

/**
 * 文件顺序匹配器
 * 最简单的匹配方式：排序后按位置对应
 */
export class FileOrderMatcher extends BaseMatcher {
  readonly name = 'FileOrderMatcher';
  readonly mode: MatchMode = 'file_order';
  
  private config: OrderMatchConfig;
  
  constructor(config: Partial<OrderMatchConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * 按名称排序（字典序）
   */
  private sortByName<T extends { name: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }
  
  /**
   * 按名称排序（数字优先）
   * 提取名称中的第一个数字进行排序，数字相同则按字典序
   */
  private sortByNameNumeric<T extends { name: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
      // 提取第一个数字
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0', 10);
      
      if (numA !== numB) {
        return numA - numB;
      }
      
      return a.name.localeCompare(b.name, 'zh-CN');
    });
  }
  
  /**
   * 按创建时间排序
   */
  private sortByCreated(files: FileInfo[]): FileInfo[] {
    return [...files].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB;
    });
  }
  
  /**
   * 按修改时间排序
   */
  private sortByModified(files: FileInfo[]): FileInfo[] {
    return [...files].sort((a, b) => {
      const timeA = new Date(a.modifiedAt).getTime();
      const timeB = new Date(b.modifiedAt).getTime();
      return timeA - timeB;
    });
  }
  
  /**
   * 按文件大小排序
   */
  private sortBySize(files: FileInfo[]): FileInfo[] {
    return [...files].sort((a, b) => a.size - b.size);
  }
  
  /**
   * 对卡片进行排序
   */
  sortCards(cards: CardInfo[], strategy: SortStrategy): CardInfo[] {
    switch (strategy) {
      case 'name':
        return this.sortByName(cards);
      case 'name_numeric':
        return this.sortByNameNumeric(cards);
      case 'created':
        // 卡片按创建时间排序
        return [...cards].sort((a, b) => {
          const timeA = new Date(a.metadata.created_at).getTime();
          const timeB = new Date(b.metadata.created_at).getTime();
          return timeA - timeB;
        });
      case 'modified':
        // 卡片按修改时间排序
        return [...cards].sort((a, b) => {
          const timeA = new Date(a.metadata.modified_at).getTime();
          const timeB = new Date(b.metadata.modified_at).getTime();
          return timeA - timeB;
        });
      case 'size':
        // 卡片没有size属性，降级为name排序
        return this.sortByName(cards);
      default:
        return this.sortByNameNumeric(cards);
    }
  }
  
  /**
   * 对文件进行排序
   */
  sortFiles(files: FileInfo[], strategy: SortStrategy): FileInfo[] {
    switch (strategy) {
      case 'name':
        return this.sortByName(files);
      case 'name_numeric':
        return this.sortByNameNumeric(files);
      case 'created':
        return this.sortByCreated(files);
      case 'modified':
        return this.sortByModified(files);
      case 'size':
        return this.sortBySize(files);
      default:
        return this.sortByNameNumeric(files);
    }
  }
  
  /**
   * 检查此匹配器是否适用
   * 顺序匹配器总是适用作为最后的后备方案
   */
  isApplicable(_cards: CardInfo[], _files: FileInfo[]): boolean {
    return true;
  }
  
  /**
   * 执行顺序匹配
   */
  match(cards: CardInfo[], files: FileInfo[], options?: MatchOptions): MatchScheme {
    const cardSort = options?.sortStrategy ?? this.config.cardSort;
    const fileSort = options?.sortStrategy ?? this.config.fileSort;
    
    // 如果数据为空，返回空方案
    if (cards.length === 0 || files.length === 0) {
      return {
        ...this.createEmptyScheme(),
        unmatchedCards: cards.map(c => c.id),
        unmatchedFiles: files.map(f => f.path)
      };
    }
    
    // 分别排序
    const sortedCards = this.sortCards(cards, cardSort);
    const sortedFiles = this.sortFiles(files, fileSort);
    
    // 按顺序匹配
    const bindings: BindingItem[] = [];
    const minLen = Math.min(sortedCards.length, sortedFiles.length);
    
    for (let i = 0; i < minLen; i++) {
      const card = sortedCards[i];
      const file = sortedFiles[i];
      
      bindings.push({
        cardId: card.id,
        filePath: file.path,
        resourceField: detectResourceField(card.type, file.type)
      });
    }
    
    // 收集未匹配项
    const unmatchedCards = sortedCards.slice(minLen).map(c => c.id);
    const unmatchedFiles = sortedFiles.slice(minLen).map(f => f.path);
    
    // 计算置信度
    const countMatch = sortedCards.length === sortedFiles.length;
    const confidence = this.calculateConfidence(countMatch, sortedCards.length, sortedFiles.length);
    
    // 生成警告
    let warning: string | undefined;
    if (!countMatch) {
      warning = `数量不匹配：${sortedCards.length} 个卡片，${sortedFiles.length} 个文件`;
    }
    
    return {
      mode: this.mode,
      confidence,
      bindings,
      unmatchedCards,
      unmatchedFiles,
      warning,
      description: this.generateDescription(bindings.length, countMatch, cardSort, fileSort)
    };
  }
  
  /**
   * 计算置信度
   */
  private calculateConfidence(
    countMatch: boolean,
    totalCards: number,
    totalFiles: number
  ): number {
    // 顺序匹配的基础置信度较低，因为它不依赖名称关系
    const baseScore = 70;
    
    if (countMatch) {
      // 数量一致，置信度较高
      return baseScore + 15;
    }
    
    // 数量不一致，根据差距扣分
    const diff = Math.abs(totalCards - totalFiles);
    const penalty = Math.min(diff * 5, 30);
    
    return Math.max(40, baseScore - penalty);
  }
  
  /**
   * 生成方案描述
   */
  private generateDescription(
    matchedCount: number,
    countMatch: boolean,
    cardSort: SortStrategy,
    fileSort: SortStrategy
  ): string {
    const sortNames: Record<SortStrategy, string> = {
      name: '名称字典序',
      name_numeric: '名称数字序',
      created: '创建时间',
      modified: '修改时间',
      size: '文件大小'
    };
    
    const parts: string[] = [];
    
    parts.push(`按顺序匹配了 ${matchedCount} 对`);
    parts.push(`卡片按${sortNames[cardSort]}排序`);
    parts.push(`文件按${sortNames[fileSort]}排序`);
    
    if (!countMatch) {
      parts.push('数量不一致');
    }
    
    return parts.join('，');
  }
}
