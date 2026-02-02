/**
 * 模式转换器
 * @description 实现资源模式转换（空壳↔全填充）
 * @module core/executors/ModeConverter
 */

import { EventEmitter } from 'events';
import type { CardInfo, ResourceMode, ResourceInfo } from '@/types/card';
import type { 
  ConvertOptions, 
  ConvertProgress, 
  ConvertResult, 
  ConvertDetail, 
  ConvertError 
} from '@/types/convert';
import type { FileType } from '@/types/file';

/**
 * SDK接口定义（适配层）
 */
interface ChipsSDK {
  getCard(cardId: string): Promise<CardInfo | null>;
  updateCard(cardId: string, updates: Record<string, unknown>): Promise<void>;
  getCardResources(cardId: string): Promise<ResourceInfo[]>;
  copyResource(source: string, target: string): Promise<void>;
  moveResource(source: string, target: string): Promise<void>;
  deleteResource(path: string): Promise<void>;
  getFileSize(path: string): Promise<number>;
  fileExists(path: string): Promise<boolean>;
  getDiskSpace(path: string): Promise<{ available: number; total: number }>;
  getCardInternalPath(cardId: string): string;
  ensureDirectory(path: string): Promise<void>;
}

/**
 * 日志接口
 */
interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * 默认日志实现
 */
const defaultLogger: Logger = {
  debug: (msg, ...args) => console.debug(`[ModeConverter] ${msg}`, ...args),
  info: (msg, ...args) => console.info(`[ModeConverter] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[ModeConverter] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ModeConverter] ${msg}`, ...args)
};

/**
 * 默认转换选项
 */
const DEFAULT_OPTIONS: Required<Omit<ConvertOptions, 'targetPath'>> & { targetPath?: string } = {
  targetPath: undefined,
  resourceTypes: [],
  sizeLimit: 0,
  conflictStrategy: 'rename',
  onProgress: () => {}
};

/**
 * 转换器事件类型
 */
export interface ModeConverterEvents {
  'start': { cardIds: string[]; targetMode: ResourceMode };
  'progress': ConvertProgress;
  'card:start': { cardId: string; cardName: string };
  'card:complete': { cardId: string; cardName: string; status: string };
  'resource:start': { cardId: string; resourcePath: string };
  'resource:complete': { cardId: string; resourcePath: string };
  'resource:error': { cardId: string; resourcePath: string; error: string };
  'complete': ConvertResult;
  'error': { message: string };
}

/**
 * 路径工具函数
 */
function getFileName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1];
}

function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}

function isAbsolutePath(path: string): boolean {
  // Unix绝对路径 或 Windows绝对路径
  return path.startsWith('/') || /^[A-Za-z]:/.test(path);
}

/**
 * 模式转换器
 * 负责卡片资源模式的转换
 */
export class ModeConverter extends EventEmitter {
  private sdk: ChipsSDK;
  private logger: Logger;
  
  /** 是否正在转换 */
  private converting: boolean = false;
  /** 是否已取消 */
  private cancelled: boolean = false;
  /** 当前进度 */
  private progress: ConvertProgress | null = null;

  /**
   * 创建模式转换器实例
   * @param sdk ChipsSDK实例
   * @param logger 日志记录器
   */
  constructor(sdk: ChipsSDK, logger?: Logger) {
    super();
    this.sdk = sdk;
    this.logger = logger || defaultLogger;
  }

  /**
   * 检测卡片资源模式
   * @param cardId 卡片ID
   * @returns 资源模式
   */
  async detectMode(cardId: string): Promise<ResourceMode> {
    const card = await this.sdk.getCard(cardId);
    if (!card) {
      throw new Error(`卡片不存在: ${cardId}`);
    }

    const resources = await this.sdk.getCardResources(cardId);
    
    if (resources.length === 0) {
      // 没有资源，视为空壳
      return 'empty';
    }

    const internalCount = resources.filter(r => r.internal).length;
    const externalCount = resources.filter(r => !r.internal).length;

    if (internalCount === resources.length) {
      return 'full';
    } else if (externalCount === resources.length) {
      return 'empty';
    } else {
      return 'semi';
    }
  }

