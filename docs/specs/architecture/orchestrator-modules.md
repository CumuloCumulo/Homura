# Orchestrator 模块化架构

## 📄 元信息

| 字段 | 值 |
|------|-----|
| 状态 | Implemented |
| 版本 | 1.0.0 |
| 创建时间 | 2026-03-25 |
| 作者 | Claude Code |

---

## 🎯 快速上下文

> **一句话描述**: 将 Orchestrator 拆分为专注的模块，提升可维护性和可测试性

- **用户问题**: orchestrator.ts 464 行，职责过多，难以维护
- **技术价值**: 单一职责原则，每个模块专注一个功能
- **业务影响**: 减少 bug，加速开发

---

## 🏗️ 模块架构

```
src/background/
├── config.ts                    # 集中配置管理
└── orchestration/
    ├── index.ts                 # 主入口，协调各模块
    ├── simple-executor.ts      # 简单模式执行器（固定延迟）
    ├── state-manager.ts         # 执行状态管理
    ├── tab-tracker.ts           # Tab 追踪和切换
    ├── retry-manager.ts         # 重试逻辑
    └── content-script-manager.ts # Content Script 注入
```

---

## 📦 模块职责

### 1. Config (`config.ts`)

集中管理所有配置常量，避免硬编码。

```typescript
export const CONFIG = {
  TIMEOUT: {
    ELEMENT_FIND: 15000,
    DOM_STABILITY: 10000,
    PAGE_READY: 10000,
    CONTENT_SCRIPT_READY: 5000,
  },
  RETRY: {
    MAX_ATTEMPTS: 5,
    DELAYS: [200, 400, 800, 1500, 3000],
  },
  DELAY: {
    SAME_TAB_TOOL: 1000,
    NEW_TAB_CONTEXT: 1500,
    POST_INJECTION: 500,
  },
  POLLING: {
    STATE_CHECK: 500,
    CONTENT_SCRIPT: 200,
  },
  STORAGE: {
    EXECUTION_STATE: "homura_execution_state",
    CURRENT_TOOLKIT: "homura_current_toolkit",
  },
};
```

### 2. StateManager (`state-manager.ts`)

单一状态源，自动持久化到 chrome.storage。

```typescript
class ExecutionStateManager {
  private state: ExecutionState | null = null;

  getState(): ExecutionState | null;
  load(): Promise<ExecutionState | null>;
  update(updates: Partial<ExecutionState>): Promise<void>;
  setState(state: ExecutionState): Promise<void>;
  clear(): Promise<void>;
  isRunning(): boolean;
  isPaused(): boolean;
}
```

### 3. TabTracker (`tab-tracker.ts`)

追踪 tab 切换，检测新 tab。

```typescript
class TabTracker {
  detectNewTab(currentTabId: number): Promise<chrome.tabs.Tab | null>;
  waitForTabReady(tabId: number, timeout?: number): Promise<boolean>;
  isInternalPage(tab: chrome.tabs.Tab): boolean;
  getActiveTab(): Promise<chrome.tabs.Tab | undefined>;
}
```

### 4. RetryManager (`retry-manager.ts`)

管理工具执行的重试逻辑。

```typescript
class RetryManager {
  executeWithRetry(
    tabId: number,
    tool: AtomicTool,
    params: Record<string, string | number | boolean>,
    maxRetries?: number
  ): Promise<ExecuteToolResult>;

  isContentScriptNotReadyError(message: string): boolean;
}
```

### 5. ContentScriptManager (`content-script-manager.ts`)

管理 content script 的注入和就绪检查。

```typescript
class ContentScriptManager {
  waitForReady(tabId: number, timeout?: number): Promise<boolean>;
  private tryInject(tabId: number): Promise<boolean>;
}
```

### 6. SimpleExecutor (`simple-executor.ts`)

轻量级顺序执行器，用于简单模式的快速测试。

```typescript
class SimpleExecutor {
  start(
    tools: Array<{ tool: AtomicTool; params: Record<string, unknown> }>,
    tabId: number,
    config: SimpleExecutionConfig
  ): Promise<SimpleExecutorState>;

  cancel(): Promise<void>;
  getState(): SimpleExecutorState | null;
  toExecutionState(): ExecutionState | null;
}
```

**特点**：
- 固定延迟顺序执行（默认 2000ms）
- 快速失败（无重试）
- 无页面导航支持
- 无状态持久化

---

## 🔄 工作流

### 执行流程

```
1. startExecution()
   ├─► StateManager.setState()
   └─► executeNextTool()

2. executeNextTool()
   ├─► StateManager.getState()
   ├─► RetryManager.executeWithRetry()
   └─► handleToolResult()

3. handleToolResult()
   ├─► StateManager.update()
   ├─► TabTracker.detectNewTab()
   └─► ContentScriptManager.waitForReady() (if new tab)
```

### 恢复流程

```
1. chrome.tabs.onUpdated
   └─► handleTabUpdate()
       └─► resumeExecution()
           └─► executeNextTool()
```

---

## ✅ 验收标准

### 功能验收

- [x] 所有模块独立可测试
- [x] 配置集中管理，无硬编码
- [x] 状态自动持久化
- [x] Tab 切换正确追踪
- [x] 重试逻辑工作正常
- [x] Content Script 注入正确

### 质量验收

- [x] 类型检查通过
- [x] 无循环依赖
- [x] 每个模块 < 150 行

---

## 🔗 关联资源

| 类型 | 路径 |
|------|------|
| 配置 | `src/background/config.ts` |
| 状态管理 | `src/background/orchestration/state-manager.ts` |
| Tab 追踪 | `src/background/orchestration/tab-tracker.ts` |
| 重试管理 | `src/background/orchestration/retry-manager.ts` |
| Content Script | `src/background/orchestration/content-script-manager.ts` |
| 主入口 | `src/background/orchestration/index.ts` |
| 向后兼容 | `src/background/orchestrator.ts` |

---

## 📅 变更历史

| 日期 | 版本 | 变更说明 |
|------|------|----------|
| 2026-03-25 | 1.0.0 | 初始版本，完成模块化重构 |
| 2026-03-27 | 1.1.0 | 添加 SimpleExecutor 模块（双模式执行器） |
