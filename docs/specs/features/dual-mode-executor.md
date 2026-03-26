# Dual-Mode Sequential Test Executor

> 🎯 **核心理念**: 提供两种执行模式以适应不同测试场景 - 简单模式用于快速测试，高级模式用于生产环境

---

## 📄 元信息

| 字段 | 值 |
|------|-----|
| **创建时间** | 2026-03-26 |
| **状态** | 🚧 In Progress |
| **优先级** | P0 |
| **负责人** | @claude |
| **相关 Spec** | [execution-engine.md](../architecture/execution-engine.md) |

---

## 🎯 快速上下文

### 用户问题
当前 Orchestrator 功能强大但复杂，在测试同页面工作流时过于重量级。用户需要一个轻量级的快速测试模式。

### 解决方案
提供两种执行模式：
1. **简单模式 (Simple Mode)** - 固定延迟顺序执行，适合快速测试
2. **高级模式 (Advanced Mode)** - 完整 Orchestrator，支持跨页面和恢复

### 价值主张
- **非破坏性** - 简单模式可立即用于基础测试
- **渐进式** - 可并行开发高级模式
- **用户选择** - 用户根据场景选择合适的模式
- **易于回退** - 高级模式出问题时可使用简单模式

---

## 🏗️ 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     Dual-Mode Executor                          │
└─────────────────────────────────────────────────────────────────┘

                       ┌─────────────┐
                       │ TestPanel   │
                       │ (UI)        │
                       └──────┬──────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
           ┌─────────────────┐   ┌─────────────────┐
           │  Simple Mode    │   │ Advanced Mode   │
           │  Executor       │   │ Orchestrator    │
           └────────┬────────┘   └────────┬────────┘
                    │                     │
                    │                     │
                    ▼                     ▼
           ┌─────────────────┐   ┌─────────────────┐
           │ Fixed Delays    │   │ Page Readiness  │
           │ No Recovery     │   │ Auto Recovery   │
           │ Fail Fast       │   │ State Persist   │
           └─────────────────┘   └─────────────────┘
```

### 模式对比

| 特性 | 简单模式 | 高级模式 |
|------|----------|----------|
| 执行方式 | 固定延迟 | 智能等待 |
| 页面导航 | 不支持 | 完整支持 |
| 状态恢复 | 无 | 持久化 |
| 重试机制 | 无 | 指数退避 |
| 复杂度 | 低 | 高 |
| 适用场景 | 同页面快速测试 | 跨页面生产环境 |

---

## 📝 类型定义

### 执行模式

```typescript
/**
 * 执行模式
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
  /** 页面导航超时（毫秒） */
  pageNavigationTimeout?: number;
  /** Content Script 超时（毫秒） */
  contentScriptTimeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
}

/**
 * 执行配置（联合类型）
 */
export type ExecutionModeConfig = SimpleExecutionConfig | AdvancedExecutionConfig;
```

### 更新 ExecutionState

```typescript
// 在 packages/sdk/src/types/execution.ts 中添加

export interface ExecutionState {
  // ... 现有字段

  /** 执行模式（新增） */
  executionMode: ExecutionMode;

  /** 执行配置（新增） */
  config?: ExecutionModeConfig;
}
```

---

## 🔌 API 设计

### Simple Executor

```typescript
/**
 * 简单执行器 - 轻量级顺序执行
 *
 * @file src/background/orchestration/simple-executor.ts
 */

export interface SimpleExecutorState {
  id: string;
  currentIndex: number;
  tools: Array<{
    tool: AtomicTool;
    params: Record<string, unknown>;
  }>;
  status: 'idle' | 'running' | 'completed' | 'failed';
  results: Array<{
    toolId: string;
    toolName: string;
    result: ExecuteToolResult;
    timestamp: string;
  }>;
}

/**
 * 简单执行器类
 */
export class SimpleExecutor {
  private state: SimpleExecutorState | null = null;
  private defaultToolDelay: number = 2000;

  /**
   * 开始执行
   */
  async start(
    tools: Array<{ tool: AtomicTool; params: Record<string, unknown> }>,
    tabId: number,
    config?: SimpleExecutionConfig
  ): Promise<SimpleExecutorState>;

