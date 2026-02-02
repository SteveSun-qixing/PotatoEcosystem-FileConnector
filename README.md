# 薯片文件连接器 (Chips-FileConnector)

**版本**: 1.0.0  
**更新时间**: 2026-02-02

---

## 项目简介

薯片文件连接器是薯片生态系统中的批量资源绑定工具，专为解决大量外部文件与卡片之间的关联问题而设计。当用户需要将多个文件（如视频、音频、图片等）批量绑定到对应的卡片时，文件连接器提供了多种智能化的匹配方案，大幅提升工作效率。

### 为什么需要文件连接器？

在薯片生态中，卡片是内容的基本单元，而资源文件是卡片的核心内容。传统方式需要用户逐个打开卡片、选择文件、确认绑定，当文件数量达到数十甚至数百个时，这个过程极其繁琐。文件连接器通过智能匹配算法，可以自动识别卡片名称和文件名称之间的对应关系，一键完成批量绑定。

### 架构定位

```
薯片生态架构：
┌─────────────────────────────────────────────────────┐
│  第四层：辅助工具                                      │
│  ┌───────────────────────────────────────────────┐ │
│  │  📂 文件连接器 (Chips-FileConnector)            │ │
│  │  📦 资源管理器 (Chips-ResourceManager)          │ │
│  │  ✏️ 编辑器 (Chips-Editor)                      │ │
│  └───────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  第三层：SDK与组件库                                   │
│  ┌───────────────────────────────────────────────┐ │
│  │  Chips-SDK │ Chips-ComponentLibrary           │ │
│  └───────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  第二层：公共基础层                                    │
│  ┌───────────────────────────────────────────────┐ │
│  │  Chips-Foundation                              │ │
│  └───────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  第一层：微内核                                       │
│  ┌───────────────────────────────────────────────┐ │
│  │  Chips-Core                                    │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 功能特性

### 核心功能

| 功能模块 | 功能描述 | 适用场景 |
|---------|---------|---------|
| 手动连接 | 表格/图形化界面，手动建立绑定 | 精确控制每个绑定关系 |
| 自动识别 | 数字序列/关键词/顺序匹配 | 命名规律明确的文件 |
| 智能识别 | AI语义分析匹配 | 复杂命名、跨语言场景 |
| 绑定执行 | 批量执行绑定操作 | 确认后统一执行 |
| 模式转换 | 空壳↔全填充模式转换 | 分享/备份卡片资源 |

### 手动连接模块

- **表格模式 (TableMode)**
  - 左列展示卡片列表，右列展示文件列表
  - 支持搜索、筛选、排序
  - 逐行指定绑定关系
  - 支持批量选择和操作

- **图形模式 (GraphMode)**
  - 可视化展示卡片和文件节点
  - 拖拽连线建立绑定关系
  - 直观展示连接状态
  - 支持自动布局

### 自动识别模块

- **数字序列匹配 (NumberSequenceMatcher)**
  - 提取名称中的数字进行匹配
  - 智能识别集数、编号等信息
  - 支持多种数字格式（01, 001, 第1集等）

- **关键词匹配 (KeywordMatcher)**
  - 分词提取关键词
  - Jaccard相似度 + 编辑距离综合评分
  - 支持中英文混合

- **文件顺序匹配 (FileOrderMatcher)**
  - 按名称/时间/大小排序后顺序匹配
  - 作为后备匹配方案

### 智能识别模块

- **AI匹配 (SmartMatcher)**
  - 调用AI服务进行语义分析
  - 置信度分级展示（高/中/低）
  - AI不可用时自动降级到自动匹配

### 绑定执行模块

- **绑定执行器 (BindingExecutor)**
  - 并发执行绑定操作
  - 进度追踪与回调
  - 错误处理与重试机制
  - 支持取消操作

### 模式转换模块

- **模式转换器 (ModeConverter)**
  - 空壳转全填充：复制资源到卡片内部
  - 全填充转空壳：移出资源保留引用
  - 资源类型过滤
  - 磁盘空间检查

---

## 技术栈

### 框架与运行环境

| 技术 | 版本 | 用途 |
|-----|------|-----|
| Electron | ^29.1.0 | 桌面应用框架 |
| Vue 3 | ^3.4.21 | UI框架 |
| TypeScript | ^5.4.2 | 开发语言 |
| Vite | ^5.1.6 | 构建工具 |
| electron-vite | ^2.0.0 | Electron+Vite集成 |

### 状态管理与路由

| 技术 | 版本 | 用途 |
|-----|------|-----|
| Pinia | ^2.1.7 | 状态管理 |
| Vue Router | ^4.3.0 | 路由管理 |
| Vue I18n | ^9.10.2 | 国际化 |

### 测试工具

| 技术 | 版本 | 用途 |
|-----|------|-----|
| Vitest | ^1.4.0 | 单元测试 |
| @vue/test-utils | ^2.4.4 | Vue组件测试 |
| happy-dom | ^13.6.2 | DOM模拟 |

### 代码质量

| 技术 | 版本 | 用途 |
|-----|------|-----|
| ESLint | ^8.57.0 | 代码检查 |
| Prettier | ^3.2.5 | 代码格式化 |
| TypeScript ESLint | ^7.1.1 | TS代码检查 |

### 依赖模块

| 模块 | 说明 |
|-----|------|
| @chips/sdk | 薯片SDK，提供核心API |
| @chips/component-library | 薯片组件库 |
| @chips/foundation | 公共基础层，文件处理等 |

---

## 安装和运行

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
# 在项目根目录执行
npm install
```

