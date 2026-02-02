# Core 模块 API 文档

**版本**: 1.0.0  
**更新时间**: 2026-02-02

---

## 文档说明

本文档详细描述了 Chips-FileConnector 核心模块的 API，包括：
- 匹配器（Matchers）- 实现各种匹配算法
- 执行器（Executors）- 执行绑定和转换操作
- 验证器（Validators）- 验证绑定有效性

核心模块位于 `src/core/` 目录下。

---

## 目录

1. [匹配器模块 (Matchers)](#1-匹配器模块-matchers)
   - [IMatcher 接口](#11-imatcher-接口)
   - [BaseMatcher 基类](#12-basematcher-基类)
   - [NumberSequenceMatcher](#13-numbersequencematcher)
   - [KeywordMatcher](#14-keywordmatcher)
   - [FileOrderMatcher](#15-fileordermatcher)
   - [SmartMatcher](#16-smartmatcher)
   - [SchemeGenerator](#17-schemegenerator)
2. [执行器模块 (Executors)](#2-执行器模块-executors)
   - [BindingExecutor](#21-bindingexecutor)
   - [ModeConverter](#22-modeconverter)
   - [ConcurrencyController](#23-concurrencycontroller)
3. [验证器模块 (Validators)](#3-验证器模块-validators)
   - [BindingValidator](#31-bindingvalidator)

---

## 1. 匹配器模块 (Matchers)

**路径**: `src/core/matchers/`

### 1.1 IMatcher 接口

所有匹配器需要实现的接口定义。

**路径**: `src/core/matchers/BaseMatcher.ts`

```typescript
interface IMatcher {
  /** 匹配器名称 */
  readonly name: string;
  
  /** 匹配模式 */
  readonly mode: MatchMode;
  
  /**
   * 执行匹配
   * @param cards 卡片列表
   * @param files 文件列表
   * @param options 匹配选项
   * @returns 匹配方案
   */
  match(cards: CardInfo[], files: FileInfo[], options?: MatchOptions): MatchScheme;
  
  /**
   * 检查此匹配器是否适用于当前数据
   * @param cards 卡片列表
   * @param files 文件列表
   * @returns 是否适用
   */
  isApplicable(cards: CardInfo[], files: FileInfo[]): boolean;
}
```

---

### 1.2 BaseMatcher 基类

匹配器基类，提供公共功能的默认实现。

**路径**: `src/core/matchers/BaseMatcher.ts`

#### 抽象属性

```typescript
abstract readonly name: string;
abstract readonly mode: MatchMode;
```

#### 抽象方法

```typescript
abstract match(cards: CardInfo[], files: FileInfo[], options?: MatchOptions): MatchScheme;
```

#### 公共方法

##### isApplicable

```typescript
isApplicable(_cards: CardInfo[], _files: FileInfo[]): boolean
```

默认实现返回 `true`，子类可覆盖此方法。

#### 受保护方法

##### createEmptyScheme

```typescript
protected createEmptyScheme(): MatchScheme
```

创建空的匹配方案。

##### calculateBaseConfidence

```typescript
protected calculateBaseConfidence(
  matchedCount: number,
  totalCards: number,
  totalFiles: number
): number
```

计算基础置信度。

| 参数名 | 类型 | 说明 |
|-------|------|------|
| matchedCount | `number` | 匹配数量 |
| totalCards | `number` | 总卡片数 |
| totalFiles | `number` | 总文件数 |

**返回值**: 置信度（0-100）

---

### 1.3 NumberSequenceMatcher

数字序列匹配器，通过提取卡片名和文件名中的数字进行匹配。

**路径**: `src/core/matchers/NumberSequenceMatcher.ts`

#### 构造函数

```typescript
constructor(config?: Partial<NumberMatchConfig>)
```

##### NumberMatchConfig

```typescript
interface NumberMatchConfig {
  /** 卡片数字位置选择 */
  cardPosition: NumberPosition;
  /** 文件数字位置选择 */
  filePosition: NumberPosition;
  /** 冲突处理策略 */
  conflictStrategy: ConflictStrategy;
}

type NumberPosition = 'first' | 'last' | 'longest' | 'auto';
type ConflictStrategy = 'first' | 'skip' | 'manual';
```

##### 默认配置

```typescript
{
  cardPosition: 'auto',
  filePosition: 'auto',
  conflictStrategy: 'skip'
}
```

#### 属性

```typescript
readonly name = 'NumberSequenceMatcher';
readonly mode: MatchMode = 'number_sequence';
```

#### 方法

##### selectNumber

```typescript
selectNumber(numbers: NumberInfo[], position: NumberPosition): NumberInfo | null
```

选择用于匹配的数字。

**智能选择策略 (auto)**:
1. 优先选择 2-3 位数字（常见编号格式如 01, 02, 001）
2. 排除可能是年份的 4 位数字（1900-2100）
3. 如果没有合适的，使用最后一个数字

##### isApplicable

```typescript
isApplicable(cards: CardInfo[], files: FileInfo[]): boolean
```

当至少 50% 的卡片和文件都包含数字时适用。

##### match

```typescript
match(cards: CardInfo[], files: FileInfo[], options?: MatchOptions): MatchScheme
```

执行数字序列匹配。

##### resolveConflicts

```typescript
resolveConflicts(
  _conflicts: MatchConflict[],
  strategy: ConflictStrategy,
  cardList: CardInfo[],
  fileList: FileInfo[]
): BindingItem[]
```

处理冲突情况（同一数字对应多个卡片或文件）。

#### 使用示例

```typescript
import { NumberSequenceMatcher } from '@/core/matchers/NumberSequenceMatcher';

const matcher = new NumberSequenceMatcher({
  cardPosition: 'auto',
  conflictStrategy: 'skip'
});

// 检查是否适用
if (matcher.isApplicable(cards, files)) {
  const scheme = matcher.match(cards, files);
  console.log(`匹配了 ${scheme.bindings.length} 对，置信度 ${scheme.confidence}%`);
}
```

---

### 1.4 KeywordMatcher

关键词匹配器，通过分词和相似度计算进行匹配。

**路径**: `src/core/matchers/KeywordMatcher.ts`

#### 构造函数

```typescript
constructor(config?: Partial<KeywordMatchConfig>)
```

##### KeywordMatchConfig

```typescript
interface KeywordMatchConfig {
  /** 最低相似度阈值 (0-1) */
  minSimilarity: number;
  /** Jaccard相似度权重 */
  weightJaccard: number;
  /** 编辑距离相似度权重 */
  weightEdit: number;
  /** 数字匹配权重 */
  weightNumber: number;
  /** 忽略词列表 */
  ignoreWords: string[];
}
```

##### 默认配置

```typescript
{
  minSimilarity: 0.3,
  weightJaccard: 0.5,
  weightEdit: 0.3,
  weightNumber: 0.2,
  ignoreWords: ['the', 'a', 'an', 'of', 'to', 'in', 'for', 'on', 'at', '的', '了', '是', '在', '和']
}
```

#### 属性

```typescript
readonly name = 'KeywordMatcher';
readonly mode: MatchMode = 'keyword';
```

#### 方法

##### tokenizeAndFilter

```typescript
tokenizeAndFilter(text: string): string[]
```

分词并过滤忽略词。

##### calculateSimilarity

```typescript
calculateSimilarity(cardName: string, fileName: string): {
  score: number;
  details: {
    jaccard: number;
    edit: number;
    numberMatch: boolean;
  }
}
```

计算两个名称之间的综合相似度。

**计算公式**:
```
score = jaccard * weightJaccard + edit * weightEdit + (numberMatch ? 1 : 0) * weightNumber
```

##### isApplicable

```typescript
isApplicable(cards: CardInfo[], files: FileInfo[]): boolean
```

关键词匹配器总是适用（作为后备方案）。

##### match

```typescript
match(cards: CardInfo[], files: FileInfo[], options?: MatchOptions): MatchScheme
```

执行关键词匹配。使用贪心算法选择最佳匹配。

#### 使用示例

```typescript
import { KeywordMatcher } from '@/core/matchers/KeywordMatcher';

const matcher = new KeywordMatcher({
  minSimilarity: 0.4,
  weightJaccard: 0.6
});

const scheme = matcher.match(cards, files);
console.log(scheme.description);  // "通过关键词相似度匹配了 5 对，相似度阈值 40%"
```

---

### 1.5 FileOrderMatcher

文件顺序匹配器，将卡片和文件分别排序后按顺序一一对应。

**路径**: `src/core/matchers/FileOrderMatcher.ts`

#### 构造函数

```typescript
constructor(config?: Partial<OrderMatchConfig>)
```

##### OrderMatchConfig

```typescript
interface OrderMatchConfig {
  /** 卡片排序策略 */
  cardSort: SortStrategy;
  /** 文件排序策略 */
  fileSort: SortStrategy;
}

type SortStrategy = 'name' | 'name_numeric' | 'created' | 'modified' | 'size';
```

##### 默认配置

```typescript
{
  cardSort: 'name_numeric',
  fileSort: 'name_numeric'
}
```

#### 属性

```typescript
readonly name = 'FileOrderMatcher';
readonly mode: MatchMode = 'file_order';
```

#### 方法

##### sortCards

```typescript
sortCards(cards: CardInfo[], strategy: SortStrategy): CardInfo[]
```

对卡片进行排序。

##### sortFiles

```typescript
sortFiles(files: FileInfo[], strategy: SortStrategy): FileInfo[]
```

对文件进行排序。

##### 排序策略说明

| 策略 | 说明 |
|------|------|
| name | 按名称字典序排序 |
| name_numeric | 按名称排序，优先比较数字部分 |
| created | 按创建时间排序 |
| modified | 按修改时间排序 |
| size | 按文件大小排序（仅文件有效） |

##### isApplicable

```typescript
isApplicable(_cards: CardInfo[], _files: FileInfo[]): boolean
```

顺序匹配器总是适用（作为最后的后备方案）。

##### match

```typescript
match(cards: CardInfo[], files: FileInfo[], options?: MatchOptions): MatchScheme
```

执行顺序匹配。

#### 使用示例

```typescript
import { FileOrderMatcher } from '@/core/matchers/FileOrderMatcher';

const matcher = new FileOrderMatcher({
  cardSort: 'name_numeric',
  fileSort: 'name_numeric'
});

const scheme = matcher.match(cards, files, {
  sortStrategy: 'name_numeric'
});

if (scheme.warning) {
  console.warn(scheme.warning);  // "数量不匹配：10 个卡片，8 个文件"
}
```

---

### 1.6 SmartMatcher

智能匹配器，基于 AI 服务的智能匹配实现，支持降级到自动匹配。

**路径**: `src/core/matchers/SmartMatcher.ts`

#### 构造函数

```typescript
constructor(
  config: AIServiceConfig,
  thresholds?: Partial<ConfidenceThresholds>
)
```

##### ConfidenceThresholds

```typescript
interface ConfidenceThresholds {
  /** 高置信度阈值 */
  high: number;
  /** 中置信度阈值 */
  medium: number;
}
```

##### 默认阈值

```typescript
{
  high: 80,
  medium: 50
}
```

#### 属性

```typescript
get fallbackMode(): boolean
```

是否处于降级模式（AI 不可用时为 true）。

#### 方法

##### prepareRequest

```typescript
prepareRequest(cards: CardInfo[], files: FileInfo[]): AIMatchRequest
```

准备 AI 请求数据。

##### match

```typescript
async match(cards: CardInfo[], files: FileInfo[]): Promise<SmartMatchResult>
```

执行智能匹配。

**流程**:
1. 检查 AI 服务可用性
2. 如果可用，调用 AI 服务
3. 如果不可用或失败，降级到自动匹配

##### parseResponse

```typescript
parseResponse(response: AIMatchResponse): SmartMatchResult
```

解析 AI 响应。

##### classifyConfidence

```typescript
classifyConfidence(
  bindings: Array<BindingItem & { confidence: number; reason?: string }>
): ClassifiedMatches
```

按置信度分级。

##### ClassifiedMatches

```typescript
interface ClassifiedMatches {
  high: Array<BindingItem & { confidence: number; reason?: string }>;
  medium: Array<BindingItem & { confidence: number; reason?: string }>;
  low: Array<BindingItem & { confidence: number; reason?: string }>;
}
```

##### fallbackMatch

```typescript
fallbackMatch(cards: CardInfo[], files: FileInfo[]): SmartMatchResult
```

AI 不可用时降级到自动匹配。

##### checkAvailability

```typescript
async checkAvailability(): Promise<boolean>
```

检查 AI 服务是否可用。

#### 使用示例

```typescript
import { SmartMatcher, createSmartMatcher } from '@/core/matchers/SmartMatcher';

// 使用工厂函数
const matcher = createSmartMatcher({
  endpoint: 'https://api.ai.service/match',
  apiKey: 'your-api-key'
}, {
  high: 80,
  medium: 50
});

const result = await matcher.match(cards, files);

if (matcher.fallbackMode) {
  console.warn('AI 服务不可用，使用降级匹配');
}

const classified = matcher.classifyConfidence(result.bindings);
console.log(`高置信度: ${classified.high.length}`);
console.log(`中置信度: ${classified.medium.length}`);
console.log(`低置信度: ${classified.low.length}`);
```

---

### 1.7 SchemeGenerator

方案生成器，整合所有匹配器，生成并评估多个匹配方案。

**路径**: `src/core/matchers/SchemeGenerator.ts`

#### 构造函数

```typescript
constructor(config?: Partial<SchemeGeneratorConfig>)
```

##### SchemeGeneratorConfig

```typescript
interface SchemeGeneratorConfig {
  /** 自动选择置信度阈值 */
  autoSelectThreshold: number;
  /** 是否包含所有方案（即使不适用） */
  includeAllSchemes: boolean;
}
```

##### 默认配置

```typescript
{
  autoSelectThreshold: 85,
  includeAllSchemes: false
}
```

#### 方法

##### addMatcher

```typescript
addMatcher(matcher: IMatcher): void
```

添加自定义匹配器。

##### generateAll

```typescript
generateAll(
  cards: CardInfo[],
  files: FileInfo[],
  options?: MatchOptions
): MatchScheme[]
```

生成所有可能的匹配方案，按置信度降序排序。

##### evaluateScheme

```typescript
evaluateScheme(
  scheme: MatchScheme,
  totalCards: number,
  totalFiles: number
): SchemeScore
```

评估单个方案的质量。

##### SchemeScore

```typescript
interface SchemeScore {
  scheme: MatchScheme;
  scores: {
    matchRate: number;      // 匹配率
    conflictRate: number;   // 冲突率
    coverage: number;       // 覆盖率
    consistency: number;    // 一致性
  };
  totalScore: number;       // 综合评分
}
```

**综合评分计算**:
```
totalScore = matchRate * 0.4 + (1 - conflictRate) * 0.2 + coverage * 0.3 + consistency * 0.1
```

##### evaluateAll

```typescript
evaluateAll(
  schemes: MatchScheme[],
  totalCards: number,
  totalFiles: number
): SchemeScore[]
```

评估所有方案。

##### selectBestScheme

```typescript
selectBestScheme(schemes: MatchScheme[]): MatchScheme | null
```

选择最佳方案（置信度最高的）。

##### autoSelect

```typescript
autoSelect(schemes: MatchScheme[]): MatchScheme | null
```

自动选择方案。如果最佳方案的置信度超过阈值，自动选择它；否则返回 null 表示需要手动选择。

##### generateAndSelect

```typescript
generateAndSelect(
  cards: CardInfo[],
  files: FileInfo[],
  options?: MatchOptions
): {
  schemes: MatchScheme[];
  selected: MatchScheme | null;
  autoSelected: boolean;
}
```

生成方案并自动选择（便捷方法）。

##### getSchemeSummary

```typescript
getSchemeSummary(schemes: MatchScheme[]): {
  total: number;
  byMode: Record<string, number>;
  bestConfidence: number;
  averageConfidence: number;
}
```

获取方案统计摘要。

#### 使用示例

```typescript
import { SchemeGenerator } from '@/core/matchers/SchemeGenerator';

const generator = new SchemeGenerator({
  autoSelectThreshold: 85
});

// 生成所有方案
const schemes = generator.generateAll(cards, files);

// 自动选择
const autoSelected = generator.autoSelect(schemes);
if (autoSelected) {
  console.log('自动选择方案:', autoSelected.mode);
} else {
  console.log('需要用户手动选择方案');
}

// 或使用便捷方法
const { schemes, selected, autoSelected } = generator.generateAndSelect(cards, files);

// 获取统计
const summary = generator.getSchemeSummary(schemes);
console.log(`生成了 ${summary.total} 个方案，最高置信度 ${summary.bestConfidence}%`);
```

---

## 2. 执行器模块 (Executors)

**路径**: `src/core/executors/`

### 2.1 BindingExecutor

绑定执行器，负责执行批量绑定操作，支持并发控制和错误处理。

**路径**: `src/core/executors/BindingExecutor.ts`

#### 构造函数

```typescript
constructor(sdk: ChipsSDK, logger?: Logger)
```

##### ChipsSDK 接口

```typescript
interface ChipsSDK {
  getCard(cardId: string): Promise<CardInfo | null>;
  updateCard(cardId: string, updates: Record<string, unknown>): Promise<void>;
  fileExists(path: string): Promise<boolean>;
  copyFile(source: string, target: string): Promise<void>;
  getCardResourcePath(cardId: string, fileName: string): string;
}
```

#### 事件

BindingExecutor 继承自 EventEmitter，支持以下事件：

| 事件名 | 参数类型 | 说明 |
|-------|---------|------|
| start | `{ total: number }` | 开始执行 |
| progress | `ExecutionProgress` | 进度更新 |
| item:start | `{ binding, index }` | 单项开始 |
| item:success | `{ binding, index, duration }` | 单项成功 |
| item:error | `{ binding, index, error }` | 单项失败 |
| item:skip | `{ binding, index, reason }` | 单项跳过 |
| complete | `ExecuteResult` | 执行完成 |
| cancel | - | 执行取消 |

#### 方法

##### execute

```typescript
async execute(
  bindings: BindingItem[],
  options?: ExecuteOptions
): Promise<ExecuteResult>
```

执行批量绑定。

##### ExecuteOptions

```typescript
interface ExecuteOptions {
  /** 是否复制到内部 */
  copyToInternal?: boolean;
  /** 错误处理策略 */
  errorStrategy?: ErrorAction;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 并发数 */
  concurrency?: number;
  /** 进度回调 */
  onProgress?: (progress: ExecutionProgress) => void;
  /** 错误回调 */
  onError?: (error: ExecutionError) => ErrorAction;
}

type ErrorAction = 'skip' | 'retry' | 'abort';
```

##### 默认选项

```typescript
{
  copyToInternal: false,
  errorStrategy: 'skip',
  maxRetries: 3,
  concurrency: 3,
  onProgress: () => {},
  onError: () => 'skip'
}
```

##### ExecuteResult

```typescript
interface ExecuteResult {
  success: number;
  failed: number;
  skipped: number;
  duration: number;
  details: ExecutionDetail[];
  errors: ExecutionError[];
}
```

##### executeSingle

```typescript
async executeSingle(binding: BindingItem): Promise<SingleExecuteResult>
```

执行单个绑定。

##### getProgress

```typescript
getProgress(): ExecutionProgress | null
```

获取当前进度。

##### cancel

```typescript
cancel(): void
```

取消执行。

##### isExecuting

```typescript
isExecuting(): boolean
```

是否正在执行。

##### isCancelled

```typescript
isCancelled(): boolean
```

是否已取消。

##### getFailedBindings

```typescript
getFailedBindings(): BindingItem[]
```

获取失败的绑定列表。

##### retryFailed

```typescript
async retryFailed(options?: ExecuteOptions): Promise<ExecuteResult>
```

重试失败的绑定。

#### 使用示例

```typescript
import { BindingExecutor } from '@/core/executors/BindingExecutor';

const executor = new BindingExecutor(sdk);

// 监听事件
executor.on('progress', (progress) => {
  console.log(`进度: ${progress.percentage}%`);
});

executor.on('item:error', ({ binding, error }) => {
  console.error(`绑定失败: ${binding.cardId}`, error.message);
});

// 执行绑定
const result = await executor.execute(bindings, {
  concurrency: 5,
  maxRetries: 3,
  onError: (error) => {
    if (error.retryable) return 'retry';
    return 'skip';
  }
});

console.log(`成功: ${result.success}, 失败: ${result.failed}, 耗时: ${result.duration}ms`);

// 重试失败项
if (result.failed > 0) {
  const retryResult = await executor.retryFailed();
}
```

---

### 2.2 ModeConverter

模式转换器，负责卡片资源模式的转换（空壳 ↔ 全填充）。

**路径**: `src/core/executors/ModeConverter.ts`

#### 构造函数

```typescript
constructor(sdk: ChipsSDK, logger?: Logger)
```

##### ChipsSDK 接口

```typescript
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
```

#### 事件

| 事件名 | 参数类型 | 说明 |
|-------|---------|------|
| start | `{ cardIds, targetMode }` | 开始转换 |
| progress | `ConvertProgress` | 进度更新 |
| card:start | `{ cardId, cardName }` | 卡片开始转换 |
| card:complete | `{ cardId, cardName, status }` | 卡片转换完成 |
| resource:start | `{ cardId, resourcePath }` | 资源开始转换 |
| resource:complete | `{ cardId, resourcePath }` | 资源转换完成 |
| resource:error | `{ cardId, resourcePath, error }` | 资源转换失败 |
| complete | `ConvertResult` | 转换完成 |
| error | `{ message }` | 发生错误 |

#### 方法

##### detectMode

```typescript
async detectMode(cardId: string): Promise<ResourceMode>
```

检测卡片资源模式。

```typescript
type ResourceMode = 'empty' | 'full' | 'semi';
```

##### getExternalResources

```typescript
async getExternalResources(cardId: string): Promise<ResourceInfo[]>
```

获取卡片的外部资源列表。

##### getInternalResources

```typescript
async getInternalResources(cardId: string): Promise<ResourceInfo[]>
```

获取卡片的内部资源列表。

##### toFull

```typescript
async toFull(
  cardIds: string[],
  options?: ConvertOptions
): Promise<ConvertResult>
```

转换为全填充模式（将外部资源复制到卡片内部）。

##### toEmpty

```typescript
async toEmpty(
  cardIds: string[],
  targetPath: string,
  options?: ConvertOptions
): Promise<ConvertResult>
```

转换为空壳模式（将内部资源移出到外部目标路径）。

##### ConvertOptions

```typescript
interface ConvertOptions {
  /** 目标路径（空壳模式必需） */
  targetPath?: string;
  /** 要转换的资源类型 */
  resourceTypes?: FileType[];
  /** 大小限制（字节，0 表示无限制） */
  sizeLimit?: number;
  /** 冲突处理策略 */
  conflictStrategy?: 'skip' | 'rename' | 'overwrite';
  /** 进度回调 */
  onProgress?: (progress: ConvertProgress) => void;
}
```

##### 默认选项

```typescript
{
  targetPath: undefined,
  resourceTypes: [],
  sizeLimit: 0,
  conflictStrategy: 'rename',
  onProgress: () => {}
}
```

##### ConvertResult

```typescript
interface ConvertResult {
  success: number;
  failed: number;
  totalSize: number;
  duration: number;
  details: ConvertDetail[];
  errors: ConvertError[];
}
```

##### calculateRequiredSpace

```typescript
async calculateRequiredSpace(cardIds: string[]): Promise<number>
```

计算所需空间（字节）。

##### checkDiskSpace

```typescript
async checkDiskSpace(path: string, required: number): Promise<boolean>
```

检查磁盘空间是否足够（保留 10% 余量）。

##### getAvailableSpace

```typescript
async getAvailableSpace(path: string): Promise<number>
```

获取可用磁盘空间。

##### cancel

```typescript
cancel(): void
```

取消转换。

##### isConverting

```typescript
isConverting(): boolean
```

是否正在转换。

##### getProgress

```typescript
getProgress(): ConvertProgress | null
```

获取当前进度。

#### 使用示例

```typescript
import { ModeConverter } from '@/core/executors/ModeConverter';

const converter = new ModeConverter(sdk);

// 监听进度
converter.on('progress', (progress) => {
  console.log(`转换进度: ${progress.percentage}%`);
});

// 检测当前模式
const mode = await converter.detectMode('card-001');
console.log(`当前模式: ${mode}`);

// 转换为全填充
const result = await converter.toFull(['card-001', 'card-002'], {
  resourceTypes: ['video', 'image'],
  conflictStrategy: 'rename'
});

// 转换为空壳
const result2 = await converter.toEmpty(
  ['card-003'],
  '/path/to/external',
  { sizeLimit: 1024 * 1024 * 100 }  // 最大 100MB
);
```

---

### 2.3 ConcurrencyController

并发控制器，用于限制并发执行的任务数量。

**路径**: `src/core/executors/ConcurrencyController.ts`

#### 构造函数

```typescript
constructor(maxConcurrent?: number)
```

| 参数名 | 类型 | 默认值 | 说明 |
|-------|------|-------|------|
| maxConcurrent | `number` | `3` | 最大并发数（必须大于 0） |

#### 方法

##### add

```typescript
async add<T>(task: () => Promise<T>): Promise<T>
```

添加单个任务到队列。

##### addAll

```typescript
async addAll<T>(tasks: Array<() => Promise<T>>): Promise<T[]>
```

批量添加任务。

##### waitAll

```typescript
async waitAll(): Promise<void>
```

等待所有任务完成。

##### getPending

```typescript
getPending(): number
```

获取等待中的任务数。

##### getRunning

```typescript
getRunning(): number
```

获取运行中的任务数。

##### getTotal

```typescript
getTotal(): number
```

获取总任务数（运行中 + 等待中）。

##### setMaxConcurrent

```typescript
setMaxConcurrent(value: number): void
```

设置最大并发数。

##### getMaxConcurrent

```typescript
getMaxConcurrent(): number
```

获取最大并发数。

##### pause

```typescript
pause(): void
```

暂停任务处理。

##### resume

```typescript
resume(): void
```

恢复任务处理。

##### isPaused

```typescript
isPaused(): boolean
```

是否已暂停。

##### clear

```typescript
clear(): number
```

清空等待队列，返回被清除的任务数。已运行的任务不会被取消。

##### isIdle

```typescript
isIdle(): boolean
```

是否空闲（无运行和等待任务）。

#### 使用示例

```typescript
import { ConcurrencyController } from '@/core/executors/ConcurrencyController';

const controller = new ConcurrencyController(5);  // 最大并发 5

// 添加任务
const tasks = urls.map(url => () => fetch(url));
const results = await controller.addAll(tasks);

// 动态调整并发数
controller.setMaxConcurrent(10);

// 暂停和恢复
controller.pause();
// ... 做一些事情
controller.resume();

// 取消所有等待的任务
const cancelled = controller.clear();
console.log(`取消了 ${cancelled} 个任务`);
```

---

## 3. 验证器模块 (Validators)

**路径**: `src/core/validators/`

### 3.1 BindingValidator

绑定验证器，验证绑定的有效性。

**路径**: `src/core/validators/BindingValidator.ts`

#### 构造函数

```typescript
constructor(sdk: ChipsSDK)
```

##### ChipsSDK 接口

```typescript
interface ChipsSDK {
  getCard(cardId: string): Promise<CardInfo | null>;
  fileExists(path: string): Promise<boolean>;
}
```

#### 错误码常量

```typescript
const ValidationErrorCodes = {
  INVALID_CARD_ID: 'INVALID_CARD_ID',
  INVALID_FILE_PATH: 'INVALID_FILE_PATH',
  INVALID_RESOURCE_FIELD: 'INVALID_RESOURCE_FIELD',
  CARD_NOT_FOUND: 'CARD_NOT_FOUND',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  RESOURCE_FIELD_NOT_FOUND: 'RESOURCE_FIELD_NOT_FOUND',
  FILE_TYPE_MISMATCH: 'FILE_TYPE_MISMATCH',
  BASE_CARD_NOT_FOUND: 'BASE_CARD_NOT_FOUND'
};
```

#### 方法

##### validateBinding

```typescript
async validateBinding(binding: BindingItem): Promise<ValidationResult>
```

验证单个绑定。

**验证流程**:
1. 基础验证（字段非空）
2. 验证卡片存在性
3. 验证文件存在性
4. 验证资源字段匹配

##### validateBindings

```typescript
async validateBindings(bindings: BindingItem[]): Promise<BatchValidationResult>
```

批量验证绑定。

##### BatchValidationResult

```typescript
interface BatchValidationResult {
  total: number;
  valid: number;
  invalid: number;
  results: Map<string, ValidationResult>;
}
```

##### validateCard

```typescript
async validateCard(cardId: string): Promise<boolean>
```

验证卡片存在性。

##### validateFile

```typescript
async validateFile(filePath: string): Promise<boolean>
```

验证文件存在性。

##### validateResourceField

```typescript
validateResourceField(
  card: CardInfo,
  field: string,
  fileType: FileType,
  baseCardId?: string
): ValidationResult
```

验证资源字段匹配。

##### clearCache

```typescript
clearCache(): void
```

清除卡片缓存。

#### 使用示例

```typescript
import { BindingValidator } from '@/core/validators/BindingValidator';

const validator = new BindingValidator(sdk);

// 验证单个绑定
const result = await validator.validateBinding({
  cardId: 'card-001',
  filePath: '/path/to/video.mp4',
  resourceField: 'video_file'
});

if (!result.valid) {
  result.errors.forEach(err => {
    console.error(`[${err.code}] ${err.message}`);
  });
}

// 批量验证
const batchResult = await validator.validateBindings(bindings);
console.log(`有效: ${batchResult.valid}, 无效: ${batchResult.invalid}`);

// 清除缓存（在卡片数据变化后）
validator.clearCache();
```

---

## 类型定义汇总

```typescript
// 匹配模式
type MatchMode = 'number_sequence' | 'keyword' | 'file_order' | 'smart';

// 匹配选项
interface MatchOptions {
  numberPosition?: NumberPosition;
  conflictStrategy?: ConflictStrategy;
  minSimilarity?: number;
  sortStrategy?: SortStrategy;
}

// 匹配方案
interface MatchScheme {
  mode: MatchMode;
  confidence: number;
  bindings: BindingItem[];
  unmatchedCards: string[];
  unmatchedFiles: string[];
  conflicts?: MatchConflict[];
  description?: string;
  warning?: string;
}

// 匹配冲突
interface MatchConflict {
  type: 'duplicate_card' | 'duplicate_file' | 'multiple_match';
  cards: string[];
  files: string[];
  reason: string;
}

// 智能匹配结果
interface SmartMatchResult {
  bindings: Array<BindingItem & { confidence: number; reason?: string }>;
  unmatchedCards: string[];
  unmatchedFiles: string[];
  metadata: {
    processingTime: number;
    modelVersion: string;
  };
}

// 执行进度
interface ExecutionProgress {
  current: number;
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  percentage: number;
  currentBinding?: BindingItem;
}

// 执行错误
interface ExecutionError {
  binding: BindingItem;
  code: string;
  message: string;
  stack?: string;
  retryable: boolean;
}

// 转换进度
interface ConvertProgress {
  currentCard: number;
  totalCards: number;
  currentResource: number;
  totalResources: number;
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  cardId?: string;
  resourcePath?: string;
}

// 转换错误
interface ConvertError {
  cardId: string;
  resourcePath?: string;
  code: string;
  message: string;
}
```

---

**文档维护者**: 薯片生态核心团队
