# Dashboard 分层编排架构规范文档

> 📋 本文档定义 Homura Dashboard 分层编排架构的技术规范

## 📄 元信息

- **创建日期**: 2026-03-23
- **状态**: Implemented
- **优先级**: P0
- **负责人**: Claude
- **依赖**: [Toolkit 规范](./toolkit.md)

---

## ✅ 实现总结 (2026-03-23)

### 已完成功能

#### 数据结构
- ✅ Toolkit 类型定义 (`packages/sdk/src/types/toolkit.ts`)
- ✅ Blueprint 类型增强（添加 id, tags, toolkitId）
- ✅ 测试消息类型 (`src/shared/types.ts`)

#### 状态管理
- ✅ ToolkitStore - CRUD、搜索过滤、导入导出
- ✅ BlueprintStore 增强 - 搜索过滤功能
- ✅ Storage 层 - Chrome Storage wrapper

#### UI 组件 - 工具集编排
- ✅ ToolkitEditor - 主编辑器（三栏布局）
- ✅ ToolkitLibrary - 工具集列表面板（搜索+标签过滤）
- ✅ ToolkitSequencePanel - 工具序列（拖拽排序）
- ✅ ToolDetailEditor - 工具详情编辑器
- ✅ LightweightTestPanel - 轻量测试面板

#### UI 组件 - 蓝图编排
- ✅ BlueprintEditor - 主编辑器（多视图切换）
- ✅ BlueprintLibrary - 蓝图列表面板
- ✅ RuleBookEditor - Markdown 编辑器（带模板）
- ✅ ToolkitSelector - 工具集选择器
- ✅ BlueprintTestPanel - 完整测试面板

#### 应用结构
- ✅ App.tsx - 两个 Tab 切换（工具集编排 / 蓝图编排）

#### 测试集成
- ✅ SidePanel TestPanel - 接收并执行测试请求
- ✅ 消息协议 - TEST_TOOLKIT, TEST_BLUEPRINT, TEST_RESULT
- ✅ 进度更新 - 实时显示执行状态

#### 文件清单
| 模块 | 文件 |
|------|------|
| SDK 类型 | `packages/sdk/src/types/toolkit.ts` |
| Storage | `src/shared/storage/toolkitStorage.ts` |
| Utils | `src/dashboard/utils/toolkitOperations.ts` |
| Store | `src/dashboard/stores/toolkitStore.ts` |
| 工具集组件 | `src/dashboard/components/toolkit/*.tsx` (5个) |
| 蓝图组件 | `src/dashboard/components/blueprint/*.tsx` (5个) |
| 测试 | `src/sidepanel/components/TestPanel.tsx` |
| 应用 | `src/dashboard/App.tsx`, `src/sidepanel/App.tsx` |

---

---

## 🎯 功能概述

**目标**: 重新设计 Dashboard 为分层编排架构，实现原子工具集和蓝图的解耦

当前 Dashboard 混合了工具管理和蓝图编排，导致职责不清。新设计将明确分层：

```
┌─────────────────────────────────────────────────────────────┐
│                     Dashboard (编排中心)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐    ┌──────────────────────────┐   │
│  │   Tab 1: 工具集编排  │    │   Tab 2: 蓝图编排        │   │
│  │                     │    │                          │   │
│  │  - 组合原子工具      │    │  - 编写 Rule Book        │   │
│  │  - 调整工具顺序      │    │  - 选择工具集            │   │
│  │  - 编辑工具参数      │    │  - 配置测试页面          │   │
│  │  - 轻量测试          │    │  - 完整测试              │   │
│  └─────────────────────┘    └──────────────────────────┘   │
│            │                          │                     │
│            └──────────┬───────────────┘                     │
│                       ▼                                     │
│              ┌──────────────────┐                          │
│              │  Toolkit Storage │                          │
│              │  Blueprint Store │                          │
│              └──────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     SidePanel (执行层)                       │
├─────────────────────────────────────────────────────────────┤
│  Test Mode: 接收测试请求 → 执行 → 返回结果                   │
└─────────────────────────────────────────────────────────────┘
```