### 开发模式

```bash
# 启动开发服务器，支持热重载
npm run dev
```

### 生产构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行单元测试
npm run test:unit

# 生成测试覆盖率报告
npm run test:coverage

# 监视模式运行测试
npm run test:watch
```

### 代码检查

```bash
# 运行ESLint检查
npm run lint

# 自动修复ESLint问题
npm run lint:fix

# TypeScript类型检查
npm run type-check

# 格式化代码
npm run format
```

---

## 项目结构

```
Chips-FileConnector/
├── src/
│   ├── main/                   # Electron主进程
│   │   ├── index.ts           # 主进程入口
│   │   ├── window.ts          # 窗口管理
│   │   └── ipc/               # IPC通信
│   │
│   ├── preload/                # 预加载脚本
│   │   └── index.ts
│   │
│   ├── renderer/               # 渲染进程（Vue应用）
│   │   ├── App.vue            # 根组件
│   │   ├── main.ts            # 渲染进程入口
│   │   │
│   │   ├── components/        # 组件目录
│   │   │   ├── card/         # 卡片相关组件
│   │   │   ├── file/         # 文件相关组件
│   │   │   ├── binding/      # 绑定相关组件
│   │   │   ├── scheme/       # 方案相关组件
│   │   │   ├── graph/        # 图形连线组件
│   │   │   ├── common/       # 通用组件
│   │   │   └── result/       # 结果展示组件
│   │   │
│   │   ├── views/             # 视图页面
│   │   │   ├── ConnectorView.vue    # 主视图
│   │   │   ├── ManualView.vue       # 手动连接
│   │   │   ├── AutoMatchView.vue    # 自动识别
│   │   │   ├── SmartMatchView.vue   # 智能识别
│   │   │   ├── ExecuteView.vue      # 绑定执行
│   │   │   ├── ConvertView.vue      # 模式转换
│   │   │   └── PreviewView.vue      # 绑定预览
│   │   │
│   │   ├── composables/       # 组合式函数
│   │   │   ├── useManualConnect.ts
│   │   │   ├── useAutoMatch.ts
│   │   │   ├── useSmartMatch.ts
│   │   │   ├── useBindingExecute.ts
│   │   │   └── useModeConvert.ts
│   │   │
│   │   ├── stores/            # Pinia状态仓库
│   │   │   ├── cards.ts       # 卡片状态
│   │   │   ├── files.ts       # 文件状态
│   │   │   ├── connector.ts   # 连接器状态
│   │   │   └── settings.ts    # 设置状态
│   │   │
│   │   ├── router/            # Vue Router
│   │   └── styles/            # 全局样式
│   │
│   ├── core/                   # 核心业务逻辑
│   │   ├── matchers/          # 匹配器
│   │   │   ├── BaseMatcher.ts
│   │   │   ├── NumberSequenceMatcher.ts
│   │   │   ├── KeywordMatcher.ts
│   │   │   ├── FileOrderMatcher.ts
│   │   │   ├── SmartMatcher.ts
│   │   │   └── SchemeGenerator.ts
│   │   │
│   │   ├── executors/         # 执行器
│   │   │   ├── BindingExecutor.ts
│   │   │   ├── ModeConverter.ts
│   │   │   └── ConcurrencyController.ts
│   │   │
│   │   └── validators/        # 验证器
│   │       └── BindingValidator.ts
│   │
│   ├── adapters/               # 适配器
│   │   └── AIServiceClient.ts # AI服务客户端
│   │
│   ├── types/                  # TypeScript类型定义
│   │   ├── card.ts
│   │   ├── file.ts
│   │   ├── binding.ts
│   │   ├── match.ts
│   │   ├── execute.ts
│   │   ├── convert.ts
│   │   └── config.ts
│   │
│   ├── utils/                  # 工具函数
│   │   ├── file.ts            # 文件工具
│   │   ├── match.ts           # 匹配工具
│   │   ├── validation.ts      # 验证工具
│   │   ├── async.ts           # 异步工具
│   │   └── format.ts          # 格式化工具
│   │
│   └── i18n/                   # 国际化
│       ├── zh-CN.ts
│       └── en-US.ts
│
├── tests/                      # 测试目录
│   ├── unit/                  # 单元测试
│   └── fixtures/              # 测试数据
│
├── 技术文档/                    # 技术文档
├── 需求文档/                    # 需求文档
├── 开发计划/                    # 开发计划
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── electron.vite.config.ts
```

---

## 开发指南

### 代码规范

- 使用 TypeScript 强类型
- 遵循 Vue 3 Composition API 风格
- 组件使用 `<script setup>` 语法
- 样式使用 SCSS，遵循 BEM 命名规范

### 新增匹配器

1. 在 `src/core/matchers/` 创建新的匹配器类
2. 继承 `BaseMatcher` 基类
3. 实现 `match()` 和 `isApplicable()` 方法
4. 在 `SchemeGenerator` 中注册

```typescript
// 示例：创建自定义匹配器
import { BaseMatcher } from './BaseMatcher';

