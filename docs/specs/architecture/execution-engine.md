# 执行引擎架构规范文档

> 🚀 **核心理念**：状态持久化的工具集执行引擎，支持跨页面恢复、自动重试

---

## 📄 元信息

| 字段 | 值 |
|------|-----|
| **创建时间** | 2026-03-24 14:30 |
| **状态** | ✅ Implemented |
| **优先级** | P0 |
| **负责人** | @claude |
| **实际完成** | 2026-03-24 16:00 |
| **实现文件** | `packages/sdk/src/engine/index.ts` |
| **相关 Spec** | [ai-agent-mode.md](../features/ai-agent-mode.md) |

---

## 🎯 快速上下文

> **一句话描述**: 支持状态持久化、恢复、重试的跨页面工具集执行引擎

### 价值主张
- **用户问题**: 跨页面执行中断后无法恢复
- **技术价值**: 状态持久化 + 自动重试 + 事件驱动
- **业务影响**: 支持复杂多步骤自动化场景

### 边界定义
**包含**:
- ✅ 顺序执行工具集
- ✅ 状态持久化到 chrome.storage
- ✅ 跨页面自动恢复
- ✅ 可配置重试策略
- ✅ 进度事件回调

**不包含**:
- ❌ AI 决策逻辑（由 AIAgent 负责）
- ❌ 并行执行

---

## 🔗 关联资源

| 类型 | 路径/链接 | 说明 |
|------|----------|------|
| **实现文件** | `packages/sdk/src/engine/index.ts` | 执行引擎实现 |
| **类型定义** | `packages/sdk/src/types/execution.ts` | 类型定义 |
| **编排器** | `src/background/orchestrator.ts` | 跨页面协调 |
| **导航原语** | `packages/sdk/src/primitives/navigate.ts` | NAVIGATE 实现 |
| **相关 Spec** | [ai-agent-mode.md](../features/ai-agent-mode.md) | AI Agent 模式 |

---

## 🏗️ 技术设计

### 架构位置

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    执行引擎架构                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   AIAgent   │         │   Orchestr  │         │  Content     │
│   (可选)     │ ──────▶ │   Engine    │ ──────▶ │   Script     │
└─────────────┘         └──────┬──────┘         └─────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
            ┌─────────────┐       ┌─────────────┐
            │ chrome.storage│       │   Message   │
            │   (状态)     │       │   (通信)    │
            └─────────────┘       └─────────────┘
```

### 模块划分

| 模块 | 职责 | 位置 | 状态 |
|------|------|------|------|
| ExecutionEngine | 状态管理、执行控制 | `packages/sdk/src/engine/` | ✅ Implemented |
| Orchestrator | 跨页面协调 | `src/background/orchestrator.ts` | ✅ Implemented |
| NAVIGATE | 页面跳转处理 | `packages/sdk/src/primitives/navigate.ts` | ✅ Updated |

### 状态流转

```
idle → running → paused → running → ... → completed
                  ↓
                failed
```

---

## 📝 类型定义

### 执行状态

```typescript
// packages/sdk/src/types/execution.ts

/**
 * 执行状态（支持持久化）
 */
export interface ExecutionState {
  /** 唯一标识 */
  id: string;

  /** 执行模式 */
  mode: 'sequential' | 'agent' | 'interactive';

  /** 当前工具索引 */
  currentIndex: number;

  /** 工具列表 */
  tools: ToolExecution[];

  /** 变量上下文 */
  variables: Record<string, unknown>;

  /** 执行历史 */
  history: ExecutionStep[];

  /** 状态 */
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';

  /** 开始时间 */
  startTime: string;

  /** 最后更新时间 */
  lastUpdate: string;

  /** 当前 URL（跨页面恢复用） */
  currentUrl?: string;

  /** 当前 Tab ID */
  tabId?: number;
}

/**
 * 工具执行状态
 */
export interface ToolExecution {
  /** 工具定义 */
  tool: AtomicTool;

  /** 参数 */
  params: Record<string, unknown>;

  /** 执行状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

  /** 执行结果 */
  result?: ExecuteToolResult;

  /** 重试次数 */
  retryCount: number;

  /** 执行时间戳 */
  timestamp?: string;
}
```

### 执行配置

```typescript
/**
 * 执行配置
 */
export interface ExecutionConfig {
  /** 最大重试次数 */
  maxRetries?: number;

  /** 重试延迟（毫秒） */
  retryDelay?: number;

  /** 超时时间（毫秒） */
  timeout?: number;

