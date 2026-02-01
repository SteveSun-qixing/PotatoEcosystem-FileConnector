/**
 * 异步工具函数
 * @module utils/async
 */

/**
 * 延迟执行
 * @param ms 延迟毫秒数
 * @returns Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试的异步操作
 * @param operation 操作函数
 * @param maxAttempts 最大尝试次数
 * @param delayMs 重试间隔
 * @param backoff 是否使用指数退避
 * @returns 操作结果
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000,
  backoff: boolean = true
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts - 1) {
        const waitTime = backoff ? delayMs * Math.pow(2, attempt) : delayMs;
        await delay(waitTime);
      }
    }
  }

  throw lastError;
}

/**
 * 带超时的异步操作
 * @param operation 操作函数
 * @param timeoutMs 超时毫秒数
 * @param timeoutError 超时错误消息
 * @returns 操作结果
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutError: string = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutError));
    }, timeoutMs);

    operation
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * 防抖函数
 * @param fn 函数
 * @param wait 等待时间
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      fn.apply(this, args);
    }, wait);
  };
}

/**
 * 节流函数
 * @param fn 函数
 * @param wait 等待时间
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: Parameters<T>) => void>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastTime >= wait) {
      lastTime = now;
      fn.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastTime = Date.now();
        timeout = null;
        fn.apply(this, args);
      }, wait - (now - lastTime));
    }
  };
}

/**
 * 并发控制
 * @param tasks 任务数组
 * @param concurrency 并发数
 * @returns 结果数组
 */
export async function concurrent<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];
  
  for (const task of tasks) {
    const p = task().then(result => {
      results.push(result);
    });
    
    executing.push(p as Promise<void>);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // 移除已完成的
      const completed = executing.filter(
        p => !['pending'].includes((p as Promise<void> & { status?: string }).status || 'pending')
      );
      for (const c of completed) {
        const index = executing.indexOf(c);
        if (index > -1) executing.splice(index, 1);
      }
    }
  }
  
  await Promise.all(executing);
  return results;
}
