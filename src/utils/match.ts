/**
 * 匹配工具函数
 * @module utils/match
 */

import type { NumberInfo } from '@/types/match';

/**
 * 从字符串中提取所有数字
 * @param text 输入字符串
 * @returns 数字信息数组
 */
export function extractNumbers(text: string): NumberInfo[] {
  const regex = /\d+/g;
  const results: NumberInfo[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    results.push({
      value: parseInt(match[0], 10),
      raw: match[0],
      position: match.index,
      length: match[0].length
    });
  }

  return results;
}

/**
 * 分词
 * @param text 输入文本
 * @returns 分词结果
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];

  // 提取英文单词
  const english = text.toLowerCase().match(/[a-z]+/g) || [];
  tokens.push(...english.filter(t => t.length > 1));

  // 提取中文字符
  const chinese = text.match(/[\u4e00-\u9fa5]+/g) || [];
  tokens.push(...chinese);

  // 提取数字
  const numbers = text.match(/\d+/g) || [];
  tokens.push(...numbers);

  return [...new Set(tokens)];
}

/**
 * 计算Jaccard相似度
 * @param set1 集合1
 * @param set2 集合2
 * @returns 相似度 (0-1)
 */
export function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 0;

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * 计算编辑距离（Levenshtein距离）
 * @param s1 字符串1
 * @param s2 字符串2
 * @returns 编辑距离
 */
export function editDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;

  // 创建DP表
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // 初始化
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // 填充DP表
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // 删除
          dp[i][j - 1] + 1,     // 插入
          dp[i - 1][j - 1] + 1  // 替换
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * 计算编辑距离相似度
 * @param s1 字符串1
 * @param s2 字符串2
 * @returns 相似度 (0-1)
 */
export function editDistanceSimilarity(s1: string, s2: string): number {
  const distance = editDistance(s1.toLowerCase(), s2.toLowerCase());
  const maxLen = Math.max(s1.length, s2.length);

  if (maxLen === 0) return 1;
  return 1 - distance / maxLen;
}

/**
 * 检测资源字段类型
 * @param cardType 卡片类型
 * @param fileType 文件类型
 * @returns 推荐的资源字段名
 */
export function detectResourceField(cardType: string, fileType: string): string {
  const fieldMap: Record<string, Record<string, string>> = {
    video: {
      video: 'video_file',
      subtitle: 'subtitle_file',
      image: 'cover_image'
    },
    audio: {
      audio: 'audio_file',
      image: 'cover_image'
    },
    image: {
      image: 'image_file'
    },
    document: {
      document: 'document_file',
      image: 'cover_image'
    }
  };

  return fieldMap[cardType]?.[fileType] || 'primary_resource';
}