export class CustomMatcher extends BaseMatcher {
  readonly name = 'CustomMatcher';
  readonly mode = 'custom';
  
  match(cards, files, options) {
    // 实现匹配逻辑
  }
  
  isApplicable(cards, files) {
    // 判断是否适用
  }
}
```

### 新增组件

1. 在对应的 `components/` 子目录创建 `.vue` 文件
2. 使用 `<script setup lang="ts">` 语法
3. 定义明确的 Props 和 Emits 类型
4. 在对应的 `index.ts` 中导出

### 调试方法

```bash
# 开发模式启动（支持DevTools）
npm run dev

# 主进程日志查看：Electron窗口 → View → Toggle Developer Tools
# 渲染进程日志：浏览器开发者工具
```

---

## 测试说明

### 测试结构

```
tests/
├── unit/
│   ├── matchers/              # 匹配器测试
│   │   ├── NumberSequenceMatcher.test.ts
│   │   ├── KeywordMatcher.test.ts
│   │   ├── FileOrderMatcher.test.ts
│   │   └── SmartMatcher.test.ts
│   │
│   ├── executors/             # 执行器测试
│   │   ├── BindingExecutor.test.ts
│   │   └── ModeConverter.test.ts
│   │
│   ├── validators/            # 验证器测试
│   │   └── BindingValidator.test.ts
│   │
│   ├── utils/                 # 工具函数测试
│   │   ├── file.test.ts
│   │   ├── match.test.ts
│   │   └── validation.test.ts
│   │
│   └── composables/           # 组合式函数测试
│       └── useManualConnect.test.ts
│
└── fixtures/                  # 测试数据
    ├── cards.ts
    ├── files.ts
    └── bindings.ts
```

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行特定测试文件
npm run test -- NumberSequenceMatcher

# 生成覆盖率报告
npm run test:coverage
```

### 编写测试

