/**
 * FileOrderMatcher 单元测试
 * @module tests/unit/matchers/FileOrderMatcher
 */

import { describe, it, expect } from 'vitest';
import { FileOrderMatcher } from '@/core/matchers/FileOrderMatcher';
import { createCardInfo, createFileInfo, createCardMetadata } from '../../fixtures';

describe('FileOrderMatcher', () => {
  // ===== 基础功能测试 =====
  describe('基础功能', () => {
    it('应该正确初始化', () => {
      const matcher = new FileOrderMatcher();
      expect(matcher.name).toBe('FileOrderMatcher');
      expect(matcher.mode).toBe('file_order');
    });

    it('应该返回空方案当没有数据时', () => {
      const matcher = new FileOrderMatcher();
      const result = matcher.match([], []);
      
      expect(result.bindings).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    it('应该支持自定义配置', () => {
      const matcher = new FileOrderMatcher({
        cardSort: 'name',
        fileSort: 'modified'
      });
      
      expect(matcher.name).toBe('FileOrderMatcher');
    });
  });

  // ===== sortCards 测试 =====
  describe('sortCards', () => {
    const matcher = new FileOrderMatcher();

    it('应该按名称字典序排序', () => {
      const cards = [
        createCardInfo({ id: '3', name: 'Zebra' }),
        createCardInfo({ id: '1', name: 'Apple' }),
        createCardInfo({ id: '2', name: 'Banana' })
      ];
      
      const sorted = matcher.sortCards(cards, 'name');
      
      expect(sorted[0].name).toBe('Apple');
      expect(sorted[1].name).toBe('Banana');
      expect(sorted[2].name).toBe('Zebra');
    });

    it('应该按名称数字优先排序', () => {
      const cards = [
        createCardInfo({ id: '3', name: 'Episode 10' }),
        createCardInfo({ id: '1', name: 'Episode 2' }),
        createCardInfo({ id: '2', name: 'Episode 1' })
      ];
      
      const sorted = matcher.sortCards(cards, 'name_numeric');
      
      expect(sorted[0].name).toBe('Episode 1');
      expect(sorted[1].name).toBe('Episode 2');
      expect(sorted[2].name).toBe('Episode 10');
    });

    it('应该按创建时间排序', () => {
      const cards = [
        createCardInfo({ 
          id: '3', 
          name: 'Third',
          metadata: createCardMetadata({ created_at: '2024-03-01T00:00:00.000Z' })
        }),
        createCardInfo({ 
          id: '1', 
          name: 'First',
          metadata: createCardMetadata({ created_at: '2024-01-01T00:00:00.000Z' })
        }),
        createCardInfo({ 
          id: '2', 
          name: 'Second',
          metadata: createCardMetadata({ created_at: '2024-02-01T00:00:00.000Z' })
        })
      ];
      
      const sorted = matcher.sortCards(cards, 'created');
      
      expect(sorted[0].name).toBe('First');
      expect(sorted[1].name).toBe('Second');
      expect(sorted[2].name).toBe('Third');
    });

    it('应该按修改时间排序', () => {
      const cards = [
        createCardInfo({ 
          id: '1', 
          name: 'Old',
          metadata: createCardMetadata({ modified_at: '2024-01-01T00:00:00.000Z' })
        }),
        createCardInfo({ 
          id: '2', 
          name: 'New',
          metadata: createCardMetadata({ modified_at: '2024-12-01T00:00:00.000Z' })
        })
      ];
      
      const sorted = matcher.sortCards(cards, 'modified');
      
      expect(sorted[0].name).toBe('Old');
      expect(sorted[1].name).toBe('New');
    });

    it('数字排序时相同数字应按字典序排列', () => {
      const cards = [
        createCardInfo({ id: '1', name: 'B Episode 1' }),
        createCardInfo({ id: '2', name: 'A Episode 1' }),
        createCardInfo({ id: '3', name: 'C Episode 1' })
      ];
      
      const sorted = matcher.sortCards(cards, 'name_numeric');
      
      // 数字相同（都是1），按字典序
      expect(sorted[0].name).toBe('A Episode 1');
      expect(sorted[1].name).toBe('B Episode 1');
      expect(sorted[2].name).toBe('C Episode 1');
    });
  });

  // ===== sortFiles 测试 =====
  describe('sortFiles', () => {
    const matcher = new FileOrderMatcher();

    it('应该按名称字典序排序', () => {
      const files = [
        createFileInfo({ name: 'z_file.mp4', path: '/z.mp4' }),
        createFileInfo({ name: 'a_file.mp4', path: '/a.mp4' }),
        createFileInfo({ name: 'm_file.mp4', path: '/m.mp4' })
      ];
      
      const sorted = matcher.sortFiles(files, 'name');
      
      expect(sorted[0].name).toBe('a_file.mp4');
      expect(sorted[1].name).toBe('m_file.mp4');
      expect(sorted[2].name).toBe('z_file.mp4');
    });

    it('应该按名称数字优先排序', () => {
      const files = [
        createFileInfo({ name: 'ep10.mp4', path: '/ep10.mp4' }),
        createFileInfo({ name: 'ep2.mp4', path: '/ep2.mp4' }),
        createFileInfo({ name: 'ep1.mp4', path: '/ep1.mp4' })
      ];
      
      const sorted = matcher.sortFiles(files, 'name_numeric');
      
      expect(sorted[0].name).toBe('ep1.mp4');
      expect(sorted[1].name).toBe('ep2.mp4');
      expect(sorted[2].name).toBe('ep10.mp4');
    });

    it('应该按创建时间排序', () => {
      const files = [
        createFileInfo({ 
          name: 'new.mp4', 
          path: '/new.mp4',
          createdAt: '2024-12-01T00:00:00.000Z'
        }),
        createFileInfo({ 
          name: 'old.mp4', 
          path: '/old.mp4',
          createdAt: '2024-01-01T00:00:00.000Z'
        })
      ];
      
      const sorted = matcher.sortFiles(files, 'created');
      
      expect(sorted[0].name).toBe('old.mp4');
      expect(sorted[1].name).toBe('new.mp4');
    });

    it('应该按修改时间排序', () => {
      const files = [
        createFileInfo({ 
          name: 'recent.mp4', 
          path: '/recent.mp4',
          modifiedAt: '2024-12-01T00:00:00.000Z'
        }),
        createFileInfo({ 
          name: 'ancient.mp4', 
          path: '/ancient.mp4',
          modifiedAt: '2020-01-01T00:00:00.000Z'
        })
      ];
      
      const sorted = matcher.sortFiles(files, 'modified');
      
      expect(sorted[0].name).toBe('ancient.mp4');
      expect(sorted[1].name).toBe('recent.mp4');
    });

    it('应该按文件大小排序', () => {
      const files = [
        createFileInfo({ name: 'large.mp4', path: '/large.mp4', size: 1000000 }),
        createFileInfo({ name: 'small.mp4', path: '/small.mp4', size: 100 }),
        createFileInfo({ name: 'medium.mp4', path: '/medium.mp4', size: 10000 })
      ];
      
      const sorted = matcher.sortFiles(files, 'size');
      
      expect(sorted[0].name).toBe('small.mp4');
      expect(sorted[1].name).toBe('medium.mp4');
      expect(sorted[2].name).toBe('large.mp4');
    });
  });

  // ===== isApplicable 测试 =====
  describe('isApplicable', () => {
    const matcher = new FileOrderMatcher();

    it('应该总是返回true', () => {
      expect(matcher.isApplicable([], [])).toBe(true);
      expect(matcher.isApplicable([createCardInfo()], [])).toBe(true);
      expect(matcher.isApplicable([], [createFileInfo()])).toBe(true);
      expect(matcher.isApplicable([createCardInfo()], [createFileInfo()])).toBe(true);
    });
  });

  // ===== match 测试 =====
  describe('match', () => {
    it('应该按顺序一一匹配', () => {
      const matcher = new FileOrderMatcher();
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Episode 01' }),
        createCardInfo({ id: 'card-2', name: 'Episode 02' }),
        createCardInfo({ id: 'card-3', name: 'Episode 03' })
      ];
      const files = [
        createFileInfo({ name: 'ep01.mp4', path: '/ep01.mp4' }),
        createFileInfo({ name: 'ep02.mp4', path: '/ep02.mp4' }),
        createFileInfo({ name: 'ep03.mp4', path: '/ep03.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.bindings).toHaveLength(3);
      expect(result.bindings[0].cardId).toBe('card-1');
      expect(result.bindings[0].filePath).toBe('/ep01.mp4');
      expect(result.bindings[1].cardId).toBe('card-2');
      expect(result.bindings[2].cardId).toBe('card-3');
    });

    it('应该处理卡片多于文件的情况', () => {
      const matcher = new FileOrderMatcher();
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Episode 01' }),
        createCardInfo({ id: 'card-2', name: 'Episode 02' }),
        createCardInfo({ id: 'card-3', name: 'Episode 03' })
      ];
      const files = [
        createFileInfo({ name: 'ep01.mp4', path: '/ep01.mp4' }),
        createFileInfo({ name: 'ep02.mp4', path: '/ep02.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.bindings).toHaveLength(2);
      expect(result.unmatchedCards).toHaveLength(1);
      expect(result.unmatchedCards[0]).toBe('card-3');
      expect(result.unmatchedFiles).toHaveLength(0);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('数量不匹配');
    });

    it('应该处理文件多于卡片的情况', () => {
      const matcher = new FileOrderMatcher();
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Episode 01' })
      ];
      const files = [
        createFileInfo({ name: 'ep01.mp4', path: '/ep01.mp4' }),
        createFileInfo({ name: 'ep02.mp4', path: '/ep02.mp4' }),
        createFileInfo({ name: 'ep03.mp4', path: '/ep03.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.bindings).toHaveLength(1);
      expect(result.unmatchedCards).toHaveLength(0);
      expect(result.unmatchedFiles).toHaveLength(2);
      expect(result.warning).toBeDefined();
    });

    it('应该使用配置的排序策略', () => {
      const matcher = new FileOrderMatcher({
        cardSort: 'name',
        fileSort: 'name'
      });
      
      const cards = [
        createCardInfo({ id: 'card-z', name: 'Zebra' }),
        createCardInfo({ id: 'card-a', name: 'Apple' })
      ];
      const files = [
        createFileInfo({ name: 'z_file.mp4', path: '/z.mp4' }),
        createFileInfo({ name: 'a_file.mp4', path: '/a.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      // 排序后：Apple -> a_file, Zebra -> z_file
      expect(result.bindings[0].cardId).toBe('card-a');
      expect(result.bindings[0].filePath).toBe('/a.mp4');
      expect(result.bindings[1].cardId).toBe('card-z');
      expect(result.bindings[1].filePath).toBe('/z.mp4');
    });

    it('应该使用options中的sortStrategy覆盖配置', () => {
      const matcher = new FileOrderMatcher({
        cardSort: 'name_numeric',
        fileSort: 'name_numeric'
      });
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Episode 10' }),
        createCardInfo({ id: 'card-2', name: 'Episode 2' })
      ];
      const files = [
        createFileInfo({ name: 'ep10.mp4', path: '/ep10.mp4' }),
        createFileInfo({ name: 'ep2.mp4', path: '/ep2.mp4' })
      ];
      
      // 使用name策略（字典序）
      const result = matcher.match(cards, files, { sortStrategy: 'name' });
      
      // 字典序下 Episode 10 < Episode 2
      // ep10.mp4 < ep2.mp4
      // 所以 Episode 10 -> ep10.mp4
      expect(result.bindings[0].cardId).toBe('card-1');
    });
  });

  // ===== 数字排序测试 =====
  describe('数字优先排序', () => {
    const matcher = new FileOrderMatcher();

    it('应该正确排序两位数和三位数', () => {
      const cards = [
        createCardInfo({ id: '1', name: 'Episode 100' }),
        createCardInfo({ id: '2', name: 'Episode 10' }),
        createCardInfo({ id: '3', name: 'Episode 1' })
      ];
      
      const sorted = matcher.sortCards(cards, 'name_numeric');
      
      expect(sorted[0].name).toBe('Episode 1');
      expect(sorted[1].name).toBe('Episode 10');
      expect(sorted[2].name).toBe('Episode 100');
    });

    it('应该处理前导零', () => {
      const cards = [
        createCardInfo({ id: '1', name: 'EP001' }),
        createCardInfo({ id: '2', name: 'EP010' }),
        createCardInfo({ id: '3', name: 'EP002' })
      ];
      
      const sorted = matcher.sortCards(cards, 'name_numeric');
      
      expect(sorted[0].name).toBe('EP001');
      expect(sorted[1].name).toBe('EP002');
      expect(sorted[2].name).toBe('EP010');
    });

    it('应该处理没有数字的名称', () => {
      const cards = [
        createCardInfo({ id: '1', name: 'Apple' }),
        createCardInfo({ id: '2', name: 'Banana' }),
        createCardInfo({ id: '3', name: 'Episode 1' })
      ];
      
      const sorted = matcher.sortCards(cards, 'name_numeric');
      
      // 没有数字的项数字被视为0，按字典序排在前面
      expect(sorted[0].name).toBe('Apple');
      expect(sorted[1].name).toBe('Banana');
      expect(sorted[2].name).toBe('Episode 1');
    });
  });

  // ===== 置信度测试 =====
  describe('置信度计算', () => {
    it('数量一致时应该有较高置信度', () => {
      const matcher = new FileOrderMatcher();
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Episode 01' }),
        createCardInfo({ id: 'card-2', name: 'Episode 02' })
      ];
      const files = [
        createFileInfo({ name: 'ep01.mp4', path: '/ep01.mp4' }),
        createFileInfo({ name: 'ep02.mp4', path: '/ep02.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.warning).toBeUndefined();
    });

    it('数量不一致时应该有较低置信度', () => {
      const matcher = new FileOrderMatcher();
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Episode 01' }),
        createCardInfo({ id: 'card-2', name: 'Episode 02' }),
        createCardInfo({ id: 'card-3', name: 'Episode 03' }),
        createCardInfo({ id: 'card-4', name: 'Episode 04' })
      ];
      const files = [
        createFileInfo({ name: 'ep01.mp4', path: '/ep01.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.confidence).toBeLessThan(70);
      expect(result.warning).toBeDefined();
    });

    it('差距越大置信度越低', () => {
      const matcher = new FileOrderMatcher();
      
      // 差距小
      const result1 = matcher.match(
        [
          createCardInfo({ id: '1', name: 'A' }),
          createCardInfo({ id: '2', name: 'B' }),
          createCardInfo({ id: '3', name: 'C' })
        ],
        [
          createFileInfo({ name: '1.mp4', path: '/1.mp4' }),
          createFileInfo({ name: '2.mp4', path: '/2.mp4' })
        ]
      );
      
      // 差距大
      const result2 = matcher.match(
        [
          createCardInfo({ id: '1', name: 'A' }),
          createCardInfo({ id: '2', name: 'B' }),
          createCardInfo({ id: '3', name: 'C' }),
          createCardInfo({ id: '4', name: 'D' }),
          createCardInfo({ id: '5', name: 'E' }),
          createCardInfo({ id: '6', name: 'F' })
        ],
        [
          createFileInfo({ name: '1.mp4', path: '/1.mp4' })
        ]
      );
      
      expect(result1.confidence).toBeGreaterThan(result2.confidence);
    });
  });

  // ===== 边界情况测试 =====
  describe('边界情况', () => {
    const matcher = new FileOrderMatcher();

    it('应该处理单个卡片和文件', () => {
      const cards = [createCardInfo({ id: 'only', name: 'Only Card' })];
      const files = [createFileInfo({ name: 'only.mp4', path: '/only.mp4' })];
      
      const result = matcher.match(cards, files);
      
      expect(result.bindings).toHaveLength(1);
      expect(result.bindings[0].cardId).toBe('only');
      expect(result.confidence).toBeGreaterThan(80);
    });

    it('应该处理中文排序', () => {
      const cards = [
        createCardInfo({ id: '1', name: '第三集' }),
        createCardInfo({ id: '2', name: '第一集' }),
        createCardInfo({ id: '3', name: '第二集' })
      ];
      
      const sorted = matcher.sortCards(cards, 'name');
      
      // 中文按拼音排序
      expect(sorted.length).toBe(3);
    });

    it('应该处理特殊字符', () => {
      const cards = [
        createCardInfo({ id: '1', name: '[Special] Episode 01' }),
        createCardInfo({ id: '2', name: '(Bonus) Episode 02' })
      ];
      const files = [
        createFileInfo({ name: '[HD]ep01.mp4', path: '/ep01.mp4' }),
        createFileInfo({ name: '(SD)ep02.mp4', path: '/ep02.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.bindings).toHaveLength(2);
    });
  });

  // ===== 描述生成测试 =====
  describe('描述生成', () => {
    it('应该生成正确的描述', () => {
      const matcher = new FileOrderMatcher();
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Episode 01' }),
        createCardInfo({ id: 'card-2', name: 'Episode 02' })
      ];
      const files = [
        createFileInfo({ name: 'ep01.mp4', path: '/ep01.mp4' }),
        createFileInfo({ name: 'ep02.mp4', path: '/ep02.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.description).toBeDefined();
      expect(result.description).toContain('按顺序匹配了');
      expect(result.description).toContain('2 对');
    });

    it('数量不一致时描述应该包含警告', () => {
      const matcher = new FileOrderMatcher();
      
      const cards = [
        createCardInfo({ id: 'card-1', name: 'Episode 01' })
      ];
      const files = [
        createFileInfo({ name: 'ep01.mp4', path: '/ep01.mp4' }),
        createFileInfo({ name: 'ep02.mp4', path: '/ep02.mp4' })
      ];
      
      const result = matcher.match(cards, files);
      
      expect(result.description).toContain('数量不一致');
    });
  });
});
