# 工具集（Toolkit）规范文档

> 📋 本文档定义工具集（Toolkit）类型和编排的技术规范

## 📄 元信息

- **创建日期**: 2026-03-23
- **状态**: Implemented
- **优先级**: P0
- **负责人**: -

---

## 🎯 功能概述

**目标**: 定义工具集（Toolkit）作为原子工具与蓝图之间的中间层

工具集是多个原子工具的有序组合，代表一个可复用的操作序列。它是分层编排架构中的核心抽象：

```
Layer 1: Atomic Tools (原子工具)
    ↓ 组合
Layer 2: Toolkit (工具集) ← 本规范
    ↓ 配置
Layer 3: Blueprint (蓝图)
```

**范围**:
- ✅ Toolkit 类型定义
- ✅ 工具集存储 API
- ✅ 工具集导入/导出
- ❌ AI 智能组合（蓝图层功能）
- ❌ 执行引擎（已在 SDK）

---

## 🏗️ 技术设计

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                        Dashboard                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌──────────────────────────────────┐   │
│  │ Tool Library│───▶│  Toolkit Orchestration Tab      │   │
│  │ (原子工具库) │    │  - 组合工具为工具集              │   │
│  └─────────────┘    │  - 调整工具顺序                  │   │
│                     │  - 编辑工具参数/选择器            │   │
│                     └──────────────────────────────────┘   │
│                                │                            │
│                                ▼                            │
│                     ┌──────────────────────┐               │
│                     │  Toolkit Storage     │               │
│                     │  (chrome.storage)    │               │
│                     └──────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        SidePanel                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Test Mode                                            │   │
│  │  - 接收工具集测试请求                                  │   │
│  │  - 顺序执行工具                                       │   │
│  │  - 返回执行结果                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 模块划分

| 模块 | 职责 | 位置 |
|------|------|------|
| Toolkit Type | 工具集类型定义 | packages/sdk/src/types/toolkit.ts |
| Toolkit Storage | Chrome Storage 存取 | src/shared/storage/toolkitStorage.ts |
| Toolkit Store | Zustand 状态管理 | src/dashboard/stores/toolkitStore.ts |
| Toolkit Editor | 工具集编辑器 | src/dashboard/components/toolkit/ |
| Toolkit IO | 导入/导出功能 | src/dashboard/utils/toolkitIO.ts |

---

## 📝 类型定义

### SDK 类型

```typescript
// packages/sdk/src/types/toolkit.ts

import type { AtomicTool } from './index';

/**
 * 工具集 - 多个原子工具的有序组合
 *
 * 工具集代表一个可复用的操作序列，例如：
 * - "登录流程" = [输入用户名, 输入密码, 点击登录按钮]
 * - "填写表单" = [选择选项1, 输入字段2, 上传文件3, 点击提交]
 */
export interface Toolkit {
  /** 唯一标识符 (UUID) */
  id: string;

  /** 工具集名称 */
  name: string;

  /** 工具集描述（可选） */
  description?: string;

  /** 工具的有序列表（按执行顺序） */
  tools: AtomicTool[];

  /** 目标 URL 模式（此工具集适用的页面） */
  targetUrl?: string;

  /** 创建时间 (ISO 8601) */
  createdAt: string;

  /** 最后更新时间 (ISO 8601) */
  updatedAt: string;

  /** 版本号 (语义化版本) */
  version: string;

  /** 标签（用于分类和搜索） */
  tags?: string[];

  /** 作者 */
  author?: string;
}

/**
 * 工具集元数据
 */
export interface ToolkitMeta {
  id: string;
  name: string;
  description?: string;
  toolCount: number;
  targetUrl?: string;
  updatedAt: string;
  version: string;
  tags?: string[];
}

/**
 * 工具集导入选项
 */
export interface ToolkitImportOptions {
  /** 是否覆盖已存在的工具集 */
  overwrite?: boolean;
  /** 是否保留原始 ID */
  preserveId?: boolean;
  /** ID 映射（用于解决冲突） */
  idMapping?: Record<string, string>;
}

/**
 * 工具集导出选项
 */
export interface ToolkitExportOptions {
  /** 是否包含依赖的工具定义 */
  includeTools?: boolean;
  /** 是否压缩输出 */
  minify?: boolean;
  /** 导出格式 */
  format?: 'json' | 'yaml';
}
```