  /**
   * 获取卡片的外部资源列表
   * @param cardId 卡片ID
   * @returns 外部资源列表
   */
  async getExternalResources(cardId: string): Promise<ResourceInfo[]> {
    const resources = await this.sdk.getCardResources(cardId);
    return resources.filter(r => !r.internal);
  }

  /**
   * 获取卡片的内部资源列表
   * @param cardId 卡片ID
   * @returns 内部资源列表
   */
  async getInternalResources(cardId: string): Promise<ResourceInfo[]> {
    const resources = await this.sdk.getCardResources(cardId);
    return resources.filter(r => r.internal);
  }

  /**
   * 转换为全填充模式
   * 将外部资源复制到卡片内部
   * @param cardIds 卡片ID列表
   * @param options 转换选项
   * @returns 转换结果
   */
  async toFull(
    cardIds: string[],
    options?: ConvertOptions
  ): Promise<ConvertResult> {
    if (this.converting) {
      throw new Error('已有转换任务正在进行中');
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    this.converting = true;
    this.cancelled = false;

    const details: ConvertDetail[] = [];
    const errors: ConvertError[] = [];
    let totalSize = 0;

    // 初始化进度
    this.progress = {
      currentCard: 0,
      totalCards: cardIds.length,
      currentResource: 0,
      totalResources: 0,
      bytesTransferred: 0,
      totalBytes: 0,
      percentage: 0
    };

    this.emit('start', { cardIds, targetMode: 'full' });
    this.logger.info(`开始转换 ${cardIds.length} 个卡片为全填充模式`);

    try {
      // 计算总资源数和总大小
      for (const cardId of cardIds) {
        const external = await this.getExternalResources(cardId);
        this.progress.totalResources += external.length;
        this.progress.totalBytes += external.reduce((sum, r) => sum + r.size, 0);
      }

      for (let i = 0; i < cardIds.length; i++) {
        if (this.cancelled) break;

        const cardId = cardIds[i];
        const card = await this.sdk.getCard(cardId);
        
        if (!card) {
          errors.push({
            cardId,
            code: 'CARD_NOT_FOUND',
            message: '卡片不存在'
          });
          continue;
        }

        this.progress.currentCard = i + 1;
        this.progress.cardId = cardId;
        this.emit('card:start', { cardId, cardName: card.name });

        const result = await this.convertCardToFull(card, opts);
        
        details.push(result.detail);
        errors.push(...result.errors);
        totalSize += result.detail.size;

        this.emit('card:complete', { 
          cardId, 
          cardName: card.name, 
          status: result.detail.status 
        });
      }

    } catch (error) {
      this.logger.error('转换过程中发生错误', error);
      this.emit('error', { message: (error as Error).message });
    } finally {
      this.converting = false;
    }

    const result: ConvertResult = {
      success: details.filter(d => d.status === 'success').length,
      failed: details.filter(d => d.status === 'failed').length,
      totalSize,
      duration: Date.now() - startTime,
      details,
      errors
    };

    this.emit('complete', result);
    this.logger.info(`转换完成: 成功=${result.success}, 失败=${result.failed}`);

    return result;
  }

  /**
   * 转换为空壳模式
   * 将内部资源移出到外部目标路径
   * @param cardIds 卡片ID列表
   * @param targetPath 目标路径
   * @param options 转换选项
   * @returns 转换结果
   */
  async toEmpty(
    cardIds: string[],
    targetPath: string,
    options?: ConvertOptions
  ): Promise<ConvertResult> {
    if (this.converting) {
      throw new Error('已有转换任务正在进行中');
    }

    if (!targetPath) {
      throw new Error('目标路径不能为空');
    }

    const opts = { ...DEFAULT_OPTIONS, ...options, targetPath };
    const startTime = Date.now();

    this.converting = true;
    this.cancelled = false;

    const details: ConvertDetail[] = [];
    const errors: ConvertError[] = [];
    let totalSize = 0;

    // 初始化进度
    this.progress = {
      currentCard: 0,
      totalCards: cardIds.length,
      currentResource: 0,
      totalResources: 0,
      bytesTransferred: 0,
      totalBytes: 0,
      percentage: 0
    };

    this.emit('start', { cardIds, targetMode: 'empty' });
    this.logger.info(`开始转换 ${cardIds.length} 个卡片为空壳模式，目标路径: ${targetPath}`);

    try {
      // 确保目标目录存在
      await this.sdk.ensureDirectory(targetPath);

      // 计算总资源数和总大小
      for (const cardId of cardIds) {
        const internal = await this.getInternalResources(cardId);
        this.progress.totalResources += internal.length;
        this.progress.totalBytes += internal.reduce((sum, r) => sum + r.size, 0);
      }

      for (let i = 0; i < cardIds.length; i++) {
        if (this.cancelled) break;

        const cardId = cardIds[i];
        const card = await this.sdk.getCard(cardId);
        
        if (!card) {
          errors.push({
            cardId,
            code: 'CARD_NOT_FOUND',
            message: '卡片不存在'
          });
          continue;
        }

        this.progress.currentCard = i + 1;
        this.progress.cardId = cardId;
        this.emit('card:start', { cardId, cardName: card.name });

        const result = await this.convertCardToEmpty(card, targetPath, opts);
        
        details.push(result.detail);
        errors.push(...result.errors);
        totalSize += result.detail.size;

        this.emit('card:complete', { 
          cardId, 
          cardName: card.name, 
          status: result.detail.status 
        });
      }

    } catch (error) {
      this.logger.error('转换过程中发生错误', error);
      this.emit('error', { message: (error as Error).message });
    } finally {
      this.converting = false;
    }

    const result: ConvertResult = {
      success: details.filter(d => d.status === 'success').length,
      failed: details.filter(d => d.status === 'failed').length,
      totalSize,
      duration: Date.now() - startTime,
      details,
      errors
    };

    this.emit('complete', result);
    this.logger.info(`转换完成: 成功=${result.success}, 失败=${result.failed}`);

    return result;
  }

  /**
   * 计算所需空间
   * @param cardIds 卡片ID列表
   * @returns 所需字节数
   */
  async calculateRequiredSpace(cardIds: string[]): Promise<number> {
    let totalSize = 0;

    for (const cardId of cardIds) {
      const resources = await this.sdk.getCardResources(cardId);
      for (const resource of resources) {
        totalSize += resource.size;
      }
    }

    return totalSize;
  }

  /**
   * 检查磁盘空间
   * @param path 目标路径
   * @param required 所需字节数
   * @returns 是否有足够空间
   */
  async checkDiskSpace(path: string, required: number): Promise<boolean> {
    try {
      const { available } = await this.sdk.getDiskSpace(path);
      // 保留10%的余量
      return available > required * 1.1;
    } catch {
      this.logger.warn('无法获取磁盘空间信息');
      return true; // 无法获取时假设有足够空间
    }
  }

  /**
   * 获取可用磁盘空间
   * @param path 路径
   * @returns 可用字节数
   */
  async getAvailableSpace(path: string): Promise<number> {
    try {
      const { available } = await this.sdk.getDiskSpace(path);
      return available;
    } catch {
      return 0;
    }
  }

  /**
   * 转换单个卡片为全填充模式
   * @param card 卡片信息
   * @param options 转换选项
   * @returns 转换详情和错误
   */
  private async convertCardToFull(
    card: CardInfo,
    options: Required<Omit<ConvertOptions, 'targetPath'>>
  ): Promise<{ detail: ConvertDetail; errors: ConvertError[] }> {
    const errors: ConvertError[] = [];
    let resourceCount = 0;
    let totalSize = 0;
    let hasError = false;

    const externalResources = await this.getExternalResources(card.id);
    const internalPath = this.sdk.getCardInternalPath(card.id);

    // 确保内部目录存在
    await this.sdk.ensureDirectory(internalPath);

    for (const resource of externalResources) {
      if (this.cancelled) break;

      // 类型过滤
      if (options.resourceTypes.length > 0) {
        const resourceType = this.getResourceType(resource);
        if (!options.resourceTypes.includes(resourceType)) {
          continue;
        }
      }

      // 大小限制
      if (options.sizeLimit > 0 && resource.size > options.sizeLimit) {
        continue;
      }

      this.progress!.currentResource++;
      this.progress!.resourcePath = resource.uri;
      this.emit('resource:start', { cardId: card.id, resourcePath: resource.uri });

      try {
        const fileName = getFileName(resource.uri);
        let targetPath = joinPath(internalPath, fileName);

        // 处理冲突
        if (await this.sdk.fileExists(targetPath)) {
          switch (options.conflictStrategy) {
            case 'skip':
              continue;
            case 'rename':
              targetPath = await this.generateUniqueName(targetPath);
              break;
            case 'overwrite':
              // 直接覆盖
              break;
          }
        }

        await this.sdk.copyResource(resource.uri, targetPath);
        
        // 更新进度
        this.progress!.bytesTransferred += resource.size;
        this.updateProgress();

        resourceCount++;
        totalSize += resource.size;

        this.emit('resource:complete', { cardId: card.id, resourcePath: resource.uri });
      } catch (error) {
        hasError = true;
        errors.push({
          cardId: card.id,
          resourcePath: resource.uri,
          code: 'COPY_ERROR',
          message: (error as Error).message
        });
        this.emit('resource:error', { 
          cardId: card.id, 
          resourcePath: resource.uri, 
          error: (error as Error).message 
        });
      }
    }

    // 更新卡片配置
    if (resourceCount > 0 && !hasError) {
      await this.updateCardResourcePaths(card, 'internal');
    }

    return {
      detail: {
        cardId: card.id,
        cardName: card.name,
        status: hasError ? (resourceCount > 0 ? 'partial' : 'failed') : 'success',
        resourceCount,
        size: totalSize
      },
      errors
    };
  }

  /**
   * 转换单个卡片为空壳模式
   * @param card 卡片信息
   * @param targetPath 目标路径
   * @param options 转换选项
   * @returns 转换详情和错误
   */
  private async convertCardToEmpty(
    card: CardInfo,
    targetPath: string,
    options: Required<Omit<ConvertOptions, 'targetPath'>>
  ): Promise<{ detail: ConvertDetail; errors: ConvertError[] }> {
    const errors: ConvertError[] = [];
    let resourceCount = 0;
    let totalSize = 0;
    let hasError = false;

    const internalResources = await this.getInternalResources(card.id);

    // 创建卡片专用目录
    const cardTargetPath = joinPath(targetPath, card.name);
    await this.sdk.ensureDirectory(cardTargetPath);

    for (const resource of internalResources) {
      if (this.cancelled) break;

      // 类型过滤
      if (options.resourceTypes.length > 0) {
        const resourceType = this.getResourceType(resource);
        if (!options.resourceTypes.includes(resourceType)) {
          continue;
        }
      }

      // 大小限制
      if (options.sizeLimit > 0 && resource.size > options.sizeLimit) {
        continue;
      }

      this.progress!.currentResource++;
      this.progress!.resourcePath = resource.uri;
      this.emit('resource:start', { cardId: card.id, resourcePath: resource.uri });

      try {
        const fileName = getFileName(resource.uri);
        let newPath = joinPath(cardTargetPath, fileName);

        // 处理冲突
        if (await this.sdk.fileExists(newPath)) {
          switch (options.conflictStrategy) {
            case 'skip':
              continue;
            case 'rename':
              newPath = await this.generateUniqueName(newPath);
              break;
            case 'overwrite':
              // 直接覆盖
              break;
          }
        }

        await this.sdk.moveResource(resource.uri, newPath);
        
        // 更新进度
        this.progress!.bytesTransferred += resource.size;
        this.updateProgress();

        resourceCount++;
        totalSize += resource.size;

        this.emit('resource:complete', { cardId: card.id, resourcePath: resource.uri });
      } catch (error) {
        hasError = true;
        errors.push({
          cardId: card.id,
          resourcePath: resource.uri,
          code: 'MOVE_ERROR',
          message: (error as Error).message
        });
        this.emit('resource:error', { 
          cardId: card.id, 
          resourcePath: resource.uri, 
          error: (error as Error).message 
        });
      }
    }

    // 更新卡片配置
    if (resourceCount > 0 && !hasError) {
      await this.updateCardResourcePaths(card, 'external', cardTargetPath);
    }

    return {
      detail: {
        cardId: card.id,
        cardName: card.name,
        status: hasError ? (resourceCount > 0 ? 'partial' : 'failed') : 'success',
        resourceCount,
        size: totalSize
      },
      errors
    };
  }

  /**
   * 更新卡片资源路径
   * @param card 卡片信息
   * @param mode 目标模式
   * @param externalPath 外部路径（空壳模式时使用）
   */
  private async updateCardResourcePaths(
    card: CardInfo,
    mode: 'internal' | 'external',
    externalPath?: string
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      resourceMode: mode === 'internal' ? 'full' : 'empty'
    };

    // 这里可以根据实际SDK实现来更新资源路径
    // 简化实现：只更新resourceMode
    await this.sdk.updateCard(card.id, updates);
  }

