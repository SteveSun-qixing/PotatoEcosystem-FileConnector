/**
 * 数字序列匹配器
 * 通过提取卡片名和文件名中的数字进行匹配
 * @module core/matchers/NumberSequenceMatcher
 */

import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';
import type { BindingItem } from '@/types/binding';
import type {
  MatchMode,
  MatchOptions,
  MatchScheme,
  MatchConflict,
  NumberInfo,
  NumberPosition,
  ConflictStrategy
} from '@/types/match';
import { BaseMatcher } from './BaseMatcher';
import { extractNumbers, detectResourceField } from '@/utils/match';

/**
 * 数字匹配器配置
 */
interface NumberMatchConfig {
  /** 卡片数字位置选择 */
  cardPosition: NumberPosition;
  /** 文件数字位置选择 */
  filePosition: NumberPosition;
  /** 冲突处理策略 */
  conflictStrategy: ConflictStrategy;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: NumberMatchConfig = {
  cardPosition: 'auto',
  filePosition: 'auto',
  conflictStrategy: 'skip'
};

/**
 * 数字序列匹配器
 * 从卡片名和文件名中提取数字，通过数字值进行匹配
 */
export class NumberSequenceMatcher extends BaseMatcher {
  readonly name = 'NumberSequenceMatcher';
  readonly mode: MatchMode = 'number_sequence';
  
  private config: NumberMatchConfig;
  