**范围**:
- ✅ Dashboard 两个 Tab 的 UI 架构
- ✅ 工具集编排功能
- ✅ 蓝图编排功能（增强）
- ✅ SidePanel 测试模式
- ❌ AI Agent 执行（已有 orchestrator）
- ❌ Rule Book 解析器（已有）

---

## 🏗️ 技术设计

### 分层架构

```
Layer 1: 原子工具 (Atomic Tools)
  └─ 定义: packages/sdk/src/types/index.ts
  └─ 最小操作单元: CLICK, INPUT, EXTRACT_TEXT, WAIT_FOR, NAVIGATE
  └─ 存储: toolStore (chrome.storage.local)

Layer 2: 工具集 (Toolkits)
  └─ 定义: packages/sdk/src/types/toolkit.ts
  └─ 原子工具的有序组合
  └─ 存储: toolkitStore (chrome.storage.local)

Layer 3: 蓝图 (Blueprints)
  └─ 定义: packages/sdk/src/types/blueprint.ts
  └─ 工具集引用 + Rule Book
  └─ 存储: blueprintStore (chrome.storage.local)
```

### Dashboard 两个 Tab 职责

#### Tab 1: 工具集编排

| 功能 | 说明 | 组件 |
|------|------|------|
| 工具列表 | 展示可用原子工具 | ToolListPanel |
| 工具集序列 | 当前编辑的工具集（拖拽排序） | ToolkitSequencePanel |
| 工具详情 | 编辑选中工具的参数/选择器 | ToolDetailEditor |
| 工具集库 | 已保存的工具集列表 | ToolkitLibrary |
| 轻量测试 | 发送工具集到 SidePanel 执行 | LightweightTestPanel |

#### Tab 2: 蓝图编排

| 功能 | 说明 | 组件 |
|------|------|------|
| 工具集选择器 | 选择已编排的工具集 | ToolkitSelector |
| Rule Book 编辑器 | Markdown 编辑器 | RuleBookEditor |
| 测试页面配置 | 配置测试目标 URL | TestPageConfig |
| 蓝图库 | 已保存的蓝图列表 | BlueprintLibrary |
| 完整测试 | 端到端自动化测试 | CompleteTestPanel |

### 模块划分

| 模块 | 职责 | 位置 |
|------|------|------|
| ToolkitEditor | 工具集编排主组件 | src/dashboard/components/toolkit/ToolkitEditor.tsx |
| BlueprintEditor | 蓝图编排主组件 | src/dashboard/components/blueprint/BlueprintEditor.tsx |
| ToolkitStore | 工具集状态管理 | src/dashboard/stores/toolkitStore.ts |
| BlueprintStore | 蓝图状态管理 | src/dashboard/stores/blueprintStore.ts |
| TestPanel | 测试面板（共用） | src/dashboard/components/TestPanel.tsx |

---

## 📝 类型定义

### Dashboard 视图状态

```typescript
// src/dashboard/types.ts

export type DashboardView = 'toolkit' | 'blueprint';

export interface DashboardState {
  currentView: DashboardView;
  selectedToolkitId: string | null;
  selectedBlueprintId: string | null;
  isTesting: boolean;
  testMode: 'lightweight' | 'complete';
}
```

### 工具集编辑状态

```typescript
// src/dashboard/components/toolkit/types.ts

export interface ToolkitEditState {
  toolkit: Toolkit;
  selectedToolIndex: number;
  isDirty: boolean;
  validationErrors: ValidationError[];
}

export interface ValidationError {
  toolId: string;
  field: string;
  message: string;
}
```

### 蓝图编辑状态

```typescript
// src/dashboard/components/blueprint/types.ts

export interface BlueprintEditState {
  blueprint: Blueprint;
  selectedToolkitId: string | null;
  ruleBook: string;
  testUrl: string;
  isDirty: boolean;
}
```