  /**
   * 生成唯一文件名
   * @param path 原始路径
   * @returns 唯一路径
   */
  private async generateUniqueName(path: string): Promise<string> {
    const dir = path.substring(0, path.lastIndexOf('/'));
    const name = getFileName(path);
    const dotIndex = name.lastIndexOf('.');
    const baseName = dotIndex > 0 ? name.substring(0, dotIndex) : name;
    const ext = dotIndex > 0 ? name.substring(dotIndex) : '';

    let counter = 1;
    let newPath = path;

    while (await this.sdk.fileExists(newPath)) {
      newPath = joinPath(dir, `${baseName}_${counter}${ext}`);
      counter++;
      
      if (counter > 1000) {
        throw new Error('无法生成唯一文件名');
      }
    }

    return newPath;
  }

  /**
   * 获取资源类型
   * @param resource 资源信息
   * @returns 文件类型
   */
  private getResourceType(resource: ResourceInfo): FileType {
    const mimeType = resource.mimeType.toLowerCase();
    
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('document') || mimeType.includes('pdf') || mimeType.includes('text/')) return 'document';
    if (mimeType.includes('subtitle')) return 'subtitle';
    if (mimeType.includes('archive') || mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
    
    return 'other';
  }

  /**
   * 更新进度
   */
  private updateProgress(): void {
    if (this.progress) {
      this.progress.percentage = Math.round(
        (this.progress.bytesTransferred / Math.max(this.progress.totalBytes, 1)) * 100
      );

      this.emit('progress', { ...this.progress });
    }
  }

  /**
   * 取消转换
   */
  cancel(): void {
    if (!this.converting) {
      return;
    }

    this.cancelled = true;
    this.logger.info('转换已取消');
  }

  /**
   * 是否正在转换
   * @returns 转换状态
   */
  isConverting(): boolean {
    return this.converting;
  }

  /**
   * 获取当前进度
   * @returns 转换进度
   */
  getProgress(): ConvertProgress | null {
    return this.progress ? { ...this.progress } : null;
  }
}

export default ModeConverter;
