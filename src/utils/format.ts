/**
 * 格式化工具函数
 * @module utils/format
 */

/**
 * 格式化时间
 * @param ms 毫秒数
 * @returns 格式化后的时间字符串
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}秒`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}分${remainingSeconds}秒`
      : `${minutes}分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}小时${remainingMinutes}分钟`;
}

/**
 * 格式化百分比
 * @param value 值 (0-1 或 0-100)
 * @param decimals 小数位数
 * @param isDecimal 是否是小数形式 (0-1)
 * @returns 格式化后的百分比字符串
 */
export function formatPercentage(
  value: number,
  decimals: number = 0,
  isDecimal: boolean = false
): string {
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * 格式化日期
 * @param date 日期
 * @param format 格式
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | string, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return format
    .replace('YYYY', d.getFullYear().toString())
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
    .replace('ss', pad(d.getSeconds()));
}

/**
 * 截断字符串
 * @param str 字符串
 * @param maxLength 最大长度
 * @param suffix 后缀
 * @returns 截断后的字符串
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 格式化数量
 * @param count 数量
 * @returns 格式化后的字符串
 */
export function formatCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  if (count < 10000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  if (count < 1000000) {
    return `${Math.round(count / 1000)}K`;
  }
  return `${(count / 1000000).toFixed(1)}M`;
}