  /**
   * 取消执行
   */
  async cancel(): Promise<void>;

  /**
   * 获取当前状态
   */
  getState(): SimpleExecutorState | null;
}
```

### 消息协议

```typescript
/**
 * 更新后台消息类型
 *
 * @file src/background/index.ts
 */

interface HomuraStartExecutionMessage {
  type: 'HOMURA_START_EXECUTION';
  payload: {
    tools: Array<{ tool: AtomicTool; params: Record<string, unknown> }>;
    tabId: number;
    /** 执行模式（新增） */
    mode?: ExecutionMode;
    /** 执行配置（新增） */
    config?: ExecutionModeConfig;
  };
}
```

---

## 🔄 工作流

### 简单模式执行流程

```
┌─────────────────────────────────────────────────────────────┐
│                    简单模式执行流程                            │
└─────────────────────────────────────────────────────────────┘

                    ┌───────────────┐
                    │  开始执行      │
                    └───────┬───────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  初始化 SimpleExecutor │
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
    │ executeTool()     │      │ status=completed │
    │  (直接调用)        │      └───────────────┘
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │ 记录结果           │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │ sleep(toolDelay)  │
    │  (固定延迟)        │
    └─────────┬─────────┘
              │
              ▼
        [继续下一个]

    失败时立即停止，不重试
```

### 高级模式执行流程

```
┌─────────────────────────────────────────────────────────────┐
│                    高级模式执行流程                            │
└─────────────────────────────────────────────────────────────┘

使用现有 Orchestrator 逻辑：
- 页面就绪检测
- 状态持久化
- 自动恢复
- 指数退避重试
```

---

## 📋 实施计划

### Phase 1: 添加模式选择到类型定义

**文件**: `packages/sdk/src/types/execution.ts`

**任务**:
- [ ] 添加 `ExecutionMode` 类型
- [ ] 添加 `SimpleExecutionConfig` 接口
- [ ] 添加 `AdvancedExecutionConfig` 接口
- [ ] 更新 `ExecutionState` 添加 `executionMode` 和 `config` 字段
- [ ] 运行 `npm run check:duplicates` 验证无类型冲突

### Phase 2: 实现简单执行器

**文件**: `src/background/orchestration/simple-executor.ts`

**任务**:
- [ ] 创建 `SimpleExecutor` 类
- [ ] 实现 `start()` 方法 - 顺序执行工具
- [ ] 实现 `cancel()` 方法 - 取消执行
- [ ] 实现 `getState()` 方法 - 获取状态
- [ ] 添加固定延迟逻辑
- [ ] 添加错误处理（失败立即停止）
- [ ] 添加详细日志输出

### Phase 3: 添加模式选择 UI

**文件**: `src/sidepanel/components/TestPanel.tsx`

**任务**:
- [ ] 添加执行模式下拉选择器
- [ ] 简单模式：显示"工具间隔"设置
- [ ] 高级模式：显示高级设置（如有）
- [ ] 保存模式选择到 toolkit metadata
- [ ] 更新启动逻辑传递模式和配置

### Phase 4: 路由到正确执行器

**文件**: `src/background/index.ts`

**任务**:
- [ ] 更新 `HomuraStartExecutionMessage` 接口
- [ ] 在 `handleMessage` 中添加模式路由
- [ ] 简单模式 → `simpleExecutor.start()`
- [ ] 高级模式 → `orchestrator.startExecution()`
- [ ] 添加状态查询路由

### Phase 5: 更新状态查询

**文件**: `src/sidepanel/components/TestPanel.tsx`

**任务**:
- [ ] 更新 `HOMURA_GET_STATE` 处理
- [ ] 简单模式：查询 `simpleExecutor.getState()`
- [ ] 高级模式：查询 `orchestrator.getState()`
- [ ] 统一状态格式用于 UI 显示

### Phase 6: 增强高级模式（可选）

**任务**:
- [ ] 实现多信号页面就绪检测
- [ ] 增强状态管理器恢复逻辑
- [ ] 添加主动轮询恢复
- [ ] 添加性能监控

---

## 🎨 UI 设计

### 模式选择器

```typescript
// TestPanel.tsx