### 扩展类型

```typescript
// src/shared/types.ts

/**
 * 工具集测试请求消息
 */
export interface TestToolkitRequest {
  type: 'TEST_TOOLKIT';
  payload: {
    toolkit: Toolkit;
    tabId: number;
    /** 运行时参数替换 */
    params?: Record<string, unknown>;
    /** 执行选项 */
    options?: {
      /** 是否暂停执行 */
      pause?: boolean;
      /** 执行间隔（毫秒） */
      interval?: number;
      /** 超时时间（毫秒） */
      timeout?: number;
    };
  };
  messageId?: string;
}

/**
 * 工具集测试结果消息
 */
export interface ToolkitTestResultMessage {
  type: 'TOOLKIT_TEST_RESULT';
  payload: {
    success: boolean;
    toolkitId: string;
    results: Array<{
      toolId: string;
      toolName: string;
      success: boolean;
      result: unknown;
      error?: string;
      timestamp: string;
    }>;
    logs: LogEntry[];
    totalTime: number;
  };
  messageId?: string;
  requestMessageId?: string;
}
```

---

## 🔌 API 设计

### 存储层 API

```typescript
/**
 * 保存工具集到 Chrome Storage
 * @param toolkit - 工具集对象
 * @returns 工具集 ID
 */
export async function saveToolkitToStorage(
  toolkit: Toolkit
): Promise<string>;

/**
 * 获取所有工具集
 * @returns 工具集列表
 */
export async function getToolkitsFromStorage(): Promise<Toolkit[]>;

/**
 * 根据 ID 获取工具集
 * @param id - 工具集 ID
 * @returns 工具集对象，如果不存在则返回 null
 */
export async function getToolkitById(
  id: string
): Promise<Toolkit | null>;

/**
 * 删除工具集
 * @param id - 工具集 ID
 */
export async function deleteToolkitFromStorage(
  id: string
): Promise<void>;

/**
 * 批量删除工具集
 * @param ids - 工具集 ID 列表
 */
export async function deleteToolkitsFromStorage(
  ids: string[]
): Promise<void>;

/**
 * 检查工具集 ID 是否存在
 * @param id - 工具集 ID
 */
export async function toolkitExists(
  id: string
): Promise<boolean>;

/**
 * 生成工具集 ID
 * @returns UUID 格式的 ID
 */
export function generateToolkitId(): string;

/**
 * 创建工具集数据对象
 * @param tools - 工具列表
 * @param name - 名称
 * @param description - 描述
 * @returns 工具集对象
 */
export function createToolkit(
  tools: AtomicTool[],
  name: string,
  description?: string
): Toolkit;
```

### 导入/导出 API

```typescript
/**
 * 导入工具集
 * @param data - 导入数据（JSON 字符串或对象）
 * @param options - 导入选项
 * @returns 导入的工具集列表
 */
export async function importToolkit(
  data: string | unknown,
  options?: ToolkitImportOptions
): Promise<Toolkit[]>;

/**
 * 导出工具集
 * @param toolkit - 工具集对象
 * @param options - 导出选项
 * @returns 导出数据（JSON 字符串）
 */
export async function exportToolkit(
  toolkit: Toolkit,
  options?: ToolkitExportOptions
): Promise<string>;

/**
 * 导出多个工具集
 * @param toolkits - 工具集列表
 * @param options - 导出选项
 * @returns 导出数据（JSON 字符串）
 */
export async function exportToolkits(
  toolkits: Toolkit[],
  options?: ToolkitExportOptions
): Promise<string>;

/**
 * 验证工具集格式
 * @param data - 待验证数据
 * @returns 验证结果
 */
export function validateToolkit(
  data: unknown
): { valid: boolean; errors: string[] };
```

### 工具集操作 API

