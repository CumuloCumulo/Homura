# Dual-Mode Executor - Implementation Plan

> 📋 **实施计划**: 按阶段实现双模式执行器

---

## 🎯 总体策略

### 核心原则
1. **非破坏性** - 简单模式独立实现，不影响现有高级模式
2. **渐进式** - 先实现简单模式，再增强高级模式
3. **可测试** - 每个阶段都可独立测试验证

### 实施顺序
```
Phase 1: 类型定义
    ↓
Phase 2: 简单执行器 (Simple Executor)
    ↓
Phase 3: UI 模式选择
    ↓
Phase 4: 后台路由
    ↓
Phase 5: 测试验证
    ↓
Phase 6: 高级模式增强 (可选)
```

---

## Phase 1: 类型定义 (1-2 hours)

### 目标
添加执行模式相关类型，不破坏现有类型系统。

### 文件变更

#### 1.1 更新 execution.ts

**文件**: `packages/sdk/src/types/execution.ts`

```typescript
// ============================================================================
// Execution Mode (新增)
// ============================================================================

/**
 * 执行模式
 *
 * - simple: 简单模式 - 固定延迟顺序执行，适合快速测试
 * - advanced: 高级模式 - 完整 orchestrator，支持跨页面和恢复
 */
export type ExecutionMode = 'simple' | 'advanced';

/**
 * 简单模式配置
 */
export interface SimpleExecutionConfig {
  mode: 'simple';
  /** 工具间延迟（毫秒），默认 2000ms */
  toolDelay: number;
}

/**
 * 高级模式配置
 */
export interface AdvancedExecutionConfig {
  mode: 'advanced';
  /** 页面导航超时（毫秒），默认 10000ms */
  pageNavigationTimeout?: number;
  /** Content Script 超时（毫秒），默认 5000ms */
  contentScriptTimeout?: number;
  /** 最大重试次数，默认 5 */
  maxRetries?: number;
}

/**
 * 执行配置（联合类型）
 */
export type ExecutionModeConfig = SimpleExecutionConfig | AdvancedExecutionConfig;
```

#### 1.2 更新 ExecutionState

```typescript
// 在 packages/sdk/src/types/execution.ts 中的 ExecutionState 接口添加

export interface ExecutionState {
  id: string;
  mode: 'sequential' | 'agent' | 'interactive';
  currentIndex: number;
  tools: ToolExecution[];
  variables: Record<string, unknown>;
  history: ExecutionStep[];
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  startTime: string;
  lastUpdate: string;
  currentUrl?: string;
  tabId?: number;

  // 新增字段
  /** 执行模式 */
  executionMode: ExecutionMode;
  /** 执行配置 */
  config?: ExecutionModeConfig;
}
```

### 验证步骤

```bash
# 1. 检查类型冲突
npm run check:duplicates

# 2. 类型检查
npm run typecheck

# 3. Lint 检查
npm run lint
```

### 验收标准
- [ ] 所有类型定义添加完成
- [ ] `npm run check:duplicates` 通过
- [ ] `npm run typecheck` 通过
- [ ] 不影响现有代码

---

## Phase 2: 简单执行器 (2-3 hours)

### 目标
实现轻量级的简单执行器，支持固定延迟顺序执行。

### 文件变更

#### 2.1 创建 Simple Executor

**新文件**: `src/background/orchestration/simple-executor.ts`

