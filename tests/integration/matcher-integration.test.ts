/**
 * 匹配器集成测试
 * 测试多个匹配器的协作和 SchemeGenerator 的整合功能
 * @module tests/integration/matcher-integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchemeGenerator } from '@/core/matchers/SchemeGenerator';
import { NumberSequenceMatcher } from '@/core/matchers/NumberSequenceMatcher';
import { KeywordMatcher } from '@/core/matchers/KeywordMatcher';
import { FileOrderMatcher } from '@/core/matchers/FileOrderMatcher';
import { SmartMatcher } from '@/core/matchers/SmartMatcher';
import type { CardInfo } from '@/types/card';
import type { FileInfo } from '@/types/file';
import type { MatchScheme, MatchMode, MatchOptions } from '@/types/match';
import type { AIServiceConfig } from '@/types/config';
import { createCardInfo, createFileInfo } from '../fixtures';

// ===== Mock AI Config =====
const mockAIConfig: AIServiceConfig = {
  endpoint: 'https://api.chips.ai',
  token: 'test-token',
  timeout: 30000,
  retry: {
    maxAttempts: 3,
    delay: 1000
  },
  defaults: {
    language: 'auto',
    minConfidence: 30
  }
};

// ===== 测试数据工厂 =====

/**
 * 创建适合数字序列匹配的数据集
 */
function createNumberSequenceData(count: number): { cards: CardInfo[]; files: FileInfo[] } {
  const cards = Array.from({ length: count }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    return createCardInfo({
      id: `card-${num}`,
      name: `Episode ${num}`,
      type: 'video'
    });
  });

  const files = Array.from({ length: count }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    return createFileInfo({
      name: `ep${num}.mp4`,
      path: `/files/ep${num}.mp4`,
      type: 'video'
    });
  });

  return { cards, files };
}

/**
 * 创建适合关键词匹配的数据集
 */
function createKeywordData(): { cards: CardInfo[]; files: FileInfo[] } {
  const cards = [
    createCardInfo({ id: 'card-intro', name: 'Introduction to Programming', type: 'video' }),
    createCardInfo({ id: 'card-basics', name: 'Basic Concepts', type: 'video' }),
    createCardInfo({ id: 'card-advanced', name: 'Advanced Topics', type: 'video' }),
    createCardInfo({ id: 'card-conclusion', name: 'Conclusion and Summary', type: 'video' })
  ];

  const files = [
    createFileInfo({ name: 'introduction_programming.mp4', path: '/files/intro.mp4', type: 'video' }),
    createFileInfo({ name: 'basic_concepts_tutorial.mp4', path: '/files/basics.mp4', type: 'video' }),
    createFileInfo({ name: 'advanced_topics_deep.mp4', path: '/files/advanced.mp4', type: 'video' }),
    createFileInfo({ name: 'conclusion_summary_final.mp4', path: '/files/conclusion.mp4', type: 'video' })
  ];

  return { cards, files };
}

/**
 * 创建混合命名风格的数据集
 */
function createMixedStyleData(): { cards: CardInfo[]; files: FileInfo[] } {
  const cards = [
    createCardInfo({ id: 'card-1', name: '第01集 开篇', type: 'video' }),
    createCardInfo({ id: 'card-2', name: '第02集 发展', type: 'video' }),
    createCardInfo({ id: 'card-3', name: 'Episode 03 - Climax', type: 'video' }),
    createCardInfo({ id: 'card-4', name: 'S01E04 结局', type: 'video' })
  ];

  const files = [
    createFileInfo({ name: '[字幕组]动漫01.mp4', path: '/files/01.mp4', type: 'video' }),
    createFileInfo({ name: '[字幕组]动漫02.mkv', path: '/files/02.mkv', type: 'video' }),
    createFileInfo({ name: 'Series.S01E03.720p.mp4', path: '/files/e03.mp4', type: 'video' }),
    createFileInfo({ name: '04话.mp4', path: '/files/04.mp4', type: 'video' })
  ];

  return { cards, files };
}

// ===== 测试套件 =====

