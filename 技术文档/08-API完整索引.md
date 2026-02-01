# 文件连接器 - API完整索引

## 1. 公开API

### 1.1 匹配引擎API

#### ConnectorAPI
```typescript
class ConnectorAPI {
  // 分析匹配
  analyze(cards: Card[], files: File[]): Promise<MatchingAnalysis>
  
  // 执行匹配
  match(cards: Card[], files: File[], algorithm: MatchingAlgorithm): Promise<Binding[]>
  
  // 预览结果
  previewBindings(bindings: Binding[]): BindingPreview
  
  // 执行绑定
  executeBindings(bindings: Binding[], options: BindingOptions): Promise<ExecutionResult>
  
  // 获取匹配历史
  getMatchHistory(): Promise<MatchHistoryEntry[]>
}
```

### 1.2 匹配器API

#### MatcherAPI
```typescript
class MatcherAPI {
  // 数字匹配
  matchByNumber(cards: Card[], files: File[]): Promise<Binding[]>
  
  // 关键词匹配
  matchByKeyword(cards: Card[], files: File[]): Promise<Binding[]>
  
  // 顺序匹配
  matchByOrder(cards: Card[], files: File[]): Promise<Binding[]>
  
  // AI匹配
  matchByAI(cards: Card[], files: File[], options: AIOptions): Promise<Binding[]>
  
  // 自定义规则匹配
  matchByCustomRule(cards: Card[], files: File[], rule: CustomRule): Promise<Binding[]>
}
```

### 1.3 批处理API

#### BatchAPI
```typescript
class BatchAPI {
  // 批量匹配
  batchMatch(tasks: BatchTask[]): Promise<BatchResult>
  
  // 批量绑定
  batchBind(bindings: Binding[]): Promise<BatchResult>
  
  // 进度跟踪
  onProgress(callback: ProgressCallback): void
  
  // 取消批处理
  cancelBatch(batchId: string): Promise<void>
}
```

## 2. 内部API

### 2.1 文件分析API
```typescript
interface FileAnalyzerAPI {
  extractNumber(fileName: string): number | null
  extractKeywords(fileName: string): string[]
  analyzePattern(fileNames: string[]): Pattern
}
```

### 2.2 配置更新API
```typescript
interface ConfigUpdaterAPI {
  updateCardConfig(cardId: string, filePath: string): Promise<void>
  batchUpdateConfigs(updates: ConfigUpdate[]): Promise<void>
  verifyConfig(cardId: string): Promise<boolean>
}
```

## 3. 类型定义

```typescript
interface Card {
  id: string
  name: string
  config: CardConfig
}

interface File {
  path: string
  name: string
  size: number
}

interface Binding {
  cardId: string
  filePath: string
  confidence: number
  algorithm: string
}

interface MatchingAnalysis {
  totalCards: number
  totalFiles: number
  patterns: Pattern[]
  suggestions: Algorithm[]
}

type MatchingAlgorithm = 'number' | 'keyword' | 'order' | 'ai' | 'custom'
```

## 4. 使用示例

```typescript
import { ConnectorAPI, MatcherAPI } from 'file-connector-api'

async function connectFiles() {
  // 1. 分析匹配模式
  const analysis = await ConnectorAPI.analyze(cards, files)
  console.log('推荐算法:', analysis.suggestions)
  
  // 2. 执行匹配
  const bindings = await MatcherAPI.matchByNumber(cards, files)
  
  // 3. 预览结果
  const preview = ConnectorAPI.previewBindings(bindings)
  console.log(`匹配成功: ${preview.matched}, 未匹配: ${preview.unmatched}`)
  
  // 4. 执行绑定
  const result = await ConnectorAPI.executeBindings(bindings, {
    mode: 'update-config',
    backup: true
  })
  
  console.log('绑定完成:', result)
}
```

## 5. 总结

文件连接器提供完整的API：
- **匹配引擎**：分析、匹配、绑定
- **多种算法**：数字、关键词、顺序、AI、自定义
- **批量处理**：高效处理大批量文件

所有API都提供TypeScript类型定义。