```typescript
/**
 * =============================================================================
 * Simple Executor - 轻量级顺序执行器
 * =============================================================================
 *
 * 简单模式执行器：
 * - 固定延迟顺序执行
 * - 失败立即停止
 * - 不支持跨页面
 * - 不持久化状态
 */

import type { AtomicTool, ExecuteToolResult } from '@homura/sdk/types';
import { sleep } from '@homura/sdk/utils';
import { executeTool } from '../messaging';

// ============================================================================
// Types
// ============================================================================

export interface SimpleExecutionConfig {
  mode: 'simple';
  toolDelay: number;
}

export interface SimpleToolExecution {
  tool: AtomicTool;
  params: Record<string, unknown>;
}

export interface SimpleExecutorState {
  id: string;
  currentIndex: number;
  tools: SimpleToolExecution[];
  status: 'idle' | 'running' | 'completed' | 'failed';
  results: SimpleExecutionResult[];
  startTime: string;
  lastUpdate: string;
}

export interface SimpleExecutionResult {
  toolId: string;
  toolName: string;
  result: ExecuteToolResult;
  timestamp: string;
}

// ============================================================================
// Simple Executor Class
// ============================================================================

export class SimpleExecutor {
  private state: SimpleExecutorState | null = null;
  private defaultToolDelay: number = 2000;

  /**
   * 开始执行
   */
  async start(
    tools: SimpleToolExecution[],
    tabId: number,
    config?: Partial<SimpleExecutionConfig>
  ): Promise<SimpleExecutorState> {
    const id = this.generateExecutionId();
    const toolDelay = config?.toolDelay ?? this.defaultToolDelay;

    this.state = {
      id,
      currentIndex: 0,
      tools,
      status: 'running',
      results: [],
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
    };

    console.log('[SimpleExecutor] Starting execution:', {
      id,
      toolCount: tools.length,
      toolDelay,
    });

    // 执行所有工具
    for (let i = 0; i < tools.length; i++) {
      if (this.state.status === 'failed') {
        console.log('[SimpleExecutor] Execution failed, stopping');
        break;
      }

      this.state.currentIndex = i;
      this.state.lastUpdate = new Date().toISOString();

      const { tool, params } = tools[i];
      console.log(
        `[SimpleExecutor] Executing tool ${i + 1}/${tools.length}: ${tool.name}`,
      );

      try {
        const result = await executeTool(
          { tabId },
          tool,
          params as Record<string, string | number | boolean>,
        );

        this.state.results.push({
          toolId: tool.tool_id,
          toolName: tool.name,
          result,
          timestamp: new Date().toISOString(),
        });

        if (!result.success) {
          console.error('[SimpleExecutor] Tool failed:', result.error);
          this.state.status = 'failed';
          break;
        }

        // 工具间延迟（最后一个工具不需要延迟）
        if (i < tools.length - 1) {
          console.log(`[SimpleExecutor] Waiting ${toolDelay}ms...`);
          await sleep(toolDelay);
        }
      } catch (error) {
        console.error('[SimpleExecutor] Tool execution error:', error);
        this.state.status = 'failed';
        break;
      }
    }

    // 更新最终状态
    if (this.state.status !== 'failed') {
      this.state.status = 'completed';
      this.state.currentIndex = tools.length;
    }
    this.state.lastUpdate = new Date().toISOString();

    console.log('[SimpleExecutor] Execution finished:', {
      status: this.state.status,
      completed: this.state.results.length,
      total: tools.length,
    });

    return this.state;
  }

  /**
   * 取消执行
   */
  async cancel(): Promise<void> {
    if (this.state) {
      this.state.status = 'failed';
      this.state.lastUpdate = new Date().toISOString();
      console.log('[SimpleExecutor] Execution cancelled');
    }
  }

  /**
   * 获取当前状态
   */
  getState(): SimpleExecutorState | null {
    return this.state;
  }

  /**
   * 生成执行 ID
   */
  private generateExecutionId(): string {
    return `simple_exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const simpleExecutor = new SimpleExecutor();
```

### 验证步骤

```bash
# 1. 类型检查
npm run typecheck

# 2. Lint 检查
npm run lint
```

### 验收标准
- [ ] SimpleExecutor 类实现完整
- [ ] `npm run typecheck` 通过
- [ ] `npm run lint` 通过
- [ ] 支持固定延迟执行
- [ ] 失败立即停止
- [ ] 详细日志输出

---

## Phase 3: UI 模式选择 (2-3 hours)

### 目标
在 TestPanel 添加模式选择器和配置选项。

### 文件变更

#### 3.1 更新 TestPanel Store

**文件**: `src/sidepanel/stores/testStore.ts`

```typescript
// 在 TestStore 接口中添加

interface TestStore {
  // ... 现有字段

  /** 执行模式 */
  executionMode: ExecutionMode;
  /** 简单模式工具延迟 */
  simpleModeDelay: number;