<div className="mb-3">
  <label className="text-xs text-zinc-400 mb-1 block">执行模式</label>
  <select
    value={executionMode}
    onChange={(e) => setExecutionMode(e.target.value as ExecutionMode)}
    className="w-full px-2 py-1.5 text-xs bg-zinc-800 text-zinc-300 rounded border border-white/10"
  >
    <option value="simple">简单模式 - 快速测试</option>
    <option value="advanced">高级模式 - 完整功能</option>
  </select>
</div>

{executionMode === 'simple' && (
  <div className="mb-3">
    <label className="text-xs text-zinc-400 mb-1 block">工具间隔 (ms)</label>
    <input
      type="number"
      value={toolDelay}
      onChange={(e) => setToolDelay(Number(e.target.value))}
      className="w-full px-2 py-1.5 text-xs bg-zinc-800 text-zinc-300 rounded border border-white/10"
      min="500"
      max="10000"
      step="500"
    />
    <p className="text-[9px] text-zinc-600 mt-1">
      简单模式使用固定延迟，不支持跨页面执行
    </p>
  </div>
)}
```

---

## ✅ 验收标准

### 功能验收

#### 简单模式
- [ ] 顺序执行所有工具
- [ ] 使用固定延迟间隔
- [ ] 失败时立即停止
- [ ] 不支持跨页面执行
- [ ] 不持久化状态

#### 高级模式
- [ ] 保持现有功能完整
- [ ] 支持跨页面执行
- [ ] 支持状态恢复
- [ ] 支持自动重试

#### UI
- [ ] 可以切换执行模式
- [ ] 简单模式显示工具间隔设置
- [ ] 高级模式显示相应配置
- [ ] 模式选择保存到 toolkit metadata

### 质量验收
- [ ] `npm run typecheck` 通过
- [ ] `npm run lint` 通过
- [ ] `npm run check:duplicates` 通过
- [ ] `npm run check:imports` 通过

### 性能验收
- [ ] 简单模式启动时间 < 100ms
- [ ] 高级模式保持现有性能

---

## 🧪 测试场景

### 简单模式测试

1. **同页面工作流**
   - 创建多个工具在同一页面
   - 使用简单模式执行
   - 验证按顺序执行
   - 验证使用固定延迟

2. **失败处理**
   - 创建一个会失败的工具
   - 验证立即停止
   - 验证不重试

3. **取消执行**
   - 启动简单模式
   - 中途取消
   - 验证立即停止

### 高级模式测试

1. **跨页面工作流**
   - 创建包含导航的工具集
   - 验证页面切换后恢复执行

2. **状态恢复**
   - 执行中关闭扩展
   - 重新打开后验证状态恢复

### 模式切换测试

1. **切换模式**
   - 简单模式执行成功
   - 切换到高级模式
   - 验证使用不同执行器

---

## 📚 决策记录 (ADR)

| 决策 | 选择方案 | 理由 | 日期 |
|------|---------|------|------|
| 默认模式 | 简单模式 | 降低使用门槛，快速反馈 | 2026-03-26 |
| 简单模式重试 | 无重试 | 保持简单，失败快速反馈 | 2026-03-26 |
| 模式存储 | Per-toolkit metadata | 不同工具集可能有不同需求 | 2026-03-26 |
| 固定延迟 | 默认 2000ms | 平衡速度和稳定性 | 2026-03-26 |

---

## 📅 变更历史

| 日期 | 版本 | 变更说明 | 作者 |
|------|------|----------|------|
| 2026-03-26 | 0.1.0 | 初始版本 | @claude |

---

## 📚 相关文档

- [execution-engine.md](../architecture/execution-engine.md) - 执行引擎架构
- [DEVELOPMENT.md](../../DEVELOPMENT.md) - 开发规范
- [orchestrator-modules.md](../architecture/orchestrator-modules.md) - Orchestrator 模块