  /** 失败策略 */
  failureStrategy?: 'stop' | 'continue' | 'retry';

  /** 调试模式 */
  debug?: boolean;

  /** 进度回调 */
  onProgress?: (state: ExecutionState) => void;

  /** 完成回调 */
  onComplete?: (state: ExecutionState) => void;

  /** 错误回调 */
  onError?: (error: ExecutionError, state: ExecutionState) => void;

  /** 暂停回调（如需要用户介入） */
  onPaused?: (reason: string, state: ExecutionState) => void;
}
```

---

## 🔌 API 设计

### 创建执行引擎

```typescript
/**
 * 工厂函数：创建执行引擎
 *
 * @param config - 执行配置
 * @returns 执行引擎实例
 */
export function createExecutionEngine(
  config?: ExecutionConfig
): ExecutionEngine;
```

### ExecutionEngine 类

```typescript
/**
 * 执行引擎
 *
 * 管理工具集的执行，支持状态持久化、恢复、重试
 */
export class ExecutionEngine {
  constructor(config?: ExecutionConfig);

  /**
   * 开始执行工具集
   *
   * @param tools - 工具列表
   * @param initialVariables - 初始变量
   * @returns 执行状态
   */
  async execute(
    tools: Array<{ tool: AtomicTool; params: Record<string, unknown> }>,
    initialVariables?: Record<string, unknown>
  ): Promise<ExecutionState>;

  /**
   * 恢复执行
   *
   * @returns 执行状态
   */
  async resume(): Promise<ExecutionState>;

  /**
   * 暂停执行
   */
  pause(): void;

  /**
   * 取消执行
   */
  cancel(): void;

  /**
   * 获取当前状态
   *
   * @returns 当前执行状态
   */
  getState(): ExecutionState | null;

  /**
   * 更新变量上下文
   *
   * @param variables - 要更新的变量
   */
  updateVariables(variables: Record<string, unknown>): void;
}
```

### 状态存储

```typescript
/**
 * 从存储加载执行状态
 *
 * @returns 执行状态或 null
 */
export async function loadExecutionState(): Promise<ExecutionState | null>;

/**
 * 清除存储的执行状态
 */
export async function clearExecutionState(): Promise<void>;
```

---

## 🔄 工作流

### 正常执行流程

```
┌─────────────────────────────────────────────────────────────┐
│                    执行引擎正常流程                            │
└─────────────────────────────────────────────────────────────┘

                    ┌───────────────┐
                    │   开始执行     │
                    └───────┬───────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  初始化 ExecutionState │
                │  保存到 chrome.storage │
                └───────────┬───────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  遍历 tools 列表       │
                └───────────┬───────────┘
                            │
                ┌───────────┴─────────────┐
                │                         │
            有下一个                    无下一个
                │                         │
                ▼                         ▼
    ┌───────────────────┐      ┌───────────────┐
    │ executeWithRetry  │      │ status=completed │
    └─────────┬─────────┘      └───────────────┘
              │
              ▼
    ┌───────────────────┐
    │ 更新 ToolExecution │
    │ 记录 ExecutionStep │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │ 检查 pageNavigated │
    └─────────┬─────────┘
              │
      ┌───────┴───────┐
      │               │
   已跳转           未跳转
      │               │
      ▼               ▼
┌───────────┐   ┌───────────────┐
│status=paused │   │  保存状态     │
│  返回      │   │  继续下一个   │
└───────────┘   └───────────────┘
```

### 跨页面恢复流程

```
┌─────────────────────────────────────────────────────────────┐
│                    跨页面恢复流程                              │
└─────────────────────────────────────────────────────────────┘

    [Content Script]          [Background]             [Chrome]
          │                        │                       │
          │  NAVIGATE 操作          │                       │
          ├───────────────────────▶│                       │
          │                        │                       │
          │                        │  chrome.tabs.update   │
          │                        ├──────────────────────▶│
          │                        │                       │
          │  [页面刷新]              │                       │
          │  [Content Script 重启]  │                       │
          │                        │                       │
          │                        │  tab.onUpdated        │
          │                        │◀──────────────────────│
          │                        │                       │
          │                        │  检查 paused 状态     │
          │                        │                       │
          │                        │  resumeExecution()    │
          │                        │                       │
          │  EXECUTE_TOOL          │                       │
          │◀───────────────────────│                       │
          │                        │                       │
          │  ExecuteToolResult     │                       │
          ├───────────────────────▶│                       │
          │                        │                       │
          │                        │  继续执行或恢复        │