---

## 🔌 API 设计

### Dashboard → SidePanel 消息

```typescript
// 测试工具集
export interface TestToolkitMessage {
  type: 'TEST_TOOLKIT';
  payload: {
    toolkit: Toolkit;
    tabId: number;
    params?: Record<string, unknown>;
  };
  messageId: string;
}

// 测试蓝图
export interface TestBlueprintMessage {
  type: 'TEST_BLUEPRINT';
  payload: {
    blueprint: Blueprint;
    tabId: number;
    testUrl?: string;
    params?: Record<string, unknown>;
  };
  messageId: string;
}

// 停止测试
export interface StopTestMessage {
  type: 'STOP_TEST';
  payload: {
    testId: string;
  };
  messageId: string;
}
```

### SidePanel → Dashboard 消息

```typescript
// 测试进度更新
export interface TestProgressMessage {
  type: 'TEST_PROGRESS';
  payload: {
    testId: string;
    currentStep: number;
    totalSteps: number;
    currentToolName: string;
  };
  messageId: string;
  requestMessageId: string;
}

// 测试结果
export interface TestResultMessage {
  type: 'TEST_RESULT';
  payload: {
    testId: string;
    success: boolean;
    results: ToolExecutionResult[];
    logs: LogEntry[];
    error?: string;
    totalTime: number;
  };
  messageId: string;
  requestMessageId: string;
}
```

### 工具集操作 API

```typescript
// src/dashboard/utils/toolkitOperations.ts

/**
 * 创建新工具集
 */
export function createNewToolkit(
  name: string,
  description?: string
): Toolkit;

/**
 * 向工具集添加工具
 */
export function addToolToToolkit(
  toolkit: Toolkit,
  tool: AtomicTool,
  index?: number
): Toolkit;

/**
 * 从工具集移除工具
 */
export function removeToolFromToolkit(
  toolkit: Toolkit,
  toolId: string
): Toolkit;

/**
 * 移动工具位置
 */
export function moveToolInToolkit(
  toolkit: Toolkit,
  fromIndex: number,
  toIndex: number
): Toolkit;

/**
 * 更新工具集中的工具
 */
export function updateToolInToolkit(
  toolkit: Toolkit,
  toolId: string,
  updates: Partial<AtomicTool>
): Toolkit;

/**
 * 验证工具集
 */
export function validateToolkit(
  toolkit: Toolkit
): { valid: boolean; errors: ValidationError[] };
```

---

## 🔄 工作流

### 工具集编排流程

```
1. 用户打开 Dashboard → Tab 1: 工具集编排
2. 点击 "新建工具集" 或选择现有工具集
3. 从左侧工具库拖拽工具到中间序列区
4. 点击工具 → 右侧详情面板编辑参数/选择器
5. 调整工具顺序（拖拽）
6. 点击 "保存" → 保存到 chrome.storage
7. 点击 "测试" → 发送到 SidePanel 执行
```

### 蓝图编排流程

```
1. 用户打开 Dashboard → Tab 2: 蓝图编排
2. 点击 "新建蓝图" 或选择现有蓝图
3. 从工具集选择器选择已编排的工具集
4. 编写 Rule Book（Markdown）
5. 配置测试页面 URL
6. 点击 "保存" → 保存到 chrome.storage
7. 点击 "完整测试" → 发送到 SidePanel 执行
```

### 测试流程

```
轻量测试 (工具集):
1. Dashboard 发送 TEST_TOOLKIT 消息
2. SidePanel 接收 → 显示测试进度
3. 顺序执行工具集中的工具
4. 每完成一个工具 → 发送 TEST_PROGRESS
5. 全部完成 → 发送 TEST_RESULT
6. Dashboard 显示结果

完整测试 (蓝图):
1. Dashboard 发送 TEST_BLUEPRINT 消息
2. SidePanel 接收 → 导航到测试 URL
3. 加载工具集和 Rule Book
4. AI Agent 根据 Rule Book 决策执行
5. 实时发送进度更新
6. 完成后发送完整结果
```