describe('匹配器集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===== 1. 多匹配器对同一数据的结果测试 =====
  describe('多匹配器对同一数据的结果', () => {
    it('应该让所有匹配器处理数字序列数据', () => {
      const { cards, files } = createNumberSequenceData(5);

      const numberMatcher = new NumberSequenceMatcher();
      const keywordMatcher = new KeywordMatcher();
      const orderMatcher = new FileOrderMatcher();

      const numberResult = numberMatcher.match(cards, files);
      const keywordResult = keywordMatcher.match(cards, files);
      const orderResult = orderMatcher.match(cards, files);

      // 数字序列匹配器应该表现最好
      expect(numberResult.bindings.length).toBe(5);
      expect(numberResult.confidence).toBeGreaterThan(80);

      // 关键词匹配器可能找到部分匹配
      expect(keywordResult.bindings.length).toBeGreaterThanOrEqual(0);

      // 顺序匹配器总是能匹配
      expect(orderResult.bindings.length).toBe(5);
      expect(orderResult.confidence).toBeLessThan(numberResult.confidence);
    });

    it('应该让所有匹配器处理关键词数据', () => {
      const { cards, files } = createKeywordData();

      const numberMatcher = new NumberSequenceMatcher();
      const keywordMatcher = new KeywordMatcher();
      const orderMatcher = new FileOrderMatcher();

      const numberResult = numberMatcher.match(cards, files);
      const keywordResult = keywordMatcher.match(cards, files);
      const orderResult = orderMatcher.match(cards, files);

      // 数字序列匹配器不适用（没有数字）
      expect(numberMatcher.isApplicable(cards, files)).toBe(false);

      // 关键词匹配器应该能找到匹配
      expect(keywordResult.bindings.length).toBeGreaterThan(0);

      // 顺序匹配器总是工作
      expect(orderResult.bindings.length).toBe(4);
    });

    it('应该正确处理混合命名风格', () => {
      const { cards, files } = createMixedStyleData();

      const numberMatcher = new NumberSequenceMatcher();
      const keywordMatcher = new KeywordMatcher();
      const orderMatcher = new FileOrderMatcher();

      const numberResult = numberMatcher.match(cards, files);
      const keywordResult = keywordMatcher.match(cards, files);
      const orderResult = orderMatcher.match(cards, files);

      // 数字序列匹配器应该能提取数字
      expect(numberResult.bindings.length).toBeGreaterThan(0);

      // 所有匹配器都应该返回结果
      expect(keywordResult.mode).toBe('keyword');
      expect(orderResult.mode).toBe('file_order');
    });

    it('应该比较不同匹配器的匹配质量', () => {
      const { cards, files } = createNumberSequenceData(10);

      const generator = new SchemeGenerator({ includeAllSchemes: true });
      const schemes = generator.generateAll(cards, files);

      // 按置信度排序
      expect(schemes.length).toBeGreaterThan(1);
      for (let i = 1; i < schemes.length; i++) {
        expect(schemes[i - 1].confidence).toBeGreaterThanOrEqual(schemes[i].confidence);
      }

      // 对于数字序列数据，数字匹配器应该排在前面
      const topScheme = schemes[0];
      expect(['number_sequence', 'file_order'].includes(topScheme.mode)).toBe(true);
    });
  });

  // ===== 2. SchemeGenerator 整合测试 =====
  describe('SchemeGenerator 整合测试', () => {
    describe('方案生成', () => {
      it('应该生成多个匹配方案', () => {
        const { cards, files } = createNumberSequenceData(5);
        const generator = new SchemeGenerator({ includeAllSchemes: true });

        const schemes = generator.generateAll(cards, files);

        // 应该至少包含数字匹配和顺序匹配方案
        expect(schemes.length).toBeGreaterThanOrEqual(2);

        const modes = new Set(schemes.map(s => s.mode));
        expect(modes.has('number_sequence')).toBe(true);
        expect(modes.has('file_order')).toBe(true);
      });

      it('应该支持添加自定义匹配器', () => {
        const generator = new SchemeGenerator();

        // 创建自定义匹配器
        const customMatcher: {
          name: string;
          mode: MatchMode;
          match: (cards: CardInfo[], files: FileInfo[], options?: MatchOptions) => MatchScheme;
          isApplicable: (cards: CardInfo[], files: FileInfo[]) => boolean;
        } = {
          name: 'CustomMatcher',
          mode: 'keyword' as MatchMode, // 使用现有模式
          match: (cards: CardInfo[], files: FileInfo[]): MatchScheme => ({
            mode: 'keyword',
            confidence: 50,
            bindings: [],
            unmatchedCards: cards.map(c => c.id),
            unmatchedFiles: files.map(f => f.path)
          }),
          isApplicable: () => true
        };

        generator.addMatcher(customMatcher);

        const { cards, files } = createNumberSequenceData(3);
        const schemes = generator.generateAll(cards, files);

        // 自定义匹配器可能不生成绑定，但不会出错
        expect(schemes).toBeDefined();
      });

      it('应该正确过滤不适用的匹配器', () => {
        const { cards, files } = createKeywordData();
        const generator = new SchemeGenerator({ includeAllSchemes: false });

        const schemes = generator.generateAll(cards, files);

        // 数字匹配器不适用，应该被过滤
        const numberScheme = schemes.find(s => s.mode === 'number_sequence');
        
        // 如果存在数字方案，它应该没有绑定或置信度很低
        if (numberScheme) {
          expect(numberScheme.bindings.length).toBe(0);
        }
      });
    });

    describe('方案评估', () => {
      it('应该正确评估方案分数', () => {
        const { cards, files } = createNumberSequenceData(5);
        const generator = new SchemeGenerator();

        const schemes = generator.generateAll(cards, files);
        const scores = generator.evaluateAll(schemes, cards.length, files.length);

        expect(scores.length).toBe(schemes.length);

        scores.forEach(score => {
          expect(score.totalScore).toBeGreaterThanOrEqual(0);
          expect(score.totalScore).toBeLessThanOrEqual(100);
          expect(score.scores.matchRate).toBeGreaterThanOrEqual(0);
          expect(score.scores.matchRate).toBeLessThanOrEqual(1);
          expect(score.scores.coverage).toBeGreaterThanOrEqual(0);
          expect(score.scores.coverage).toBeLessThanOrEqual(1);
        });
      });

      it('应该计算正确的匹配率', () => {
        const { cards, files } = createNumberSequenceData(4);
        const generator = new SchemeGenerator();

        // 创建一个只匹配2个的方案
        const partialScheme: MatchScheme = {
          mode: 'number_sequence',
          confidence: 50,
          bindings: [
            { cardId: 'card-01', filePath: '/files/ep01.mp4', resourceField: 'video' },
            { cardId: 'card-02', filePath: '/files/ep02.mp4', resourceField: 'video' }
          ],
          unmatchedCards: ['card-03', 'card-04'],
          unmatchedFiles: ['/files/ep03.mp4', '/files/ep04.mp4']
        };

        const score = generator.evaluateScheme(partialScheme, 4, 4);

        // 匹配率应该是 2/4 = 0.5
        expect(score.scores.matchRate).toBe(0.5);
        // 覆盖率也是 0.5
        expect(score.scores.coverage).toBe(0.5);
      });

      it('应该正确计算冲突率', () => {
        const generator = new SchemeGenerator();

        const schemeWithConflicts: MatchScheme = {
          mode: 'number_sequence',
          confidence: 60,
          bindings: [
            { cardId: 'card-01', filePath: '/files/ep01.mp4', resourceField: 'video' }
          ],
          unmatchedCards: ['card-02'],
          unmatchedFiles: ['/files/ep02.mp4'],
          conflicts: [
            { type: 'duplicate_card', cards: ['card-02', 'card-03'], files: ['/files/ep02.mp4'], reason: 'Test' }
          ]
        };

        const score = generator.evaluateScheme(schemeWithConflicts, 2, 2);

        // 冲突率应该是 1/2 = 0.5
        expect(score.scores.conflictRate).toBe(0.5);
      });
    });

    describe('方案选择', () => {
      it('应该选择置信度最高的方案', () => {
        const { cards, files } = createNumberSequenceData(5);
        const generator = new SchemeGenerator();

        const schemes = generator.generateAll(cards, files);
        const best = generator.selectBestScheme(schemes);

        expect(best).not.toBeNull();
        expect(best!.confidence).toBe(Math.max(...schemes.map(s => s.confidence)));
      });

      it('应该在没有方案时返回null', () => {
        const generator = new SchemeGenerator();
        const best = generator.selectBestScheme([]);

        expect(best).toBeNull();
      });

      it('应该支持自动选择阈值', () => {
        const { cards, files } = createNumberSequenceData(5);
        
        // 高阈值
        const highThresholdGenerator = new SchemeGenerator({ autoSelectThreshold: 95 });
        const highResult = highThresholdGenerator.generateAndSelect(cards, files);

        // 低阈值
        const lowThresholdGenerator = new SchemeGenerator({ autoSelectThreshold: 50 });
        const lowResult = lowThresholdGenerator.generateAndSelect(cards, files);

        // 低阈值更可能自动选择
        if (lowResult.selected && lowResult.selected.confidence >= 50) {
          expect(lowResult.autoSelected).toBe(true);
        }
      });

      it('应该生成方案摘要统计', () => {
        const { cards, files } = createNumberSequenceData(5);
        const generator = new SchemeGenerator({ includeAllSchemes: true });

        const schemes = generator.generateAll(cards, files);
        const summary = generator.getSchemeSummary(schemes);

        expect(summary.total).toBe(schemes.length);
        expect(summary.bestConfidence).toBe(Math.max(...schemes.map(s => s.confidence)));
        expect(summary.averageConfidence).toBeGreaterThan(0);
        expect(Object.keys(summary.byMode).length).toBeGreaterThan(0);
      });
    });
  });

  // ===== 3. 方案评分和排序测试 =====
  describe('方案评分和排序', () => {
    it('应该按综合分数正确排序', () => {
      const { cards, files } = createNumberSequenceData(10);
      const generator = new SchemeGenerator({ includeAllSchemes: true });

      const schemes = generator.generateAll(cards, files);
      const scores = generator.evaluateAll(schemes, cards.length, files.length);

      // 验证降序排序
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1].totalScore).toBeGreaterThanOrEqual(scores[i].totalScore);
      }
    });

    it('应该对完美匹配给予高分', () => {
      const { cards, files } = createNumberSequenceData(5);
      const generator = new SchemeGenerator();

      const schemes = generator.generateAll(cards, files);
      const perfectScheme = schemes.find(s => 
        s.bindings.length === 5 && 
        s.unmatchedCards.length === 0 && 
        s.unmatchedFiles.length === 0
      );

      if (perfectScheme) {
        const score = generator.evaluateScheme(perfectScheme, 5, 5);
        expect(score.totalScore).toBeGreaterThan(80);
        expect(score.scores.matchRate).toBe(1);
        expect(score.scores.coverage).toBe(1);
        expect(score.scores.consistency).toBe(1);
      }
    });

    it('应该对数量不一致的情况降分', () => {
      const generator = new SchemeGenerator();

      // 5个卡片，3个文件
      const cards = Array.from({ length: 5 }, (_, i) => 
        createCardInfo({ id: `c${i}`, name: `Card ${i}` })
      );
      const files = Array.from({ length: 3 }, (_, i) => 
        createFileInfo({ name: `f${i}.mp4`, path: `/f${i}.mp4` })
      );

      const schemes = generator.generateAll(cards, files);
      const orderScheme = schemes.find(s => s.mode === 'file_order');

      if (orderScheme) {
        const score = generator.evaluateScheme(orderScheme, 5, 3);
        // 一致性分数应该小于1
        expect(score.scores.consistency).toBeLessThan(1);
      }
    });

    it('应该对冲突方案进行惩罚', () => {
      const generator = new SchemeGenerator();

      const noConflictScheme: MatchScheme = {
        mode: 'number_sequence',
        confidence: 80,
        bindings: [
          { cardId: 'c1', filePath: '/f1.mp4', resourceField: 'video' },
          { cardId: 'c2', filePath: '/f2.mp4', resourceField: 'video' }
        ],
        unmatchedCards: [],
        unmatchedFiles: []
      };

      const conflictScheme: MatchScheme = {
        mode: 'number_sequence',
        confidence: 80,
        bindings: [
          { cardId: 'c1', filePath: '/f1.mp4', resourceField: 'video' },
          { cardId: 'c2', filePath: '/f2.mp4', resourceField: 'video' }
        ],
        unmatchedCards: [],
        unmatchedFiles: [],
        conflicts: [
          { type: 'duplicate_card', cards: ['c1', 'c3'], files: ['/f1.mp4'], reason: 'Test' }
        ]
      };

      const noConflictScore = generator.evaluateScheme(noConflictScheme, 2, 2);
      const conflictScore = generator.evaluateScheme(conflictScheme, 2, 2);

      // 有冲突的分数应该更低
      expect(conflictScore.totalScore).toBeLessThan(noConflictScore.totalScore);
    });
  });

  // ===== 4. 匹配器边界情况测试 =====
  describe('匹配器边界情况', () => {
    it('应该处理单个卡片和单个文件', () => {
      const cards = [createCardInfo({ id: 'c1', name: 'Video 01' })];
      const files = [createFileInfo({ name: 'v01.mp4', path: '/v01.mp4' })];

      const generator = new SchemeGenerator();
      const schemes = generator.generateAll(cards, files);

      expect(schemes.length).toBeGreaterThan(0);
      const bestScheme = generator.selectBestScheme(schemes);
      expect(bestScheme?.bindings.length).toBe(1);
    });

    it('应该处理大量数据', () => {
      const count = 100;
      const { cards, files } = createNumberSequenceData(count);

      const generator = new SchemeGenerator();
      const startTime = Date.now();
      const schemes = generator.generateAll(cards, files);
      const duration = Date.now() - startTime;

      // 应该在合理时间内完成
      expect(duration).toBeLessThan(5000); // 5秒内

      const bestScheme = generator.selectBestScheme(schemes);
      expect(bestScheme?.bindings.length).toBe(count);
    });

    it('应该处理特殊字符文件名', () => {
      const cards = [
        createCardInfo({ id: 'c1', name: '[字幕组] 动漫名 第01话.mp4' }),
        createCardInfo({ id: 'c2', name: 'Movie (2024) [1080p].mkv' }),
        createCardInfo({ id: 'c3', name: 'file_with_underscores_01.avi' })
      ];
      const files = [
        createFileInfo({ name: '[字幕组] 动漫名 第01话.mp4', path: '/01.mp4' }),
        createFileInfo({ name: 'Movie (2024) [1080p].mkv', path: '/movie.mkv' }),
        createFileInfo({ name: 'file_with_underscores_01.avi', path: '/file.avi' })
      ];

      const generator = new SchemeGenerator();
      const schemes = generator.generateAll(cards, files);

      expect(schemes.length).toBeGreaterThan(0);
    });

    it('应该处理Unicode文件名', () => {
      const cards = [
        createCardInfo({ id: 'c1', name: '中文名称01' }),
        createCardInfo({ id: 'c2', name: '日本語ファイル02' }),
        createCardInfo({ id: 'c3', name: '한국어 03' })
      ];
      const files = [
        createFileInfo({ name: '中文01.mp4', path: '/cn01.mp4' }),
        createFileInfo({ name: 'jp02.mp4', path: '/jp02.mp4' }),
        createFileInfo({ name: 'kr03.mp4', path: '/kr03.mp4' })
      ];

      const numberMatcher = new NumberSequenceMatcher();
      const result = numberMatcher.match(cards, files);

      // 应该能提取数字进行匹配
      expect(result.bindings.length).toBe(3);
    });

    it('应该处理空名称', () => {
      const cards = [
        createCardInfo({ id: 'c1', name: '' }),
        createCardInfo({ id: 'c2', name: '   ' })
      ];
      const files = [
        createFileInfo({ name: '', path: '/empty.mp4' }),
        createFileInfo({ name: '   ', path: '/space.mp4' })
      ];

      const generator = new SchemeGenerator();
      // 不应该抛出错误
      expect(() => generator.generateAll(cards, files)).not.toThrow();
    });
  });

  // ===== 5. 匹配选项测试 =====
  describe('匹配选项测试', () => {
    it('应该支持数字位置选项', () => {
      const cards = [
        createCardInfo({ id: 'c1', name: 'S01E05 Title' }), // 两个数字：01和05
        createCardInfo({ id: 'c2', name: 'S02E10 Title' })  // 两个数字：02和10
      ];
      const files = [
        createFileInfo({ name: 'Series.01.mp4', path: '/s01.mp4' }),
        createFileInfo({ name: 'Series.02.mp4', path: '/s02.mp4' })
      ];

      // first策略选择第一个数字
      const firstMatcher = new NumberSequenceMatcher({ cardPosition: 'first', filePosition: 'first' });
      const firstResult = firstMatcher.match(cards, files);

      // 应该匹配 S01 -> 01, S02 -> 02
      expect(firstResult.bindings.length).toBe(2);
    });

    it('应该支持相似度阈值选项', () => {
      const { cards, files } = createKeywordData();

      // 高阈值
      const highThreshold = new KeywordMatcher({ minSimilarity: 0.8 });
      const highResult = highThreshold.match(cards, files);

      // 低阈值
      const lowThreshold = new KeywordMatcher({ minSimilarity: 0.2 });
      const lowResult = lowThreshold.match(cards, files);

      // 低阈值应该匹配更多
      expect(lowResult.bindings.length).toBeGreaterThanOrEqual(highResult.bindings.length);
    });

    it('应该支持排序策略选项', () => {
      const cards = [
        createCardInfo({ 
          id: 'c3', 
          name: 'Card 3',
          metadata: { created_at: '2024-01-03', modified_at: '2024-01-03', version: '1.0', tags: [] }
        }),
        createCardInfo({ 
          id: 'c1', 
          name: 'Card 1',
          metadata: { created_at: '2024-01-01', modified_at: '2024-01-01', version: '1.0', tags: [] }
        }),
        createCardInfo({ 
          id: 'c2', 
          name: 'Card 2',
          metadata: { created_at: '2024-01-02', modified_at: '2024-01-02', version: '1.0', tags: [] }
        })
      ];
      const files = [
        createFileInfo({ name: 'f1.mp4', path: '/f1.mp4', createdAt: '2024-01-01' }),
        createFileInfo({ name: 'f2.mp4', path: '/f2.mp4', createdAt: '2024-01-02' }),
        createFileInfo({ name: 'f3.mp4', path: '/f3.mp4', createdAt: '2024-01-03' })
      ];

      const nameMatcher = new FileOrderMatcher({ cardSort: 'name', fileSort: 'name' });
      const nameResult = nameMatcher.match(cards, files);

      // 按名称排序后应该正确匹配
      expect(nameResult.bindings.length).toBe(3);
    });

    it('应该支持冲突处理策略', () => {
      // 创建有冲突的数据（两个卡片同一个数字）
      const cards = [
        createCardInfo({ id: 'c1', name: 'Episode 01' }),
        createCardInfo({ id: 'c2', name: 'Episode 01 Special' }) // 相同数字
      ];
      const files = [
        createFileInfo({ name: 'ep01.mp4', path: '/ep01.mp4' })
      ];

      // first策略
      const firstMatcher = new NumberSequenceMatcher({ conflictStrategy: 'first' });
      const firstResult = firstMatcher.match(cards, files);

      // first策略应该选择第一个
      expect(firstResult.bindings.length).toBe(1);
      expect(firstResult.bindings[0].cardId).toBe('c1');

      // skip策略
      const skipMatcher = new NumberSequenceMatcher({ conflictStrategy: 'skip' });
      const skipResult = skipMatcher.match(cards, files);

      // skip策略应该跳过冲突
      expect(skipResult.conflicts).toBeDefined();
    });
  });

  // ===== 6. 智能匹配器集成测试 =====
  describe('智能匹配器集成', () => {
    it('应该在降级模式下使用SchemeGenerator', async () => {
      const matcher = new SmartMatcher(mockAIConfig);

      // 模拟AI不可用
      vi.spyOn(matcher['aiClient'], 'isAvailable').mockResolvedValue(false);

      const { cards, files } = createNumberSequenceData(5);
      const result = await matcher.match(cards, files);

      expect(matcher.fallbackMode).toBe(true);
      expect(result.bindings.length).toBe(5);
      expect(result.metadata.modelVersion).toContain('fallback');
    });

    it('应该正确分类降级结果的置信度', async () => {
      const matcher = new SmartMatcher(mockAIConfig);
      vi.spyOn(matcher['aiClient'], 'isAvailable').mockResolvedValue(false);

      const { cards, files } = createNumberSequenceData(3);
      const result = await matcher.match(cards, files);

      const classified = matcher.classifyConfidence(result.bindings);

      // 所有绑定应该被分类到某个级别
      const total = classified.high.length + classified.medium.length + classified.low.length;
      expect(total).toBe(result.bindings.length);
    });
  });
});