  // ... 现有 actions

  /** 设置执行模式 */
  setExecutionMode: (mode: ExecutionMode) => void;
  /** 设置简单模式延迟 */
  setSimpleModeDelay: (delay: number) => void;
}

// 在 store 实现中添加

export const useTestStore = create<TestStore>((set) => ({
  // ... 现有初始值

  executionMode: 'simple',
  simpleModeDelay: 2000,

  // ... 现有 actions

  setExecutionMode: (mode) =>
    set({
      executionMode: mode,
      // 重置执行状态
      testStatus: 'idle',
      currentToolIndex: -1,
      executionId: null,
      results: [],
    }),

  setSimpleModeDelay: (delay) => set({ simpleModeDelay: delay }),
}));
```

#### 3.2 更新 TestPanel 组件

**文件**: `src/sidepanel/components/TestPanel.tsx`

```typescript
// 在 TestPanel 组件中添加模式选择 UI

// 在状态部分添加
const { executionMode, simpleModeDelay, setExecutionMode, setSimpleModeDelay } = useTestStore();

// 在 header 后添加模式选择器
<div className="p-4 border-b border-white/5">
  {/* 现有 header */}

  {/* 新增：执行模式选择 */}
  <div className="mb-3">
    <label className="text-xs text-zinc-400 mb-1 block">执行模式</label>
    <select
      value={executionMode}
      onChange={(e) => setExecutionMode(e.target.value as ExecutionMode)}
      className="w-full px-2 py-1.5 text-xs bg-zinc-800 text-zinc-300 rounded border border-white/10 focus:outline-none focus:border-violet-500"
      disabled={testStatus === 'running'}
    >
      <option value="simple">简单模式 - 快速测试</option>
      <option value="advanced">高级模式 - 完整功能</option>
    </select>
  </div>

  {/* 简单模式配置 */}
  {executionMode === 'simple' && (
    <div className="mb-3">
      <label className="text-xs text-zinc-400 mb-1 block">工具间隔 (ms)</label>
      <input
        type="number"
        value={simpleModeDelay}
        onChange={(e) => setSimpleModeDelay(Number(e.target.value))}
        className="w-full px-2 py-1.5 text-xs bg-zinc-800 text-zinc-300 rounded border border-white/10 focus:outline-none focus:border-violet-500"
        min="500"
        max="10000"
        step="500"
        disabled={testStatus === 'running'}
      />
      <p className="text-[9px] text-zinc-600 mt-1">
        简单模式使用固定延迟，适合同页面快速测试
      </p>
    </div>
  )}

  {/* 高级模式提示 */}
  {executionMode === 'advanced' && (
    <div className="mb-3">
      <p className="text-[9px] text-zinc-600">
        高级模式支持跨页面执行、状态恢复和自动重试
      </p>
    </div>
  )}

  {/* 现有按钮 */}
</div>;
```

#### 3.3 更新执行启动逻辑

```typescript
// 在 TestPanel.tsx 的 testSequence 函数中添加模式参数

const testSequence = async () => {
  // ... 现有代码

  // 发送执行请求到 background
  const response = await chrome.runtime.sendMessage({
    type: 'HOMURA_START_EXECUTION',
    payload: {
      tools: testState.tools.map((tool) => ({
        tool,
        params: {},
      })),
      tabId: tab.id,
      mode: executionMode, // 新增
      config: executionMode === 'simple' // 新增
        ? { mode: 'simple', toolDelay: simpleModeDelay }
        : { mode: 'advanced' },
    },
  });
};
```

### 验收标准
- [ ] UI 显示模式选择器
- [ ] 简单模式显示工具间隔设置
- [ ] 高级模式显示相应提示
- [ ] 执行时传递正确的模式和配置
- [ ] 运行中禁用模式切换

---

## Phase 4: 后台路由 (1-2 hours)

### 目标
更新后台消息处理，根据模式路由到不同执行器。

### 文件变更

#### 4.1 更新消息类型

**文件**: `src/background/index.ts`

```typescript
// 更新 HomuraStartExecutionMessage 接口

