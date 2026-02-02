# 组件 API 文档

**版本**: 1.0.0  
**更新时间**: 2026-02-02

---

## 文档说明

本文档详细描述了 Chips-FileConnector 中所有 Vue 组件的 API，包括 Props、Emits 和 Slots。

---

## 目录

1. [卡片组件 (Card)](#1-卡片组件-card)
2. [文件组件 (File)](#2-文件组件-file)
3. [绑定组件 (Binding)](#3-绑定组件-binding)
4. [方案组件 (Scheme)](#4-方案组件-scheme)
5. [图形组件 (Graph)](#5-图形组件-graph)
6. [通用组件 (Common)](#6-通用组件-common)
7. [结果组件 (Result)](#7-结果组件-result)
8. [视图组件 (Views)](#8-视图组件-views)

---

## 1. 卡片组件 (Card)

### 1.1 CardList

展示卡片列表组件，支持虚拟滚动、排序、筛选和全选功能。

**路径**: `src/renderer/components/card/CardList.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| cards | `CardInfo[]` | - | 是 | 卡片列表 |
| selectedIds | `string[]` | - | 是 | 选中的卡片ID列表 |
| bindings | `BindingItem[]` | - | 是 | 绑定列表 |
| showStatus | `boolean` | `true` | 否 | 是否显示状态 |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| select | `cardId: string` | 选择卡片时触发 |
| select-all | `selected: boolean` | 全选/取消全选时触发 |

#### 内部类型

```typescript
type SortType = 'name' | 'status';
type SortOrder = 'asc' | 'desc';
type FilterType = 'all' | 'bound' | 'unbound';
```

#### 使用示例

```vue
<template>
  <CardList
    :cards="cards"
    :selected-ids="selectedIds"
    :bindings="bindings"
    @select="handleSelect"
    @select-all="handleSelectAll"
  />
</template>
```

---

### 1.2 CardItem

单个卡片项组件，展示卡片信息和状态。

**路径**: `src/renderer/components/card/CardItem.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| card | `CardInfo` | - | 是 | 卡片信息 |
| selected | `boolean` | `false` | 否 | 是否选中 |
| bound | `boolean` | `false` | 否 | 是否已绑定 |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| click | - | 点击卡片时触发 |

---

## 2. 文件组件 (File)

### 2.1 FileList

展示文件列表组件，支持虚拟滚动、文件拖入、搜索筛选、排序和统计信息。

**路径**: `src/renderer/components/file/FileList.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| files | `FileInfo[]` | `[]` | 否 | 文件列表 |
| selectedPaths | `string[]` | `[]` | 否 | 选中的文件路径列表 |
| usedPaths | `string[]` | `[]` | 否 | 已使用的文件路径列表（已绑定） |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| select | `filePath: string` | 选择文件时触发 |
| add-files | `files: File[]` | 添加文件时触发（拖入） |
| remove-file | `filePath: string` | 移除文件时触发 |

#### 内部类型

```typescript
type SortType = 'name' | 'size' | 'date' | 'type';
type SortOrder = 'asc' | 'desc';
type FilterType = 'all' | 'used' | 'unused';
```

#### 使用示例

```vue
<template>
  <FileList
    :files="files"
    :selected-paths="selectedPaths"
    :used-paths="usedPaths"
    @select="handleSelect"
    @add-files="handleAddFiles"
    @remove-file="handleRemove"
  />
</template>
```

---

### 2.2 FileItem

单个文件项组件，展示文件信息和状态。

**路径**: `src/renderer/components/file/FileItem.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| file | `FileInfo` | - | 是 | 文件信息 |
| selected | `boolean` | `false` | 否 | 是否选中 |
| used | `boolean` | `false` | 否 | 是否已使用 |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| click | - | 点击文件时触发 |
| remove | - | 移除文件时触发 |

---

### 2.3 FilePreview

文件预览组件，支持图片、视频、音频的预览。

**路径**: `src/renderer/components/file/FilePreview.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| file | `FileInfo \| null` | - | 否 | 要预览的文件 |
| visible | `boolean` | `false` | 否 | 是否可见 |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| close | - | 关闭预览时触发 |

---

## 3. 绑定组件 (Binding)

### 3.1 BindingTable

绑定表格组件，展示所有卡片的绑定关系，支持批量选择、排序、筛选和虚拟滚动。

**路径**: `src/renderer/components/binding/BindingTable.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| cards | `CardInfo[]` | - | 是 | 卡片列表 |
| bindings | `BindingItem[]` | - | 是 | 绑定列表 |
| files | `FileInfo[]` | - | 是 | 文件列表 |
| readonly | `boolean` | `false` | 否 | 是否只读 |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| update:bindings | `bindings: BindingItem[]` | 更新绑定列表 |
| select-file | `cardId: string` | 选择文件事件 |
| remove-binding | `cardId: string` | 删除绑定事件 |

#### 使用示例

```vue
<template>
  <BindingTable
    :cards="cards"
    v-model:bindings="bindings"
    :files="files"
    @select-file="handleSelectFile"
    @remove-binding="handleRemove"
  />
</template>
```

---

### 3.2 BindingRow

单个绑定行组件，展示单个卡片的绑定状态。

**路径**: `src/renderer/components/binding/BindingRow.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| card | `CardInfo` | - | 是 | 卡片信息 |
| binding | `BindingItem \| undefined` | - | 否 | 绑定项 |
| files | `FileInfo[]` | - | 是 | 可选文件列表 |
| selected | `boolean` | `false` | 否 | 是否选中 |
| readonly | `boolean` | `false` | 否 | 是否只读 |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| select | `selected: boolean` | 选中状态变更 |
| update:file-path | `filePath: string` | 文件路径更新 |
| remove | - | 移除绑定 |

---

## 4. 方案组件 (Scheme)

### 4.1 SchemeSelector

方案选择器组件，整合方案列表和详情，提供方案选择和应用功能。

**路径**: `src/renderer/components/scheme/SchemeSelector.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| schemes | `MatchScheme[]` | - | 是 | 方案列表 |
| selectedIndex | `number` | - | 是 | 当前选中的索引 |
| loading | `boolean` | `false` | 否 | 是否正在加载 |
| cards | `CardInfo[]` | - | 否 | 卡片列表（用于显示名称） |
| files | `FileInfo[]` | - | 否 | 文件列表（用于显示名称） |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| select | `index: number` | 选择方案 |
| apply | - | 应用方案 |
| manual | - | 手动调整 |

#### 使用示例

```vue
<template>
  <SchemeSelector
    :schemes="schemes"
    :selected-index="selectedIndex"
    :loading="loading"
    :cards="cards"
    :files="files"
    @select="handleSelect"
    @apply="handleApply"
    @manual="handleManual"
  />
</template>
```

---

### 4.2 SchemeList

方案列表组件，展示多个匹配方案供选择。

**路径**: `src/renderer/components/scheme/SchemeList.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| schemes | `MatchScheme[]` | - | 是 | 方案列表 |
| selectedIndex | `number` | - | 是 | 当前选中索引 |
| loading | `boolean` | `false` | 否 | 是否加载中 |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| select | `index: number` | 选择方案 |

---

### 4.3 SchemeDetail

方案详情组件，展示单个方案的详细绑定列表。

**路径**: `src/renderer/components/scheme/SchemeDetail.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| scheme | `MatchScheme \| null` | - | 否 | 方案详情 |
| cardMap | `Map<string, CardInfo>` | - | 否 | 卡片ID到卡片的映射 |
| fileMap | `Map<string, FileInfo>` | - | 否 | 文件路径到文件的映射 |

---

### 4.4 SchemeCard

方案卡片组件，展示单个方案的摘要信息。

**路径**: `src/renderer/components/scheme/SchemeCard.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| scheme | `MatchScheme` | - | 是 | 方案信息 |
| selected | `boolean` | `false` | 否 | 是否选中 |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| click | - | 点击卡片 |

---

### 4.5 SmartMatchResult

智能匹配结果组件，分级展示智能匹配结果，支持修改和确认。

**路径**: `src/renderer/components/scheme/SmartMatchResult.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| result | `SmartMatchResult` | - | 是 | 匹配结果 |
| classified | `ClassifiedMatches` | - | 是 | 分级后的匹配 |
| availableFiles | `Array<{path: string; name: string}>` | - | 否 | 可用文件列表 |
| cardNames | `Map<string, string>` | - | 否 | 卡片名称映射 |
| fallbackMode | `boolean` | `false` | 否 | 是否处于降级模式 |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| modify | `cardId: string, newFilePath: string` | 修改绑定 |
| confirm | `cardId: string` | 确认绑定 |
| remove | `cardId: string` | 移除绑定 |

#### 使用示例

```vue
<template>
  <SmartMatchResult
    :result="smartResult"
    :classified="classifiedMatches"
    :available-files="availableFiles"
    :card-names="cardNames"
    :fallback-mode="isFallback"
    @modify="handleModify"
    @confirm="handleConfirm"
    @remove="handleRemove"
  />
</template>
```

---

## 5. 图形组件 (Graph)

### 5.1 ConnectionGraph

连接图组件，以图形化方式展示卡片和文件的连接关系。

**路径**: `src/renderer/components/graph/ConnectionGraph.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| cards | `CardInfo[]` | - | 是 | 卡片列表 |
| files | `FileInfo[]` | - | 是 | 文件列表 |
| bindings | `BindingItem[]` | - | 是 | 绑定列表 |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| connect | `cardId: string, filePath: string` | 建立连接 |
| disconnect | `cardId: string` | 断开连接 |

---

### 5.2 CardNode

卡片节点组件，在图形视图中展示单个卡片。

**路径**: `src/renderer/components/graph/CardNode.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| card | `CardInfo` | - | 是 | 卡片信息 |
| position | `{x: number, y: number}` | - | 是 | 节点位置 |
| connected | `boolean` | `false` | 否 | 是否已连接 |
| selected | `boolean` | `false` | 否 | 是否选中 |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| click | - | 点击节点 |
| drag-start | - | 开始拖拽 |
| drag-end | `position: {x, y}` | 结束拖拽 |

---

### 5.3 FileNode

文件节点组件，在图形视图中展示单个文件。

**路径**: `src/renderer/components/graph/FileNode.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| file | `FileInfo` | - | 是 | 文件信息 |
| position | `{x: number, y: number}` | - | 是 | 节点位置 |
| connected | `boolean` | `false` | 否 | 是否已连接 |
| selected | `boolean` | `false` | 否 | 是否选中 |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| click | - | 点击节点 |
| drag-start | - | 开始拖拽 |
| drag-end | `position: {x, y}` | 结束拖拽 |

---

### 5.4 ConnectionLine

连接线组件，展示卡片和文件之间的连接线。

**路径**: `src/renderer/components/graph/ConnectionLine.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| start | `{x: number, y: number}` | - | 是 | 起点坐标 |
| end | `{x: number, y: number}` | - | 是 | 终点坐标 |
| active | `boolean` | `false` | 否 | 是否激活（高亮） |

---

## 6. 通用组件 (Common)

### 6.1 ProgressBar

进度条组件，展示执行进度。

**路径**: `src/renderer/components/common/ProgressBar.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| current | `number` | - | 是 | 当前值 |
| total | `number` | - | 是 | 总数 |
| status | `'running' \| 'success' \| 'error' \| 'paused'` | `'running'` | 否 | 状态 |
| showPercentage | `boolean` | `true` | 否 | 是否显示百分比 |
| showCount | `boolean` | `true` | 否 | 是否显示数量 |
| showRemaining | `boolean` | `false` | 否 | 是否显示预计剩余时间 |
| estimatedRemaining | `number` | - | 否 | 预计剩余时间（毫秒） |
| label | `string` | - | 否 | 自定义标签 |
| height | `number` | `8` | 否 | 高度（像素） |
| striped | `boolean` | `true` | 否 | 是否使用条纹动画 |
| animated | `boolean` | `true` | 否 | 是否使用动画效果 |

#### 使用示例

```vue
<template>
  <ProgressBar
    :current="50"
    :total="100"
    status="running"
    label="正在执行绑定..."
    :show-remaining="true"
    :estimated-remaining="30000"
  />
</template>
```

---

### 6.2 FileSelector

文件选择器组件，提供文件/文件夹选择功能。

**路径**: `src/renderer/components/common/FileSelector.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| mode | `'file' \| 'folder' \| 'both'` | `'file'` | 否 | 选择模式 |
| multiple | `boolean` | `false` | 否 | 是否多选 |
| accept | `string[]` | - | 否 | 允许的文件类型 |
| placeholder | `string` | - | 否 | 占位文本 |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| select | `paths: string[]` | 选择完成 |

---

## 7. 结果组件 (Result)

### 7.1 ResultReport

结果报告组件，展示执行结果的报告。

**路径**: `src/renderer/components/result/ResultReport.vue`

#### Props

| 属性名 | 类型 | 默认值 | 必填 | 说明 |
|-------|------|-------|------|------|
| result | `ExecuteResult` | - | 是 | 执行结果 |
| showRetry | `boolean` | `true` | 否 | 是否显示重试按钮 |
| showDetails | `boolean` | `true` | 否 | 是否显示详情 |

#### Emits

| 事件名 | 参数 | 说明 |
|-------|------|------|
| retry | - | 重试全部 |
| retry-failed | - | 重试失败项 |
| complete | - | 完成确认 |
| view-detail | `error: ExecutionError` | 查看错误详情 |

#### 使用示例

```vue
<template>
  <ResultReport
    :result="executeResult"
    @retry-failed="handleRetryFailed"
    @complete="handleComplete"
    @view-detail="handleViewDetail"
  />
</template>
```

---

## 8. 视图组件 (Views)

### 8.1 ConnectorView

主视图组件，整合所有子视图的容器。

**路径**: `src/renderer/views/ConnectorView.vue`

#### 功能

- 提供整体布局框架
- 管理导航和路由
- 协调各子视图状态

---

### 8.2 ManualView

手动连接视图，提供表格和图形两种连接模式。

**路径**: `src/renderer/views/ManualView.vue`

#### 子组件

- `manual/TableMode.vue` - 表格模式
- `manual/GraphMode.vue` - 图形模式

#### 功能

- 切换表格/图形模式
- 加载卡片和文件
- 管理手动绑定操作

---

### 8.3 AutoMatchView

自动识别视图，提供自动匹配功能。

**路径**: `src/renderer/views/AutoMatchView.vue`

#### 功能

- 调用多种匹配器生成方案
- 展示多个匹配方案
- 支持方案选择和应用

---

### 8.4 SmartMatchView

智能识别视图，提供AI智能匹配功能。

**路径**: `src/renderer/views/SmartMatchView.vue`

#### 功能

- 调用AI服务进行智能匹配
- 分级展示匹配结果
- 支持结果修改和确认

---

### 8.5 ExecuteView

绑定执行视图，执行绑定操作并展示进度。

**路径**: `src/renderer/views/ExecuteView.vue`

#### 功能

- 执行绑定操作
- 显示执行进度
- 处理错误和重试

---

### 8.6 ConvertView

模式转换视图，提供资源模式转换功能。

**路径**: `src/renderer/views/ConvertView.vue`

#### 功能

- 空壳转全填充
- 全填充转空壳
- 显示转换进度

---

### 8.7 PreviewView

绑定预览视图，预览绑定结果。

**路径**: `src/renderer/views/PreviewView.vue`

#### 功能

- 展示所有待执行的绑定
- 支持最后修改
- 确认后跳转执行

---

## 类型定义参考

### CardInfo

```typescript
interface CardInfo {
  id: string;
  name: string;
  type: string;
  description?: string;
  baseCards: BaseCard[];
  metadata: {
    created_at: string;
    modified_at: string;
  };
}
```

### FileInfo

```typescript
interface FileInfo {
  path: string;
  name: string;
  size: number;
  type: FileType;
  createdAt: string;
  modifiedAt: string;
}

type FileType = 'video' | 'audio' | 'image' | 'document' | 'subtitle' | 'archive' | 'other';
```

### BindingItem

```typescript
interface BindingItem {
  cardId: string;
  filePath: string;
  resourceField: string;
  baseCardId?: string;
}
```

### MatchScheme

```typescript
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

type MatchMode = 'number_sequence' | 'keyword' | 'file_order' | 'smart';
```

### ExecuteResult

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

---

**文档维护者**: 薯片生态核心团队