```typescript
/**
 * 向工具集添加工具
 * @param toolkit - 工具集对象
 * @param tool - 要添加的工具
 * @param index - 插入位置（默认添加到末尾）
 * @returns 更新后的工具集
 */
export function addToolToToolkit(
  toolkit: Toolkit,
  tool: AtomicTool,
  index?: number
): Toolkit;

/**
 * 从工具集移除工具
 * @param toolkit - 工具集对象
 * @param toolId - 要移除的工具 ID
 * @returns 更新后的工具集
 */
export function removeToolFromToolkit(
  toolkit: Toolkit,
  toolId: string
): Toolkit;

/**
 * 在工具集中移动工具
 * @param toolkit - 工具集对象
 * @param fromIndex - 原始位置
 * @param toIndex - 目标位置
 * @returns 更新后的工具集
 */
export function moveToolInToolkit(
  toolkit: Toolkit,
  fromIndex: number,
  toIndex: number
): Toolkit;

/**
 * 更新工具集中的工具
 * @param toolkit - 工具集对象
 * @param toolId - 工具 ID
 * @param updates - 更新内容
 * @returns 更新后的工具集
 */
export function updateToolInToolkit(
  toolkit: Toolkit,
  toolId: string,
  updates: Partial<AtomicTool>
): Toolkit;

/**
 * 克隆工具集
 * @param toolkit - 工具集对象
 * @param newName - 新名称
 * @returns 克隆的工具集
 */
export function cloneToolkit(
  toolkit: Toolkit,
  newName?: string
): Toolkit;

/**
 * 合并多个工具集
 * @param toolkits - 工具集列表
 * @param name - 合并后的名称
 * @returns 合并后的工具集
 */
export function mergeToolkits(
  toolkits: Toolkit[],
  name: string
): Toolkit;
```

---

## 🔄 工作流

### 创建工具集流程

```
1. 用户打开 Dashboard → 工具集编排 Tab
2. 从工具库选择工具 → 添加到序列
3. 调整工具顺序（拖拽）
4. 编辑工具参数/选择器
5. 设置工具集名称和描述
6. 保存工具集 → chrome.storage
```

### 测试工具集流程

```
1. Dashboard 发送 TEST_TOOLKIT 消息 → SidePanel
2. SidePanel 接收消息 → 进入测试模式
3. 顺序执行工具集中的工具
4. 收集每个工具的执行结果
5. 返回 TOOLKIT_TEST_RESULT 消息 → Dashboard
6. Dashboard 展示测试结果
```

### 导入/导出流程

```
导出:
1. 用户选择工具集 → 点击导出
2. 序列化为 JSON/YAML
3. 下载文件或复制到剪贴板

导入:
1. 用户上传文件或粘贴内容
2. 验证格式
3. 解析为 Toolkit 对象
4. 处理 ID 冲突
5. 保存到 chrome.storage
```

---

## ✅ 验收标准

- [ ] Toolkit 类型定义清晰，无重复
- [ ] `npm run check:duplicates` 通过
- [ ] 存储层 API 实现完整
- [ ] 导入/导出功能正常
- [ ] 工具集操作（添加/删除/移动/更新）正常
- [ ] TypeScript 类型检查通过
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 与 Dashboard UI 集成正常

---

## 🧪 测试策略

### 单元测试

```typescript
// packages/sdk/src/types/__tests__/toolkit.test.ts
describe('Toolkit', () => {
  describe('addToolToToolkit', () => {
    it('should add tool to end of toolkit');
    it('should add tool at specific index');
    it('should create new object (immutable)');
  });

  describe('removeToolFromToolkit', () => {
    it('should remove tool by id');
    it('should maintain order of remaining tools');
  });

  describe('moveToolInToolkit', () => {
    it('should move tool to new position');
    it('should handle invalid indices');
  });

  describe('cloneToolkit', () => {
    it('should create independent copy');
    it('should generate new id');
  });

  describe('mergeToolkits', () => {
    it('should concatenate tools');
    it('should handle empty toolkits');
  });
});
```

### 集成测试

- [ ] Storage API 与 chrome.storage 集成
- [ ] 导入/导出往返测试
- [ ] Dashboard-SidePanel 消息传递

---

## 📚 相关文档

- [DEVELOPMENT.md](../DEVELOPMENT.md)
- [SDK Architecture](../sdk-architecture.md)
- [Blueprint 规范](./blueprint.md)
- [录制导入规范](./recording-import.md)

---

## 📅 更新历史

| 日期 | 版本 | 变更说明 |
|------|------|----------|
| 2026-03-23 | 0.1.0 | 初始版本 |
| 2026-03-23 | 1.0.0 | 状态更新为 Implemented |