interface HomuraStartExecutionMessage {
  type: 'HOMURA_START_EXECUTION';
  payload: {
    tools: Array<{ tool: AtomicTool; params: Record<string, unknown> }>;
    tabId: number;
    mode?: ExecutionMode; // 新增
    config?: ExecutionModeConfig; // 新增
  };
}
```

#### 4.2 更新消息处理

```typescript
// 在 handleMessage 的 HOMURA_START_EXECUTION case 中

case 'HOMURA_START_EXECUTION': {
  const { mode = 'simple', config } = message.payload;
  console.log('[Background] Execution mode:', mode);

  if (mode === 'simple') {
    // 使用简单执行器
    const { simpleExecutor } = await import('./orchestration/simple-executor');
    const { clearExecutionState } = await import('./orchestrator');

    await clearExecutionState();
    const result = await simpleExecutor.start(
      message.payload.tools as Array<{
        tool: AtomicTool;
        params: Record<string, unknown>;
      }>,
      message.payload.tabId,
      config as SimpleExecutionConfig,
    );

    // 转换为 ExecutionState 格式以便 UI 兼容
    const executionState: ExecutionState = {
      id: result.id,
      mode: 'sequential',
      executionMode: 'simple',
      currentIndex: result.currentIndex,
      tools: result.tools.map((t) => ({
        tool: t.tool,
        params: t.params,
        status: 'pending',
        retryCount: 0,
      })),
      variables: {},
      history: result.results.map((r, i) => ({
        index: i,
        toolId: r.toolId,
        toolName: r.toolName,
        result: r.result,
        timestamp: r.timestamp,
      })),
      status: result.status as 'running' | 'completed' | 'failed',
      startTime: result.startTime,
      lastUpdate: result.lastUpdate,
      tabId: message.payload.tabId,
      config,
    };

    sendResponse(executionState);
  } else {
    // 使用 orchestrator
    const { startExecution, clearExecutionState } = await import('./orchestrator');
    await clearExecutionState();
    const result = await startExecution(
      message.payload.tools as Array<{
        tool: AtomicTool;
        params: Record<string, unknown>;
      }>,
      message.payload.tabId,
    );
    sendResponse(result);
  }
  break;
}
```

#### 4.3 更新状态查询

```typescript
// 在 HOMURA_GET_STATE case 中

case 'HOMURA_GET_STATE': {
  // 需要同时检查两个执行器的状态
  const orchestratorState = await (await import('./orchestrator')).loadExecutionState();
  const simpleState = await (await import('./orchestration/simple-executor')).simpleExecutor.getState();

  // 返回非空的状态
  const state = orchestratorState || simpleState;
  sendResponse(state);
  break;
}
```

### 验收标准
- [ ] 简单模式路由到 simpleExecutor
- [ ] 高级模式路由到 orchestrator
- [ ] 状态查询兼容两种模式
- [ ] 类型检查通过

---

## Phase 5: 测试验证 (2-3 hours)

### 目标
全面测试两种模式的正确性和边界情况。

### 测试场景

#### 5.1 简单模式测试

**场景 1: 同页面顺序执行**
```
1. 创建 3 个工具（click, fill, click）
2. 设置简单模式，延迟 2000ms
3. 启动执行
4. 验证：
   - 按顺序执行
   - 使用固定延迟
   - 结果正确记录
```

**场景 2: 失败停止**
```
1. 创建包含无效选择器的工具
2. 启动简单模式
3. 验证：
   - 失败时立即停止
   - 不执行后续工具
   - 错误信息正确显示
```

**场景 3: 取消执行**
```
1. 启动简单模式执行
2. 执行中途点击停止
3. 验证：
   - 立即停止
   - 状态更新为 failed
   - 不执行后续工具
```

**场景 4: 调整延迟**
```
1. 设置不同延迟值（500ms, 2000ms, 5000ms）
2. 验证：
   - 延迟时间正确
   - 工具间间隔符合设置
```

#### 5.2 高级模式测试

**场景 1: 跨页面执行**
```
1. 创建包含导航的工具集
2. 设置高级模式
3. 验证：
   - 页面切换后恢复执行
   - 状态持久化
