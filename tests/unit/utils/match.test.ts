/**
 * 匹配工具函数测试
 * @module tests/unit/utils/match
 */

import { describe, it, expect } from 'vitest';
import {
  extractNumbers,
  tokenize,
  jaccardSimilarity,
  editDistance,
  editDistanceSimilarity
} from '@/utils/match';

describe('匹配工具函数', () => {
  // ===== extractNumbers 测试 =====
  describe('extractNumbers', () => {
    it('应该提取单个数字', () => {
      const result = extractNumbers('Episode 01');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        value: 1,
        raw: '01',
        position: 8,
        length: 2
      });
    });

    it('应该提取多个数字', () => {
      const result = extractNumbers('S01E05');
      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(1);
      expect(result[0].raw).toBe('01');
      expect(result[1].value).toBe(5);
      expect(result[1].raw).toBe('05');
    });

    it('应该正确记录位置信息', () => {
      const result = extractNumbers('abc123def456');
      expect(result).toHaveLength(2);
      expect(result[0].position).toBe(3);
      expect(result[0].length).toBe(3);
      expect(result[1].position).toBe(9);
      expect(result[1].length).toBe(3);
    });

    it('应该处理没有数字的字符串', () => {
      const result = extractNumbers('no numbers here');
      expect(result).toHaveLength(0);
    });

    it('应该处理空字符串', () => {
      const result = extractNumbers('');
      expect(result).toHaveLength(0);
    });

    it('应该正确处理大数字', () => {
      const result = extractNumbers('Video 12345');
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(12345);
      expect(result[0].raw).toBe('12345');
    });

    it('应该处理前导零', () => {
      const result = extractNumbers('EP001');
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(1); // 值为整数
      expect(result[0].raw).toBe('001'); // 原始字符串保留前导零
    });

    it('应该处理中文环境中的数字', () => {
      const result = extractNumbers('第01话 - 标题');
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(1);
    });

    it('应该处理复杂的文件名格式', () => {
      const result = extractNumbers('[字幕组] 动漫名 第01话 [1080P].mp4');
      // 应该提取：01, 1080, 4 (来自 mp4)
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0].value).toBe(1);
      // 1080P 中的 1080
      const has1080 = result.some(r => r.value === 1080);
      expect(has1080).toBe(true);
    });
  });

  // ===== tokenize 测试 =====
  describe('tokenize', () => {
    it('应该提取英文单词', () => {
      const result = tokenize('Hello World');
      expect(result).toContain('hello');
      expect(result).toContain('world');
    });

    it('应该过滤单字符英文', () => {
      const result = tokenize('a b c hello');
      expect(result).not.toContain('a');
      expect(result).not.toContain('b');
      expect(result).not.toContain('c');
      expect(result).toContain('hello');
    });

    it('应该提取中文', () => {
      const result = tokenize('你好世界');
      expect(result).toContain('你好世界');
    });

    it('应该提取数字', () => {
      const result = tokenize('Episode 01');
      expect(result).toContain('01');
      expect(result).toContain('episode');
    });

    it('应该处理混合内容', () => {
      const result = tokenize('第01集 Episode Title');
      expect(result).toContain('01');
      expect(result).toContain('episode');
      expect(result).toContain('title');
      expect(result).toContain('第');
    });

    it('应该去重', () => {
      const result = tokenize('hello hello hello');
      const helloCount = result.filter((t) => t === 'hello').length;
      expect(helloCount).toBe(1);
    });

    it('应该处理空字符串', () => {
      const result = tokenize('');
      expect(result).toHaveLength(0);
    });

    it('应该处理特殊字符', () => {
      const result = tokenize('file-name_test.mp4');
      expect(result).toContain('file');
      expect(result).toContain('name');
      expect(result).toContain('test');
      expect(result).toContain('mp');
    });

    it('应该转换为小写', () => {
      const result = tokenize('UPPERCASE MixedCase');
      expect(result).toContain('uppercase');
      expect(result).toContain('mixedcase');
    });
  });

  // ===== jaccardSimilarity 测试 =====
  describe('jaccardSimilarity', () => {
    it('完全相同的集合应该返回1', () => {
      const set1 = new Set(['a', 'b', 'c']);
      const set2 = new Set(['a', 'b', 'c']);
      expect(jaccardSimilarity(set1, set2)).toBe(1);
    });

    it('完全不同的集合应该返回0', () => {
      const set1 = new Set(['a', 'b', 'c']);
      const set2 = new Set(['d', 'e', 'f']);
      expect(jaccardSimilarity(set1, set2)).toBe(0);
    });

    it('部分重叠的集合应该返回正确的相似度', () => {
      const set1 = new Set(['a', 'b', 'c']);
      const set2 = new Set(['b', 'c', 'd']);
      // 交集: {b, c} = 2
      // 并集: {a, b, c, d} = 4
      // 相似度: 2/4 = 0.5
      expect(jaccardSimilarity(set1, set2)).toBe(0.5);
    });

    it('一个集合是另一个的子集应该返回正确的相似度', () => {
      const set1 = new Set(['a', 'b']);
      const set2 = new Set(['a', 'b', 'c', 'd']);
      // 交集: {a, b} = 2
      // 并集: {a, b, c, d} = 4
      // 相似度: 2/4 = 0.5
      expect(jaccardSimilarity(set1, set2)).toBe(0.5);
    });

    it('两个空集合应该返回0', () => {
      const set1 = new Set<string>();
      const set2 = new Set<string>();
      expect(jaccardSimilarity(set1, set2)).toBe(0);
    });

    it('一个空集合应该返回0', () => {
      const set1 = new Set(['a', 'b']);
      const set2 = new Set<string>();
      expect(jaccardSimilarity(set1, set2)).toBe(0);
    });

    it('应该正确处理单元素集合', () => {
      const set1 = new Set(['a']);
      const set2 = new Set(['a']);
      expect(jaccardSimilarity(set1, set2)).toBe(1);

      const set3 = new Set(['a']);
      const set4 = new Set(['b']);
      expect(jaccardSimilarity(set3, set4)).toBe(0);
    });
  });

  // ===== editDistance 测试 =====
  describe('editDistance', () => {
    it('相同字符串应该返回0', () => {
      expect(editDistance('hello', 'hello')).toBe(0);
      expect(editDistance('', '')).toBe(0);
      expect(editDistance('abc', 'abc')).toBe(0);
    });

    it('空字符串与非空字符串的距离应该是非空字符串的长度', () => {
      expect(editDistance('', 'hello')).toBe(5);
      expect(editDistance('hello', '')).toBe(5);
      expect(editDistance('', 'abc')).toBe(3);
    });

    it('应该正确计算插入操作', () => {
      expect(editDistance('cat', 'cats')).toBe(1);
      expect(editDistance('a', 'abc')).toBe(2);
    });

    it('应该正确计算删除操作', () => {
      expect(editDistance('cats', 'cat')).toBe(1);
      expect(editDistance('abc', 'a')).toBe(2);
    });

    it('应该正确计算替换操作', () => {
      expect(editDistance('cat', 'bat')).toBe(1);
      expect(editDistance('cat', 'car')).toBe(1);
    });

    it('应该正确计算混合操作', () => {
      expect(editDistance('kitten', 'sitting')).toBe(3);
      expect(editDistance('sunday', 'saturday')).toBe(3);
    });

    it('应该是对称的', () => {
      expect(editDistance('abc', 'def')).toBe(editDistance('def', 'abc'));
      expect(editDistance('hello', 'world')).toBe(editDistance('world', 'hello'));
    });

    it('应该正确处理中文', () => {
      expect(editDistance('你好', '你好')).toBe(0);
      expect(editDistance('你好', '你坏')).toBe(1);
      expect(editDistance('你好世界', '你好')).toBe(2);
    });

    it('应该正确处理数字', () => {
      expect(editDistance('123', '123')).toBe(0);
      expect(editDistance('123', '124')).toBe(1);
      expect(editDistance('123', '456')).toBe(3);
    });
  });

  // ===== editDistanceSimilarity 测试 =====
  describe('editDistanceSimilarity', () => {
    it('相同字符串应该返回1', () => {
      expect(editDistanceSimilarity('hello', 'hello')).toBe(1);
      expect(editDistanceSimilarity('abc', 'abc')).toBe(1);
    });

    it('完全不同的字符串应该返回低相似度', () => {
      const similarity = editDistanceSimilarity('abc', 'xyz');
      expect(similarity).toBe(0); // 3 edits for 3 characters = 0 similarity
    });

    it('两个空字符串应该返回1', () => {
      expect(editDistanceSimilarity('', '')).toBe(1);
    });

    it('应该是大小写不敏感的', () => {
      expect(editDistanceSimilarity('Hello', 'hello')).toBe(1);
      expect(editDistanceSimilarity('ABC', 'abc')).toBe(1);
      expect(editDistanceSimilarity('HeLLo', 'hEllO')).toBe(1);
    });

    it('部分相似的字符串应该返回正确的相似度', () => {
      // "cat" vs "cats": 1 edit, max length = 4
      // similarity = 1 - 1/4 = 0.75
      expect(editDistanceSimilarity('cat', 'cats')).toBe(0.75);
    });

    it('应该返回0到1之间的值', () => {
      const testCases = [
        ['hello', 'world'],
        ['abc', 'def'],
        ['test', 'testing'],
        ['video001', 'video002']
      ];

      for (const [s1, s2] of testCases) {
        const similarity = editDistanceSimilarity(s1, s2);
        expect(similarity).toBeGreaterThanOrEqual(0);
        expect(similarity).toBeLessThanOrEqual(1);
      }
    });

    it('应该正确处理文件名比较', () => {
      // 相似的文件名应该有较高的相似度
      const sim1 = editDistanceSimilarity('video001.mp4', 'video002.mp4');
      const sim2 = editDistanceSimilarity('video001.mp4', 'audio001.mp3');

      expect(sim1).toBeGreaterThan(sim2);
    });

    it('应该正确处理带编号的文件名', () => {
      const sim1 = editDistanceSimilarity('Episode_01', 'Episode_02');
      const sim2 = editDistanceSimilarity('Episode_01', 'Episode_10');

      // 两者都应该有较高的相似度（>= 0.8）
      expect(sim1).toBeGreaterThanOrEqual(0.8);
      expect(sim2).toBeGreaterThanOrEqual(0.8);
    });
  });
});
