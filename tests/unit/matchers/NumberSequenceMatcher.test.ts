/**
 * NumberSequenceMatcher 单元测试
 * @module tests/unit/matchers/NumberSequenceMatcher
 */

import { describe, it, expect } from 'vitest';
import { NumberSequenceMatcher } from '@/core/matchers/NumberSequenceMatcher';
import { createCardInfo, createFileInfo } from '../../fixtures';

describe('NumberSequenceMatcher', () => {
  // ===== 基础功能测试 =====
  describe('基础功能', () => {
    it('应该正确初始化', () => {
      const matcher = new NumberSequenceMatcher();
      expect(matcher.name).toBe('NumberSequenceMatcher');
      expect(matcher.mode).toBe('number_sequence');
    });

    it('应该返回空方案当没有数据时', () => {
      const matcher = new NumberSequenceMatcher();
      const result = matcher.match([], []);
      
      expect(result.bindings).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });
  });

  // ===== selectNumber 测试 =====
  describe('selectNumber', () => {
    const matcher = new NumberSequenceMatcher();
    
    it('应该选择第一个数字 (first)', () => {
      const numbers = [
        { value: 1, raw: '1', position: 0, length: 1 },
        { value: 2, raw: '02', position: 5, length: 2 },
        { value: 100, raw: '100', position: 10, length: 3 }
      ];
      
      const result = matcher.selectNumber(numbers, 'first');
      expect(result?.value).toBe(1);
    });

    it('应该选择最后一个数字 (last)', () => {
      const numbers = [
        { value: 1, raw: '1', position: 0, length: 1 },
        { value: 2, raw: '02', position: 5, length: 2 },
        { value: 100, raw: '100', position: 10, length: 3 }
      ];
      
      const result = matcher.selectNumber(numbers, 'last');
      expect(result?.value).toBe(100);
    });

    it('应该选择最长的数字 (longest)', () => {
      const numbers = [
        { value: 1, raw: '1', position: 0, length: 1 },
        { value: 2, raw: '02', position: 5, length: 2 },
        { value: 100, raw: '100', position: 10, length: 3 }
      ];
      
      const result = matcher.selectNumber(numbers, 'longest');
      expect(result?.value).toBe(100);
      expect(result?.length).toBe(3);
    });

    it('应该智能选择数字 (auto) - 优先2-3位数字', () => {
      const numbers = [
        { value: 1, raw: '1', position: 0, length: 1 },
        { value: 2, raw: '02', position: 5, length: 2 },
        { value: 2024, raw: '2024', position: 10, length: 4 }
      ];
      
      const result = matcher.selectNumber(numbers, 'auto');
      expect(result?.value).toBe(2);
      expect(result?.length).toBe(2);
    });

    it('应该排除年份数字 (auto)', () => {
      const numbers = [
        { value: 2024, raw: '2024', position: 0, length: 4 },
        { value: 5, raw: '5', position: 10, length: 1 }
      ];
      
      const result = matcher.selectNumber(numbers, 'auto');
      expect(result?.value).toBe(5);
    });

    it('应该处理空数组', () => {
      const result = matcher.selectNumber([], 'first');
      expect(result).toBeNull();
    });
  });

  // ===== isApplicable 测试 =====
  describe('isApplicable', () => {
    const matcher = new NumberSequenceMatcher();

    it('当大多数卡片和文件包含数字时应该返回true', () => {
      const cards = [
        createCardInfo({ id: '1', name: 'Episode 01' }),
        createCardInfo({ id: '2', name: 'Episode 02' }),
        createCardInfo({ id: '3', name: 'Episode 03' })
      ];
      const files = [
        createFileInfo({ name: 'ep01.mp4', path: '/ep01.mp4' }),
        createFileInfo({ name: 'ep02.mp4', path: '/ep02.mp4' }),
        createFileInfo({ name: 'ep03.mp4', path: '/ep03.mp4' })
      ];
      
      expect(matcher.isApplicable(cards, files)).toBe(true);
    });

    it('当大多数不包含数字时应该返回false', () => {
      const cards = [
        createCardInfo({ id: '1', name: 'Introduction' }),
        createCardInfo({ id: '2', name: 'Chapter One' }),
        createCardInfo({ id: '3', name: 'Conclusion' })
      ];
      const files = [
        createFileInfo({ name: 'intro.mp4', path: '/intro.mp4' }),
        createFileInfo({ name: 'chapter.mp4', path: '/chapter.mp4' }),
        createFileInfo({ name: 'end.mp4', path: '/end.mp4' })
      ];
      
      expect(matcher.isApplicable(cards, files)).toBe(false);
    });

    it('当数据为空时应该返回false', () => {
      expect(matcher.isApplicable([], [])).toBe(false);
      expect(matcher.isApplicable([createCardInfo()], [])).toBe(false);
      expect(matcher.isApplicable([], [createFileInfo()])).toBe(false);
    });
  });

  // ===== match 测试 =====
  describe('match', () => {
    it('应该正确匹配简单的数字序列', () => {
      const matcher = new NumberSequenceMatcher();
      
      const cards = [
        createCardInfo({ id: 'card-01', name: 'Episode 01' }),
        createCardInfo({ id: 'card-02', name: 'Episode 02' }),
        createCardInfo({ id: 'card-03', name: 'Episode 03' })
      ];
      const files = [
        createFileInfo({ name: 'ep01.mp4', path: '/ep01.mp4' }),
        createFileInfo({ name: 'ep02.mp4', path: '/ep02.mp4' }),
        createFileInfo({ name: 'ep03.mp4', path: '/ep03.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.bindings).toHaveLength(3);
      expect(result.unmatchedCards).toHaveLength(0);
      expect(result.unmatchedFiles).toHaveLength(0);
      expect(result.confidence).toBeGreaterThan(80);
    });

    it('应该处理前导零一致性 (01 = 1 = 001)', () => {
      const matcher = new NumberSequenceMatcher();
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Video 1' }),
        createCardInfo({ id: 'card-01', name: 'Video 01' }),
        createCardInfo({ id: 'card-001', name: 'Video 001' })
      ];
      const files = [
        createFileInfo({ name: 'file_001.mp4', path: '/file_001.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      // 应该产生冲突，因为三个卡片都匹配数字1
      expect(result.conflicts).toBeDefined();
      expect(result.conflicts!.length).toBeGreaterThan(0);
    });

    it('应该正确处理数量不一致的情况', () => {
      const matcher = new NumberSequenceMatcher();
      
      const cards = [
        createCardInfo({ id: 'card-01', name: 'Episode 01' }),
        createCardInfo({ id: 'card-02', name: 'Episode 02' }),
        createCardInfo({ id: 'card-03', name: 'Episode 03' }),
        createCardInfo({ id: 'card-04', name: 'Episode 04' }),
        createCardInfo({ id: 'card-05', name: 'Episode 05' })
      ];
      const files = [
        createFileInfo({ name: 'ep01.mp4', path: '/ep01.mp4' }),
        createFileInfo({ name: 'ep02.mp4', path: '/ep02.mp4' }),
        createFileInfo({ name: 'ep03.mp4', path: '/ep03.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.bindings).toHaveLength(3);
      expect(result.unmatchedCards).toHaveLength(2);
      expect(result.unmatchedFiles).toHaveLength(0);
    });

    it('应该处理没有匹配数字的情况', () => {
      const matcher = new NumberSequenceMatcher();
      
      const cards = [
        createCardInfo({ id: 'card-01', name: 'Episode 01' }),
        createCardInfo({ id: 'card-02', name: 'Episode 02' })
      ];
      const files = [
        createFileInfo({ name: 'ep10.mp4', path: '/ep10.mp4' }),
        createFileInfo({ name: 'ep20.mp4', path: '/ep20.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.bindings).toHaveLength(0);
      expect(result.unmatchedCards).toHaveLength(2);
      expect(result.unmatchedFiles).toHaveLength(2);
    });

    it('应该使用配置的numberPosition选项', () => {
      const matcher = new NumberSequenceMatcher({ cardPosition: 'first', filePosition: 'first' });
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'S01E05' }) // 有两个数字：01和05，first选01
      ];
      const files = [
        createFileInfo({ name: 'Season01_Episode05.mp4', path: '/s1e5.mp4' }) // 有两个数字：01和05，first选01
      ];
      
      const result = matcher.match(cards, files);
      
      // 使用first策略，应该匹配1
      expect(result.bindings).toHaveLength(1);
      expect(result.bindings[0].cardId).toBe('card-1');
    });

    it('应该正确处理冲突策略 - skip', () => {
      const matcher = new NumberSequenceMatcher({ conflictStrategy: 'skip' });
      
      const cards = [
        createCardInfo({ id: 'card-01', name: 'Episode 01' }),
        createCardInfo({ id: 'card-01b', name: 'Episode 01 Special' })
      ];
      const files = [
        createFileInfo({ name: 'ep01.mp4', path: '/ep01.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      // skip策略下冲突项不会创建绑定
      // 由于两个卡片都匹配数字1，应该有冲突
      expect(result.conflicts).toBeDefined();
    });

    it('应该正确处理冲突策略 - first', () => {
      const matcher = new NumberSequenceMatcher({ conflictStrategy: 'first' });
      
      const cards = [
        createCardInfo({ id: 'card-01', name: 'Episode 01' }),
        createCardInfo({ id: 'card-01b', name: 'Episode 01 Special' })
      ];
      const files = [
        createFileInfo({ name: 'ep01.mp4', path: '/ep01.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      // first策略下应该选择第一个卡片
      expect(result.bindings).toHaveLength(1);
      expect(result.bindings[0].cardId).toBe('card-01');
    });
  });

  // ===== 边界情况测试 =====
  describe('边界情况', () => {
    const matcher = new NumberSequenceMatcher();

    it('应该处理超大数字', () => {
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Episode 999999' })
      ];
      const files = [
        createFileInfo({ name: 'ep999999.mp4', path: '/ep999999.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.bindings).toHaveLength(1);
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

    it('应该处理中日韩混合命名', () => {
      const cards = [
        createCardInfo({ id: 'card-1', name: '第01集 - 开始' }),
        createCardInfo({ id: 'card-2', name: '第02話 - タイトル' })
      ];
      const files = [
        createFileInfo({ name: '[字幕组]动漫01.mp4', path: '/01.mp4' }),
        createFileInfo({ name: '[字幕组]动漫02.mp4', path: '/02.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.bindings).toHaveLength(2);
    });

    it('应该处理复杂文件名格式', () => {
      const matcher = new NumberSequenceMatcher({ cardPosition: 'auto', filePosition: 'auto' });
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Episode 05' })
      ];
      const files = [
        createFileInfo({ name: 'Episode_05_HD.mkv', path: '/ep05.mkv' })
      ];
      
      const result = matcher.match(cards, files);
      
      // 应该能匹配到数字5
      expect(result.bindings).toHaveLength(1);
    });
  });

  // ===== 置信度测试 =====
  describe('置信度计算', () => {
    const matcher = new NumberSequenceMatcher();

    it('完美匹配应该有高置信度', () => {
      const cards = [
        createCardInfo({ id: 'card-01', name: 'Episode 01' }),
        createCardInfo({ id: 'card-02', name: 'Episode 02' }),
        createCardInfo({ id: 'card-03', name: 'Episode 03' })
      ];
      const files = [
        createFileInfo({ name: 'ep01.mp4', path: '/ep01.mp4' }),
        createFileInfo({ name: 'ep02.mp4', path: '/ep02.mp4' }),
        createFileInfo({ name: 'ep03.mp4', path: '/ep03.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.confidence).toBeGreaterThan(90);
    });

    it('部分匹配应该有中等置信度', () => {
      const cards = [
        createCardInfo({ id: 'card-01', name: 'Episode 01' }),
        createCardInfo({ id: 'card-02', name: 'Episode 02' }),
        createCardInfo({ id: 'card-03', name: 'Episode 03' }),
        createCardInfo({ id: 'card-04', name: 'Episode 04' })
      ];
      const files = [
        createFileInfo({ name: 'ep01.mp4', path: '/ep01.mp4' }),
        createFileInfo({ name: 'ep02.mp4', path: '/ep02.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.confidence).toBeLessThan(80);
      expect(result.confidence).toBeGreaterThan(30);
    });

    it('无匹配应该有低置信度', () => {
      const cards = [
        createCardInfo({ id: 'card-01', name: 'Episode 01' })
      ];
      const files = [
        createFileInfo({ name: 'ep99.mp4', path: '/ep99.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.confidence).toBeLessThan(20);
    });
  });
});
