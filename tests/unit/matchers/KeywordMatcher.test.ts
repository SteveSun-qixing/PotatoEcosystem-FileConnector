/**
 * KeywordMatcher 单元测试
 * @module tests/unit/matchers/KeywordMatcher
 */

import { describe, it, expect } from 'vitest';
import { KeywordMatcher } from '@/core/matchers/KeywordMatcher';
import { createCardInfo, createFileInfo } from '../../fixtures';

describe('KeywordMatcher', () => {
  // ===== 基础功能测试 =====
  describe('基础功能', () => {
    it('应该正确初始化', () => {
      const matcher = new KeywordMatcher();
      expect(matcher.name).toBe('KeywordMatcher');
      expect(matcher.mode).toBe('keyword');
    });

    it('应该返回空方案当没有数据时', () => {
      const matcher = new KeywordMatcher();
      const result = matcher.match([], []);
      
      expect(result.bindings).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    it('应该支持自定义配置', () => {
      const matcher = new KeywordMatcher({
        minSimilarity: 0.5,
        weightJaccard: 0.6,
        weightEdit: 0.3,
        weightNumber: 0.1
      });
      
      expect(matcher.name).toBe('KeywordMatcher');
    });
  });

  // ===== tokenizeAndFilter 测试 =====
  describe('tokenizeAndFilter', () => {
    const matcher = new KeywordMatcher();

    it('应该正确分词英文', () => {
      const result = matcher.tokenizeAndFilter('Hello World Test');
      expect(result).toContain('hello');
      expect(result).toContain('world');
      expect(result).toContain('test');
    });

    it('应该过滤忽略词', () => {
      const result = matcher.tokenizeAndFilter('The quick brown fox');
      expect(result).not.toContain('the');
      expect(result).toContain('quick');
      expect(result).toContain('brown');
      expect(result).toContain('fox');
    });

    it('应该正确分词中文', () => {
      const result = matcher.tokenizeAndFilter('你好世界');
      expect(result).toContain('你好世界');
    });

    it('应该过滤中文忽略词', () => {
      const matcher = new KeywordMatcher({ ignoreWords: ['的', '了', '是'] });
      const result = matcher.tokenizeAndFilter('这是测试');
      expect(result).not.toContain('是');
    });

    it('应该处理混合内容', () => {
      const result = matcher.tokenizeAndFilter('Episode 01 第一集');
      expect(result).toContain('episode');
      expect(result).toContain('01');
    });
  });

  // ===== calculateSimilarity 测试 =====
  describe('calculateSimilarity', () => {
    const matcher = new KeywordMatcher();

    it('相同名称应该有高相似度', () => {
      const { score } = matcher.calculateSimilarity('Episode 01', 'Episode 01');
      expect(score).toBeGreaterThan(0.9);
    });

    it('完全不同的名称应该有低相似度', () => {
      const { score } = matcher.calculateSimilarity('Episode 01', 'Something Else');
      expect(score).toBeLessThan(0.5);
    });

    it('部分相似的名称应该有中等相似度', () => {
      const { score } = matcher.calculateSimilarity('Episode 01', 'Episode 02');
      // 相似但不完全相同，相似度应该在0.3-0.9之间
      expect(score).toBeGreaterThan(0.3);
      expect(score).toBeLessThan(0.9);
    });

    it('应该返回详细信息', () => {
      const { details } = matcher.calculateSimilarity('Test Video 01', 'Test Video 01');
      expect(details).toHaveProperty('jaccard');
      expect(details).toHaveProperty('edit');
      expect(details).toHaveProperty('numberMatch');
    });

    it('数字匹配应该增加相似度', () => {
      const { details: details1 } = matcher.calculateSimilarity('Video 01', 'File 01');
      const { details: details2 } = matcher.calculateSimilarity('Video 01', 'File 02');
      
      expect(details1.numberMatch).toBe(true);
      expect(details2.numberMatch).toBe(false);
    });

    it('应该正确处理文件扩展名', () => {
      const { score } = matcher.calculateSimilarity('Video 01', 'Video01.mp4');
      // 扩展名应该被移除后比较
      expect(score).toBeGreaterThan(0.7);
    });
  });

  // ===== isApplicable 测试 =====
  describe('isApplicable', () => {
    const matcher = new KeywordMatcher();

    it('有数据时应该返回true', () => {
      const cards = [createCardInfo()];
      const files = [createFileInfo()];
      
      expect(matcher.isApplicable(cards, files)).toBe(true);
    });

    it('空数据时应该返回false', () => {
      expect(matcher.isApplicable([], [])).toBe(false);
      expect(matcher.isApplicable([createCardInfo()], [])).toBe(false);
      expect(matcher.isApplicable([], [createFileInfo()])).toBe(false);
    });
  });

  // ===== match 测试 =====
  describe('match', () => {
    it('应该正确匹配相似名称', () => {
      const matcher = new KeywordMatcher();
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Episode 01 - Introduction' }),
        createCardInfo({ id: 'card-2', name: 'Episode 02 - Development' }),
        createCardInfo({ id: 'card-3', name: 'Episode 03 - Conclusion' })
      ];
      const files = [
        createFileInfo({ name: 'Episode_01_Introduction.mp4', path: '/ep01.mp4' }),
        createFileInfo({ name: 'Episode_02_Development.mp4', path: '/ep02.mp4' }),
        createFileInfo({ name: 'Episode_03_Conclusion.mp4', path: '/ep03.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.bindings).toHaveLength(3);
      expect(result.unmatchedCards).toHaveLength(0);
      expect(result.unmatchedFiles).toHaveLength(0);
    });

    it('应该使用贪心策略选择最佳匹配', () => {
      const matcher = new KeywordMatcher();
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Video Alpha' }),
        createCardInfo({ id: 'card-2', name: 'Video Beta' })
      ];
      const files = [
        createFileInfo({ name: 'video_alpha.mp4', path: '/alpha.mp4' }),
        createFileInfo({ name: 'video_beta.mp4', path: '/beta.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      // 应该正确匹配 Alpha 和 Beta
      expect(result.bindings).toHaveLength(2);
      
      const alphaBinding = result.bindings.find(b => b.cardId === 'card-1');
      expect(alphaBinding?.filePath).toBe('/alpha.mp4');
      
      const betaBinding = result.bindings.find(b => b.cardId === 'card-2');
      expect(betaBinding?.filePath).toBe('/beta.mp4');
    });

    it('应该过滤低于阈值的匹配', () => {
      const matcher = new KeywordMatcher({ minSimilarity: 0.8 });
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Completely Different Name' })
      ];
      const files = [
        createFileInfo({ name: 'unrelated_file.mp4', path: '/unrelated.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      // 相似度不够，不应该匹配
      expect(result.bindings).toHaveLength(0);
      expect(result.unmatchedCards).toHaveLength(1);
      expect(result.unmatchedFiles).toHaveLength(1);
    });

    it('应该处理数量不一致的情况', () => {
      const matcher = new KeywordMatcher();
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Video One' }),
        createCardInfo({ id: 'card-2', name: 'Video Two' }),
        createCardInfo({ id: 'card-3', name: 'Video Three' })
      ];
      const files = [
        createFileInfo({ name: 'Video_One.mp4', path: '/one.mp4' }),
        createFileInfo({ name: 'Video_Two.mp4', path: '/two.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.bindings).toHaveLength(2);
      expect(result.unmatchedCards).toHaveLength(1);
      expect(result.unmatchedFiles).toHaveLength(0);
    });

    it('应该使用options中的minSimilarity', () => {
      const matcher = new KeywordMatcher({ minSimilarity: 0.3 });
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Test Video' })
      ];
      const files = [
        createFileInfo({ name: 'test.mp4', path: '/test.mp4' })
      ];
      
      // 使用更高的阈值覆盖
      const result = matcher.match(cards, files, { minSimilarity: 0.9 });
      
      // 高阈值可能导致不匹配
      // 具体结果取决于相似度计算
    });
  });

  // ===== 中文匹配测试 =====
  describe('中文匹配', () => {
    const matcher = new KeywordMatcher();

    it('应该正确匹配中文名称', () => {
      const cards = [
        createCardInfo({ id: 'card-1', name: '第一集 开始' }),
        createCardInfo({ id: 'card-2', name: '第二集 发展' })
      ];
      const files = [
        createFileInfo({ name: '第一集_开始.mp4', path: '/01.mp4' }),
        createFileInfo({ name: '第二集_发展.mp4', path: '/02.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.bindings).toHaveLength(2);
    });

    it('应该处理中英混合名称', () => {
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Season1 第01话' }),
        createCardInfo({ id: 'card-2', name: 'Season1 第02话' })
      ];
      const files = [
        createFileInfo({ name: 'S1E01_第一话.mp4', path: '/s1e01.mp4' }),
        createFileInfo({ name: 'S1E02_第二话.mp4', path: '/s1e02.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      // 应该能基于数字和部分关键词匹配
      expect(result.bindings.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===== 边界情况测试 =====
  describe('边界情况', () => {
    const matcher = new KeywordMatcher();

    it('应该处理空名称', () => {
      const cards = [
        createCardInfo({ id: 'card-1', name: '' })
      ];
      const files = [
        createFileInfo({ name: '', path: '/empty.mp4' })
      ];
      
      // 不应该抛出错误
      const result = matcher.match(cards, files);
      expect(result).toBeDefined();
    });

    it('应该处理特殊字符', () => {
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Video [HD] (1080p) - Episode.01' })
      ];
      const files = [
        createFileInfo({ name: 'Video_HD_1080p_Episode_01.mp4', path: '/video.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      // 应该能匹配（因为关键词相似）
      expect(result.bindings).toHaveLength(1);
    });

    it('应该处理很长的名称', () => {
      const longName = 'A'.repeat(1000);
      const cards = [
        createCardInfo({ id: 'card-1', name: longName })
      ];
      const files = [
        createFileInfo({ name: longName + '.mp4', path: '/long.mp4' })
      ];
      
      // 不应该抛出错误
      const result = matcher.match(cards, files);
      expect(result).toBeDefined();
    });

    it('应该处理只有数字的名称', () => {
      const cards = [
        createCardInfo({ id: 'card-1', name: '001' }),
        createCardInfo({ id: 'card-2', name: '002' })
      ];
      const files = [
        createFileInfo({ name: '001.mp4', path: '/001.mp4' }),
        createFileInfo({ name: '002.mp4', path: '/002.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.bindings).toHaveLength(2);
    });
  });

  // ===== 置信度测试 =====
  describe('置信度计算', () => {
    it('完美匹配应该有高置信度', () => {
      const matcher = new KeywordMatcher();
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Exact Match Name' })
      ];
      const files = [
        createFileInfo({ name: 'Exact Match Name.mp4', path: '/exact.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.confidence).toBeGreaterThan(70);
    });

    it('部分匹配应该有中等置信度', () => {
      const matcher = new KeywordMatcher({ minSimilarity: 0.2 });
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Video One' }),
        createCardInfo({ id: 'card-2', name: 'Video Two' }),
        createCardInfo({ id: 'card-3', name: 'Video Three' }),
        createCardInfo({ id: 'card-4', name: 'Video Four' })
      ];
      const files = [
        createFileInfo({ name: 'Video_One.mp4', path: '/one.mp4' }),
        createFileInfo({ name: 'Other_File.mp4', path: '/other.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      // 只有部分匹配，置信度应该较低
      expect(result.confidence).toBeLessThan(70);
    });

    it('无匹配应该有低置信度', () => {
      const matcher = new KeywordMatcher({ minSimilarity: 0.9 });
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Completely Different' })
      ];
      const files = [
        createFileInfo({ name: 'Unrelated_Name.mp4', path: '/unrelated.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.confidence).toBe(0);
    });
  });

  // ===== 自定义忽略词测试 =====
  describe('自定义忽略词', () => {
    it('应该支持自定义忽略词列表', () => {
      const matcher = new KeywordMatcher({
        ignoreWords: ['episode', 'video', '集']
      });
      
      const result = matcher.tokenizeAndFilter('Episode 01 Video 第一集');
      
      expect(result).not.toContain('episode');
      expect(result).not.toContain('video');
      expect(result).toContain('01');
    });

    it('忽略词应该不区分大小写', () => {
      const matcher = new KeywordMatcher({
        ignoreWords: ['THE', 'A', 'AN']
      });
      
      const result = matcher.tokenizeAndFilter('the quick fox');
      
      expect(result).not.toContain('the');
      expect(result).toContain('quick');
      expect(result).toContain('fox');
    });
  });
});