  constructor(config: Partial<NumberMatchConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * 选择用于匹配的数字
   * @param numbers 数字信息数组
   * @param position 位置策略
   * @returns 选中的数字信息
   */
  selectNumber(numbers: NumberInfo[], position: NumberPosition): NumberInfo | null {
    if (numbers.length === 0) return null;
    
    switch (position) {
      case 'first':
        return numbers[0];
        
      case 'last':
        return numbers[numbers.length - 1];
        
      case 'longest':
        return numbers.reduce((a, b) => (a.length > b.length ? a : b));
        
      case 'auto':
      default:
        // 智能选择策略：
        // 1. 优先选择2-3位数字（常见的编号格式如01, 02, 001等）
        // 2. 排除可能是年份的4位数字（19xx, 20xx）
        // 3. 如果没有合适的，使用最后一个数字
        const preferred = numbers.find(n => {
          // 优先2-3位数字
          if (n.length >= 2 && n.length <= 3) {
            return true;
          }
          return false;
        });
        
        if (preferred) return preferred;
        
        // 排除年份数字，返回第一个非年份数字
        const nonYear = numbers.find(n => {
          if (n.length === 4) {
            const val = n.value;
            // 常见年份范围
            if (val >= 1900 && val <= 2100) {
              return false;
            }
          }
          return true;
        });
        
        return nonYear || numbers[numbers.length - 1];
    }
  }
  
  /**
   * 检查此匹配器是否适用
   * 当大多数卡片和文件都包含数字时适用
   */
  isApplicable(cards: CardInfo[], files: FileInfo[]): boolean {
    if (cards.length === 0 || files.length === 0) return false;
    
    // 计算包含数字的比例
    const cardsWithNumbers = cards.filter(c => extractNumbers(c.name).length > 0);
    const filesWithNumbers = files.filter(f => extractNumbers(f.name).length > 0);
    
    const cardRatio = cardsWithNumbers.length / cards.length;
    const fileRatio = filesWithNumbers.length / files.length;
    
    // 至少50%的卡片和文件包含数字才适用
    return cardRatio >= 0.5 && fileRatio >= 0.5;
  }
  
  /**
   * 执行数字序列匹配
   */
  match(cards: CardInfo[], files: FileInfo[], options?: MatchOptions): MatchScheme {
    const config = {
      ...this.config,
      cardPosition: options?.numberPosition || this.config.cardPosition,
      conflictStrategy: options?.conflictStrategy || this.config.conflictStrategy
    };
    
    // 如果数据为空，返回空方案
    if (cards.length === 0 || files.length === 0) {
      return {
        ...this.createEmptyScheme(),
        unmatchedCards: cards.map(c => c.id),
        unmatchedFiles: files.map(f => f.path)
      };
    }
    
    // 建立卡片数字映射 Map<数字值, 卡片数组>
    const cardMap = new Map<number, CardInfo[]>();
    const cardNumberMap = new Map<string, NumberInfo | null>(); // 记录每个卡片选中的数字
    
    for (const card of cards) {
      const numbers = extractNumbers(card.name);
      const selected = this.selectNumber(numbers, config.cardPosition);
      cardNumberMap.set(card.id, selected);
      
      if (selected) {
        const key = selected.value;
        if (!cardMap.has(key)) {
          cardMap.set(key, []);
        }
        cardMap.get(key)!.push(card);
      }
    }
    
    // 建立文件数字映射 Map<数字值, 文件数组>
    const fileMap = new Map<number, FileInfo[]>();
    const fileNumberMap = new Map<string, NumberInfo | null>(); // 记录每个文件选中的数字
    
    for (const file of files) {
      const numbers = extractNumbers(file.name);
      const selected = this.selectNumber(numbers, config.filePosition);
      fileNumberMap.set(file.path, selected);
      
      if (selected) {
        const key = selected.value;
        if (!fileMap.has(key)) {
          fileMap.set(key, []);
        }
        fileMap.get(key)!.push(file);
      }
    }
    
    // 执行匹配
    const bindings: BindingItem[] = [];
    const conflicts: MatchConflict[] = [];
    const matchedCardIds = new Set<string>();
    const matchedFilePaths = new Set<string>();
    
    for (const [number, cardList] of cardMap) {
      const fileList = fileMap.get(number);
      
      if (!fileList || fileList.length === 0) {
        continue;
      }
      
      if (cardList.length === 1 && fileList.length === 1) {
        // 一对一匹配 - 完美情况
        const card = cardList[0];
        const file = fileList[0];
        
        bindings.push({
          cardId: card.id,
          filePath: file.path,
          resourceField: detectResourceField(card.type, file.type)
        });
        
        matchedCardIds.add(card.id);
        matchedFilePaths.add(file.path);
      } else {
        // 冲突情况
        conflicts.push({
          type: cardList.length > 1 ? 'duplicate_card' : 'duplicate_file',
          cards: cardList.map(c => c.id),
          files: fileList.map(f => f.path),
          reason: `数字 ${number} 对应多个${cardList.length > 1 ? '卡片' : '文件'}`
        });
        
        // 根据策略处理冲突
        const resolved = this.resolveConflicts(
          [{ type: 'multiple_match', cards: cardList.map(c => c.id), files: fileList.map(f => f.path), reason: '' }],
          config.conflictStrategy,
          cardList,
          fileList
        );
        
        for (const binding of resolved) {
          bindings.push(binding);
          matchedCardIds.add(binding.cardId);
          matchedFilePaths.add(binding.filePath);
        }
      }
    }
    
    // 收集未匹配项
    const unmatchedCards = cards
      .filter(c => !matchedCardIds.has(c.id))
      .map(c => c.id);
    const unmatchedFiles = files
      .filter(f => !matchedFilePaths.has(f.path))
      .map(f => f.path);
    
    // 计算置信度
    const confidence = this.calculateConfidence(
      bindings.length,
      conflicts.length,
      cards.length,
      files.length
    );
    
    return {
      mode: this.mode,
      confidence,
      bindings,
      unmatchedCards,
      unmatchedFiles,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      description: this.generateDescription(bindings.length, conflicts.length, cards.length, files.length)
    };
  }
  
  /**
   * 处理冲突
   */
  resolveConflicts(
    _conflicts: MatchConflict[],
    strategy: ConflictStrategy,
    cardList: CardInfo[],
    fileList: FileInfo[]
  ): BindingItem[] {
    const resolved: BindingItem[] = [];
    
    switch (strategy) {
      case 'first':
        // 使用第一个卡片和第一个文件
        if (cardList.length > 0 && fileList.length > 0) {
          resolved.push({
            cardId: cardList[0].id,
            filePath: fileList[0].path,
            resourceField: detectResourceField(cardList[0].type, fileList[0].type)
          });
        }
        break;
        
      case 'skip':
        // 跳过冲突项，不创建绑定
        break;
        
      case 'manual':
        // 标记为需要手动处理，也跳过自动绑定
        break;
    }
    
    return resolved;
  }
  
  /**
   * 计算置信度
   */
  private calculateConfidence(
    matchedCount: number,
    conflictCount: number,
    totalCards: number,
    totalFiles: number
  ): number {
    if (totalCards === 0 || totalFiles === 0) return 0;
    
    const maxTotal = Math.max(totalCards, totalFiles);
    
    // 基础分数：匹配率
    let score = (matchedCount / maxTotal) * 100;
    
    // 惩罚冲突（每个冲突扣5分）
    score -= conflictCount * 5;
    
    // 惩罚未匹配项
    const unmatchedCards = totalCards - matchedCount;
    const unmatchedFiles = totalFiles - matchedCount;
    score -= (unmatchedCards + unmatchedFiles) * 2;
    
    // 数量一致性加分
    if (totalCards === totalFiles && matchedCount === totalCards) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  /**
   * 生成方案描述
   */
  private generateDescription(
    matchedCount: number,
    conflictCount: number,
    totalCards: number,
    totalFiles: number
  ): string {
    const parts: string[] = [];
    
    parts.push(`通过数字序列匹配了 ${matchedCount} 对`);
    
    if (conflictCount > 0) {
      parts.push(`${conflictCount} 个冲突`);
    }
    
    const unmatchedCards = totalCards - matchedCount;
    const unmatchedFiles = totalFiles - matchedCount;
    
    if (unmatchedCards > 0 || unmatchedFiles > 0) {
      parts.push(`${unmatchedCards} 个卡片和 ${unmatchedFiles} 个文件未匹配`);
    }
    
    return parts.join('，');
  }
}
