/**
 * 并发控制器
 * @description 控制并发执行数量
 * @module core/executors/ConcurrencyController
 */

/**
 * 任务项接口
 */
interface TaskItem<T> {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

/**
 * 并发控制器
 * 用于限制并发执行的任务数量
 */
export class ConcurrencyController {
  /** 最大并发数 */
  private maxConcurrent: number;
  
  /** 当前运行中的任务数 */
  private running: number = 0;
  
  /** 等待队列 */
  private queue: TaskItem<unknown>[] = [];
  
  /** 是否已暂停 */
  private paused: boolean = false;

  /**
   * 创建并发控制器实例
   * @param maxConcurrent 最大并发数，默认为3
   */
  constructor(maxConcurrent: number = 3) {
    if (maxConcurrent < 1) {
      throw new Error('最大并发数必须大于0');
    }
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * 添加任务到队列
   * @param task 异步任务函数
   * @returns 任务执行结果的Promise
   */
  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const taskItem: TaskItem<T> = {
        task,
        resolve: resolve as (value: unknown) => void,
        reject
      };

      this.queue.push(taskItem as TaskItem<unknown>);
      this.process();
    });
  }

  /**
   * 批量添加任务
   * @param tasks 任务函数数组
   * @returns 所有任务结果的Promise
   */
  async addAll<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(tasks.map(task => this.add(task)));
  }

  /**
   * 等待所有任务完成
   * @returns 完成Promise
   */
  async waitAll(): Promise<void> {
    return new Promise<void>((resolve) => {
      const check = () => {
        if (this.running === 0 && this.queue.length === 0) {
          resolve();
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }

  /**
   * 处理队列中的任务
   */
  private process(): void {
    if (this.paused) {
      return;
    }

    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const taskItem = this.queue.shift();
      if (taskItem) {
        this.runTask(taskItem);
      }
    }
  }

  /**
   * 执行单个任务
   * @param taskItem 任务项
   */
  private async runTask<T>(taskItem: TaskItem<T>): Promise<void> {
    this.running++;

    try {
      const result = await taskItem.task();
      taskItem.resolve(result);
    } catch (error) {
      taskItem.reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }

  /**
   * 获取等待中的任务数
   * @returns 等待任务数
   */
  getPending(): number {
    return this.queue.length;
  }

  /**
   * 获取运行中的任务数
   * @returns 运行任务数
   */
  getRunning(): number {
    return this.running;
  }

  /**
   * 获取总任务数（运行中 + 等待中）
   * @returns 总任务数
   */
  getTotal(): number {
    return this.running + this.queue.length;
  }

  /**
   * 设置最大并发数
   * @param value 新的最大并发数
   */
  setMaxConcurrent(value: number): void {
    if (value < 1) {
      throw new Error('最大并发数必须大于0');
    }
    this.maxConcurrent = value;
    // 如果增加了并发数，尝试处理更多任务
    this.process();
  }

  /**
   * 获取最大并发数
   * @returns 最大并发数
   */
  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }

  /**
   * 暂停任务处理
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * 恢复任务处理
   */
  resume(): void {
    this.paused = false;
    this.process();
  }

  /**
   * 是否已暂停
   * @returns 暂停状态
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * 清空等待队列
   * 注意：已经在运行的任务不会被取消
   * @returns 被清除的任务数
   */
  clear(): number {
    const count = this.queue.length;
    
    // 拒绝所有等待中的任务
    for (const taskItem of this.queue) {
      taskItem.reject(new Error('任务已取消'));
    }
    
    this.queue = [];
    return count;
  }

  /**
   * 是否空闲（无运行和等待任务）
   * @returns 是否空闲
   */
  isIdle(): boolean {
    return this.running === 0 && this.queue.length === 0;
  }
}

export default ConcurrencyController;