```

### 重试逻辑

```
┌─────────────────────────────────────────────────────────────┐
│                    重试决策逻辑                               │
└─────────────────────────────────────────────────────────────┘

              executeWithRetry()
                     │
                     ▼
         ┌───────────────────────┐
         │   for (attempt = 0)    │
         │   to maxRetries        │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   executeTool()       │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
     success                   failure
         │                       │
         ▼                       ▼
 ┌─────────────┐     ┌─────────────────────┐
 │  return     │     │  isRetryableError?  │
 └─────────────┘     └──────────┬──────────┘
                               │
                       ┌───────┴───────┐
                       │               │
                    可重试          不可重试
                       │               │
                       ▼               ▼
              ┌─────────────┐   ┌─────────────┐
              │attempt < max?│   │  return     │
              └──────┬──────┘   └─────────────┘
                     │
             ┌───────┴───────┐
             │               │
          是               否
             │               │
             ▼               ▼
    ┌─────────────┐   ┌─────────────┐
    │ delay()     │   │  return     │
    │ continue    │   └─────────────┘
    └─────────────┘
```

### 错误处理

| 场景 | 处理 | 返回 |
|------|------|------|
| 可重试错误（TIMEOUT, TARGET_NOT_FOUND） | 自动重试 | 继续执行 |
| 不可重试错误 | 根据 failureStrategy 决定 | stop/continue |
| 页面跳转 | 暂停并保存状态 | ExecutionState.status = 'paused' |
| 超过最大重试次数 | 返回失败 | result.success = false |

---

## ✅ 验收标准

### 功能验收
- [x] 顺序执行工具集
- [x] 状态持久化到 chrome.storage
- [x] 跨页面自动恢复
- [x] 可配置重试策略
- [x] 进度事件回调
- [x] 支持暂停/恢复/取消

### 质量验收
- [x] `npm run typecheck` 通过
- [x] `npm run lint` 通过
- [x] 无类型冲突

### 文档验收
- [x] JSDoc 注释完整
- [x] Spec 状态更新为 Implemented

---

## 🧪 使用示例

### 基本使用

```typescript
import { createExecutionEngine } from '@homura/sdk/engine';

const engine = createExecutionEngine({
  maxRetries: 3,
  retryDelay: 1000,
  failureStrategy: 'continue',
  onProgress: (state) => {
    console.log('进度:', state.currentIndex, '/', state.tools.length);
  },
  onComplete: (state) => {
    console.log('完成', state);
  },
  onError: (error, state) => {
    console.error('错误', error);
  }
});

const state = await engine.execute([
  { tool: tool1, params: { name: 'test' } },
  { tool: tool2, params: {} },
]);
```

### 跨页面恢复

```typescript
// 执行第一个工具（包含 NAVIGATE）
const state1 = await engine.execute([
  { tool: navigateTool, params: { url: 'https://example.com' } },
  { tool: tool2, params: {} },
]);

// state1.status === 'paused'

// 页面加载后，恢复执行
const state2 = await engine.resume();
// 继续执行 tool2
```

### 暂停和取消

```typescript
const engine = createExecutionEngine({
  onPaused: (reason, state) => {
    console.log('暂停:', reason);
    // 用户处理后恢复
    engine.resume();
  }
});

// 执行
const promise = engine.execute(tools);

// 中途取消
// engine.cancel();
```

---

## 📚 决策记录 (ADR)

| 决策 | 选择方案 | 理由 | 日期 |
|------|---------|------|------|
| 状态存储 | chrome.storage.local | 跨 Service Worker 重启持久化 | 2026-03-24 |
| 重试错误码 | TIMEOUT, TARGET_NOT_FOUND, ACTION_FAILED | 可恢复的错误类型 | 2026-03-24 |
| 导航处理 | 通过 background 执行 | 避免 content script 中断 | 2026-03-24 |

---

## 📅 变更历史

| 日期 | 时间 | 版本 | 变更说明 | 作者 |
|------|------|------|----------|------|
| 2026-03-24 | 14:30 | 0.1.0 | 初始版本 | @claude |
| 2026-03-24 | 16:00 | 1.0.0 | 实现完成 | @claude |

---

## 📚 相关文档

- [ai-agent-mode.md](../features/ai-agent-mode.md) - AI Agent 模式
- [sdk-architecture.md](./sdk-architecture.md) - SDK 架构
- [DEVELOPMENT.md](../../DEVELOPMENT.md) - 开发规范