```

**场景 2: 状态恢复**
```
1. 启动高级模式
2. 执行中刷新页面
3. 验证：
   - 状态正确恢复
   - 继续执行
```

#### 5.3 模式切换测试

```
1. 简单模式执行成功
2. 切换到高级模式
3. 执行相同工具集
4. 验证使用不同执行器
```

### 验收标准
- [ ] 所有简单模式场景通过
- [ ] 所有高级模式场景通过
- [ ] 模式切换正常工作
- [ ] 边界情况处理正确

---

## Phase 6: 高级模式增强 (可选，4-6 hours)

### 目标
增强高级模式的页面就绪检测和恢复能力。

### 任务列表

#### 6.1 多信号页面就绪检测

**文件**: `src/background/orchestration/page-readiness-detector.ts`

```typescript
/**
 * 页面就绪检测器
 *
 * 使用多种信号检测页面是否完全加载：
 * - DOM content loaded
 * - Visual completeness
 * - Network idle
 * - Element presence
 */
export class PageReadinessDetector {
  async waitForReady(
    tabId: number,
    config: ReadinessConfig
  ): Promise<ReadinessResult>;
}
```

#### 6.2 增强状态管理器

**文件**: `src/background/orchestration/state-manager.ts`

```typescript
// 添加主动恢复功能

export class StateManager {
  /**
   * 主动恢复 - 定期轮询检查状态
   */
  async startActiveRecovery(): Promise<void>;

  /**
   * 停止主动恢复
   */
  async stopActiveRecovery(): Promise<void>;
}
```

#### 6.3 更新 Orchestrator

**文件**: `src/background/orchestration/index.ts`

```typescript
// 集成新的页面就绪检测和主动恢复

import { PageReadinessDetector } from './page-readiness-detector';

// 在 executeNextTool 中使用
const ready = await PageReadinessDetector.waitForReady(tabId, config);
```

### 验收标准
- [ ] 多信号就绪检测工作正常
- [ ] 主动恢复机制有效
- [ ] 跨页面成功率提升

---

## 📊 进度跟踪

| 阶段 | 预计时间 | 状态 | 完成日期 |
|------|----------|------|----------|
| Phase 1: 类型定义 | 1-2h | 🚧 待开始 | - |
| Phase 2: 简单执行器 | 2-3h | 🚧 待开始 | - |
| Phase 3: UI 模式选择 | 2-3h | 🚧 待开始 | - |
| Phase 4: 后台路由 | 1-2h | 🚧 待开始 | - |
| Phase 5: 测试验证 | 2-3h | 🚧 待开始 | - |
| Phase 6: 高级增强 | 4-6h | 🚧 待开始 | - |

---

## 🎯 里程碑

### Milestone 1: 简单模式可用 (Phase 1-4)
- 可以选择简单模式
- 简单模式正常工作
- 基本测试通过

### Milestone 2: 完整功能 (Phase 5)
- 所有测试场景通过
- 两种模式稳定运行
- UI 交互流畅

### Milestone 3: 高级增强 (Phase 6)
- 高级模式性能提升
- 跨页面成功率 > 95%
- 主动恢复机制生效

---

## 📝 注意事项

1. **向后兼容** - 保持现有高级模式功能完整
2. **类型安全** - 所有新增代码必须有完整类型
3. **错误处理** - 简单模式也要有适当的错误处理
4. **日志输出** - 详细的日志便于调试
5. **性能** - 简单模式启动时间 < 100ms

---

## 🆘 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 简单模式状态格式不一致 | 高 | 中 | 统一转换为 ExecutionState |
| 高级模式被破坏 | 高 | 低 | 保持独立，不修改现有代码 |
| UI 复杂度增加 | 中 | 中 | 清晰的视觉层次 |
| 类型冲突 | 中 | 低 | 使用 check:duplicates 验证 |

---

## 📚 相关文档

- [dual-mode-executor.md](./dual-mode-executor.md) - 功能规范
- [execution-engine.md](../architecture/execution-engine.md) - 执行引擎架构
- [DEVELOPMENT.md](../../DEVELOPMENT.md) - 开发规范
