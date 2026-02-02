# Changelog

本文件记录 Chips-FileConnector 项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.0.0] - 2026-02-01

### Added

#### 核心功能
- **手动连接功能**
  - 表格模式：支持卡片-文件逐行绑定
  - 图形模式：支持拖拽连线建立绑定关系
  - 支持搜索、筛选、排序操作
  - 支持批量选择和操作

- **自动识别功能**
  - 数字序列匹配器（NumberSequenceMatcher）：通过提取数字进行匹配
  - 关键词匹配器（KeywordMatcher）：通过分词和相似度计算匹配
  - 文件顺序匹配器（FileOrderMatcher）：按排序顺序一一对应
  - 方案生成器（SchemeGenerator）：整合多种匹配器，生成多个方案

- **智能识别功能**
  - AI 语义匹配（SmartMatcher）：调用 AI 服务进行智能匹配
  - 置信度分级展示（高/中/低）
  - AI 不可用时自动降级到自动匹配

- **绑定执行功能**
  - 绑定执行器（BindingExecutor）：支持批量执行绑定
  - 并发控制（ConcurrencyController）：可配置并发数
  - 进度追踪和回调
  - 错误处理和重试机制
  - 支持取消操作

- **资源模式转换功能**
  - 模式转换器（ModeConverter）
  - 空壳转全填充：复制外部资源到卡片内部
  - 全填充转空壳：移出内部资源保留引用
  - 资源类型过滤
  - 磁盘空间检查

#### 验证功能
- 绑定验证器（BindingValidator）
- 基础字段验证
- 卡片存在性验证
- 文件存在性验证
- 资源字段类型匹配验证

#### UI 组件
- CardList / CardItem：卡片列表组件
- FileList / FileItem：文件列表组件
- BindingTable / BindingRow：绑定表格组件
- SchemeSelector / SchemeList / SchemeDetail：方案选择组件
- SmartMatchResult：智能匹配结果组件
- ConnectionGraph / CardNode / FileNode / ConnectionLine：图形连接组件
- ProgressBar：进度条组件
- ResultReport：结果报告组件

#### 工具函数
- 文件工具：getExtension, getFileType, formatSize, uniqueName 等
- 匹配工具：extractNumbers, tokenize, jaccardSimilarity, editDistance 等
- 验证工具：validateBinding, isPathSafe, validateExtension
- 异步工具：delay, retry, withTimeout, debounce, throttle, concurrent

#### 基础设施
- Electron + Vue 3 + TypeScript 项目架构
- Pinia 状态管理
- Vue Router 路由管理
- Vue I18n 国际化（中文/英文）
- Vitest 单元测试框架
- ESLint + Prettier 代码质量工具

#### 文档
- 项目 README.md
- 技术文档体系
- API 文档
- 测试手册

---

## [未发布]

### 计划功能
- [ ] 批量绑定预设模板
- [ ] 绑定历史记录
- [ ] 更多匹配算法
- [ ] 性能优化

---

## 版本说明

### 版本号格式

`主版本号.次版本号.修订号`

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

### 变更类型

- **Added**：新添加的功能
- **Changed**：对现有功能的变更
- **Deprecated**：已过时的功能（将在后续版本移除）
- **Removed**：已移除的功能
- **Fixed**：问题修复
- **Security**：安全漏洞修复