---

## 🎨 UI 设计

### Dashboard 布局

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo | Tab 切换 | 状态 | 打开录制器                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┬──────────────────────────┬───────────────┐ │
│  │             │                          │               │ │
│  │   Sidebar   │       Main Editor        │  Test Panel   │ │
│  │             │                          │               │ │
│  │  工具集库   │   工具序列 / 编辑器      │   执行结果    │ │
│  │  蓝图库     │   Rule Book 编辑器       │   实时日志    │ │
│  │             │                          │               │ │
│  └─────────────┴──────────────────────────┴───────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 颜色规范 (Deep Space)

```typescript
const colors = {
  // 背景
  background: 'zinc-950',
  surface: 'zinc-900/50',
  elevated: 'zinc-800/50',

  // 边框
  border: 'white/5',
  borderHover: 'white/10',
  borderActive: 'violet-500/30',

  // 文字
  textPrimary: 'zinc-100',
  textSecondary: 'zinc-400',
  textMuted: 'zinc-500',

  // 强调色
  accent: 'violet-500',
  accentHover: 'violet-400',
  accentGradient: 'from-violet-600 to-fuchsia-600',

  // 状态
  success: 'emerald-500',
  error: 'rose-500',
  warning: 'amber-500',
  info: 'blue-500',
};
```

---

## ✅ 验收标准

### Tab 1: 工具集编排

- [ ] 可以创建新工具集
- [ ] 可以从工具库添加工具到工具集
- [ ] 可以调整工具顺序（拖拽）
- [ ] 可以编辑工具参数和选择器
- [ ] 可以保存/加载/删除工具集
- [ ] 可以导出/导入工具集
- [ ] 可以发送工具集到 SidePanel 测试
- [ ] 可以接收和展示测试结果

### Tab 2: 蓝图编排

- [ ] 可以创建新蓝图
- [ ] 可以从工具集选择器选择工具集
- [ ] 可以编写/编辑 Rule Book
- [ ] 可以配置测试页面 URL
- [ ] 可以保存/加载/删除蓝图
- [ ] 可以导出/导入蓝图
- [ ] 可以发送蓝图到 SidePanel 测试
- [ ] 可以接收和展示测试结果

### 共同功能

- [ ] 两个 Tab 之间切换流畅
- [ ] 状态持久化正常
- [ ] 消息传递正常
- [ ] TypeScript 类型检查通过
- [ ] 无 ESLint 错误

---

## 🧪 测试策略

### 单元测试

```typescript
// 工具集操作测试
describe('Toolkit Operations', () => {
  it('should add tool to toolkit');
  it('should remove tool from toolkit');
  it('should move tool in toolkit');
  it('should update tool in toolkit');
  it('should validate toolkit');
});

// 消息处理测试
describe('Message Handling', () => {
  it('should send TEST_TOOLKIT message');
  it('should send TEST_BLUEPRINT message');
  it('should receive TEST_RESULT message');
  it('should handle timeout');
});
```

### 集成测试

- [ ] Dashboard → SidePanel 消息传递
- [ ] 工具集测试执行
- [ ] 蓝图测试执行
- [ ] 存储层集成

### E2E 测试

- [ ] 完整工具集创建→测试流程
- [ ] 完整蓝图创建→测试流程
- [ ] 导入/导出流程

---

## 📚 相关文档

- [DEVELOPMENT.md](../DEVELOPMENT.md)
- [SDK Architecture](../sdk-architecture.md)
- [Toolkit 规范](./toolkit.md)
- [Blueprint 规范](./blueprint.md)

---

## 📅 更新历史

| 日期 | 版本 | 变更说明 |
|------|------|----------|
| 2026-03-23 | 0.1.0 | 初始版本 |