```typescript
import { describe, it, expect } from 'vitest';
import { NumberSequenceMatcher } from '@/core/matchers/NumberSequenceMatcher';
import { mockCards, mockFiles } from '../fixtures';

describe('NumberSequenceMatcher', () => {
  it('should match cards and files by number sequence', () => {
    const matcher = new NumberSequenceMatcher();
    const result = matcher.match(mockCards, mockFiles);
    
    expect(result.bindings).toHaveLength(3);
    expect(result.confidence).toBeGreaterThan(80);
  });
});
```

---

## 使用场景

### 场景一：视频系列绑定

用户有一个包含多集视频的卡片箱子，需要将对应的视频文件绑定到每个卡片。

```
卡片：第01集.card  ←→  文件：EP01.mp4
卡片：第02集.card  ←→  文件：EP02.mp4
卡片：第03集.card  ←→  文件：EP03.mp4
```

**推荐匹配方式**：数字序列匹配

### 场景二：照片导入

用户有一批照片需要绑定到对应的卡片，照片命名和卡片名称相似但不完全一致。

```
卡片：北京天安门       ←→  文件：tiananmen_beijing.jpg
卡片：上海外滩夜景     ←→  文件：shanghai_bund_night.jpg
```

**推荐匹配方式**：关键词匹配 或 智能识别

### 场景三：资源模式转换

用户要分享卡片给他人，需要将引用外部资源的空壳卡片转换为包含所有资源的全填充卡片。

**操作方式**：使用模式转换功能，选择"空壳转全填充"

---

## 性能指标

| 指标 | 目标值 | 说明 |
|-----|-------|-----|
| 启动时间 | < 1秒 | 应用冷启动到可用 |
| 自动匹配响应 | < 500ms | 100个文件的匹配计算 |
| 批量绑定速度 | < 100ms/个 | 单个绑定执行时间 |
| 支持文件数 | 1000+ | 单次处理的最大文件数 |
| 内存占用 | < 200MB | 正常使用时的内存占用 |

---

## 文档导航

### 需求文档

- [00-文档索引](需求文档/00-文档索引.md) - 需求文档导航
- [01-产品概述](需求文档/01-产品概述.md) - 产品定位、核心理念
- [02-功能需求](需求文档/02-功能需求.md) - 详细功能需求
- [03-用户故事](需求文档/03-用户故事.md) - 典型使用场景
- [04-接口需求](需求文档/04-接口需求.md) - 与其他模块的接口需求

### 技术文档

- [00-文档索引](技术文档/00-文档索引.md) - 技术文档导航
- [01-架构设计](技术文档/01-架构设计.md) - 总体架构和核心模块
- [02-连接模式设计](技术文档/02-连接模式设计.md) - 三种连接模式实现
- [03-匹配算法设计](技术文档/03-匹配算法设计.md) - 自动匹配算法
- [04-数据结构设计](技术文档/04-数据结构设计.md) - 核心数据结构
- [05-接口定义](技术文档/05-接口定义.md) - 完整接口规范
- [06-代码结构](技术文档/06-代码结构.md) - 代码组织
- [07-测试手册](技术文档/07-测试手册.md) - 测试指南
- [08-开发者指南](技术文档/08-开发者指南.md) - 开发指南
- [10-组件API文档](技术文档/10-组件API文档.md) - Vue组件API
- [11-工具函数文档](技术文档/11-工具函数文档.md) - 工具函数API
- [12-Core模块API文档](技术文档/12-Core模块API文档.md) - 核心模块API

### 开发计划

- [00-开发计划总览](开发计划/00-开发计划总览.md) - 整体计划和里程碑

---

## 相关资源

- [薯片生态白皮书](../生态设计原稿（一切标准）/薯片生态白皮书（综述版）.md)
- [文件连接器设计](../生态设计原稿（一切标准）/25-文件连接器设计.md)
- [卡片资源模式](../生态设计原稿（一切标准）/24-卡片资源模式和映射机制.md)
- [开发规范总则](../生态共用/08-开发规范总则.md)

---

## 变更日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本变更历史。

---

## 维护信息

**维护团队**: 薯片生态核心团队  
**最后更新**: 2026-02-02  
**许可证**: MIT License
