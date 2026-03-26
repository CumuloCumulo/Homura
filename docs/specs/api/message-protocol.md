# Message Protocol API 规范

## 📄 元信息

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 版本 | 0.1.0 |
| 创建时间 | 2026-03-24 17:30 |
| 作者 | Claude Code |
| 预计完成 | 2026-03-26 |

---

## 🎯 快速上下文

> **一句话描述**: 统一的 Chrome Extension 消息通信协议

- **用户问题**: 消息类型分散，缺乏统一的命名和结构规范
- **技术价值**: 类型安全的跨组件通信
- **业务影响**: 减少 90% 的消息相关 bug

---

## 🔗 关联资源

| 类型 | 路径 | 说明 |
|------|------|------|
| 类型定义 | `src/shared/types.ts` | 消息类型定义 |
| 消息处理 | `src/content/messageHandler.ts` | Content Script 处理 |
| 消息处理 | `src/background/index.ts` | Background 处理 |
| 工具函数 | `src/background/messaging.ts` | 消息发送工具 |

---

## 🏗️ 技术设计

### 消息流架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Homura 消息流                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────┐     chrome.runtime.sendMessage      ┌───────────────┐   │
│  │ Dashboard │ ──────────────────────────────────► │   Background  │   │
│  │           │ ◄────────────────────────────────── │  (Orchestrator)│   │
│  └───────────┘                                      └───────┬───────┘   │
│                                                              │          │
│                              chrome.tabs.sendMessage         │          │
│                                                              ▼          │
│  ┌───────────┐                                      ┌───────────────┐   │
│  │ SidePanel │ ◄───── storage.onChanged ──────────── │    Content    │   │
│  │           │ ────── runtime.sendMessage ─────────► │    Script     │   │
│  └───────────┘                                      └───────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 消息通道分类

| 通道 | 方向 | 用途 |
|------|------|------|
| **Runtime** | Background ↔ 所有页面 | 全局消息、状态同步 |
| **Tabs** | Background → 特定 Tab | 执行工具、页面操作 |
| **Storage** | 双向（事件驱动） | 状态持久化、跨页面同步 |

---

## 📝 类型定义

### 基础消息结构

```typescript
/**
 * 所有消息的基础接口
 * @template T - 消息类型字面量
 * @template P - 载荷类型
 */
interface Message<T extends MessageType, P = unknown> {
  /** 消息类型标识 */
  type: T;
  /** 消息载荷 */
  payload: P;
  /** 唯一消息 ID（用于请求-响应匹配） */
  messageId?: string;
}
```

### 消息类型枚举

```typescript
/**
 * 消息类型定义
 * 命名规范：SCREAMING_SNAKE_CASE
 */
type MessageType =
  // === 工具执行 ===
  | 'EXECUTE_TOOL'           // 执行原子工具
  | 'EXECUTE_TOOL_RESULT'    // 执行结果（响应）

  // === 调试工具 ===
  | 'HIGHLIGHT_ELEMENT'      // 高亮元素
  | 'CLEAR_HIGHLIGHTS'       // 清除高亮

  // === 页面状态 ===
  | 'PING'                   // 心跳检测
  | 'PONG'                   // 心跳响应

  // === 检查模式 ===
  | 'START_INSPECT'          // 开始元素检查
  | 'STOP_INSPECT'           // 停止元素检查
  | 'ELEMENT_SELECTED'       // 元素选中事件

  // === 录制模式 ===
  | 'START_RECORDING'        // 开始录制
  | 'STOP_RECORDING'         // 停止录制
  | 'ACTION_RECORDED'        // 动作录制事件

  // === 执行编排 ===
  | 'HOMURA_START_EXECUTION' // 开始连贯执行
  | 'HOMURA_RESUME_EXECUTION'// 恢复执行
  | 'HOMURA_GET_STATE'       // 获取执行状态
  | 'HOMURA_CANCEL_EXECUTION'// 取消执行
  | 'HOMURA_NAVIGATE'        // 页面导航

  // === 工具同步 ===
  | 'TOOL_UPDATED'           // 工具更新事件
  | 'TOOL_SYNCED'            // 工具同步完成

  // === 工具集传输 ===
  | 'SEND_TOOLKIT_TO_SIDEPANEL'; // 发送工具集到 SidePanel
```

---

## 🔌 API 设计

### 1. 工具执行 API

#### EXECUTE_TOOL

**方向**: Background → Content Script
**用途**: 在页面上执行原子工具

```typescript
interface ExecuteToolMessage {
  type: 'EXECUTE_TOOL';
  payload: {
    /** 要执行的工具 */
    tool: AtomicTool;
    /** 工具参数 */
    params: Record<string, string | number | boolean>;
    /** 调试模式 */
    debug?: boolean;
  };
  messageId: string;
}
```

**响应**:
```typescript
interface ExecuteToolResult {
  success: boolean;
  data?: unknown;
  error?: ExecutionError;
  metadata?: {
    duration: number;
    scopeMatchCount?: number;
    anchorMatchIndex?: number;
    pageNavigated?: boolean;
    newUrl?: string;
  };
}
```

#### 执行错误类型

```typescript
interface ExecutionError {
  /** 错误代码 */
  code: ErrorCode;
  /** 错误消息 */
  message: string;
  /** 失败的选择器 */
  failedSelector?: string;
  /** DOM 快照（用于调试） */
  domSnapshot?: string;
}

type ErrorCode =
  | 'TARGET_NOT_FOUND'    // 目标元素未找到
  | 'SCOPE_NOT_FOUND'     // 作用域未找到
  | 'ANCHOR_NOT_FOUND'    // 锚点未匹配
  | 'ACTION_FAILED'       // 动作执行失败
  | 'TIMEOUT'             // 超时
  | 'PAGE_NOT_READY'      // 页面未就绪
  | 'UNKNOWN';            // 未知错误
```

---

### 2. 执行编排 API

#### HOMURA_START_EXECUTION

**方向**: SidePanel → Background
**用途**: 开始连贯执行工具集

```typescript
interface StartExecutionMessage {
  type: 'HOMURA_START_EXECUTION';
  payload: {
    /** 工具列表 */
    tools: Array<{
      tool: AtomicTool;
      params: Record<string, unknown>;
    }>;
    /** 目标 Tab ID */
    tabId: number;
  };
}
```

**响应**:
```typescript
interface ExecutionState {
  /** 执行 ID */
  id: string;
  /** 执行模式 */
  mode: 'sequential';
  /** 当前工具索引 */
  currentIndex: number;
  /** 工具列表 */
  tools: Array<{
    tool: AtomicTool;
    params: Record<string, unknown>;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: ExecuteToolResult;
    retryCount: number;
  }>;
  /** 变量存储 */
  variables: Record<string, unknown>;
  /** 执行历史 */
  history: Array<{
    index: number;
    toolId: string;
    toolName: string;
    result: ExecuteToolResult;
    timestamp: string;
  }>;
  /** 整体状态 */
  status: 'running' | 'paused' | 'completed' | 'failed';
  /** 时间信息 */
  startTime: string;
  lastUpdate: string;
  /** 当前 URL */
  currentUrl?: string;
  /** Tab ID */
  tabId: number;
}
```

#### HOMURA_CANCEL_EXECUTION

**方向**: SidePanel → Background
**用途**: 取消当前执行

```typescript
interface CancelExecutionMessage {
  type: 'HOMURA_CANCEL_EXECUTION';
}
```

**响应**:
```typescript
interface CancelExecutionResult {
  success: boolean;
  error?: string;
}
```

---

### 3. 检查模式 API

#### START_INSPECT / STOP_INSPECT

**方向**: SidePanel → Content Script
**用途**: 控制元素检查模式

```typescript
interface StartInspectMessage {
  type: 'START_INSPECT';
  payload?: {
    /** 检查模式（默认 hover） */
    mode?: 'hover' | 'click';
    /** 是否高亮已选元素 */
    highlight?: boolean;
  };
}

interface StopInspectMessage {
  type: 'STOP_INSPECT';
}
```

#### ELEMENT_SELECTED

**方向**: Content Script → SidePanel
**用途**: 通知元素选中事件

```typescript
interface ElementSelectedMessage {
  type: 'ELEMENT_SELECTED';
  payload: UnifiedSelector;
}
```

---

### 4. 工具同步 API

#### TOOL_UPDATED

**方向**: SidePanel → Background
**用途**: 通知工具更新

```typescript
interface ToolUpdatedMessage {
  type: 'TOOL_UPDATED';
  payload: {
    toolkitId: string;
    toolIndex: number;
    updatedTool: AtomicTool;
  };
}
```

#### SEND_TOOLKIT_TO_SIDEPANEL

**方向**: Dashboard → SidePanel (via storage)
**用途**: 发送工具集到 SidePanel

```typescript
interface SendToolkitToSidepanelPayload {
  toolkitId: string;
  toolkitName: string;
  tools: AtomicTool[];
}
```

---

## 🔄 工作流

### 工具执行流程

```
1. SidePanel 发送 EXECUTE_TOOL
   └─► Background 路由到目标 Tab
       └─► Content Script 执行工具
           ├─► 等待页面就绪
           ├─► 查找目标元素
           ├─► 执行动作
           └─► 返回结果
               └─► Background 返回给 SidePanel
```

### 连贯执行流程

```
1. SidePanel 发送 HOMURA_START_EXECUTION
   └─► Background 创建 ExecutionState
       └─► 执行第一个工具
           ├─► 成功 → 检测页面变化 → 执行下一个
           ├─► 页面跳转 → 暂停 → 等待加载 → 恢复
           └─► 失败 → 记录错误 → 停止执行
               └─► SidePanel 轮询状态更新 UI
```

---

## ✅ 验收标准

### 功能验收

- [ ] 所有消息类型都有 TypeScript 类型定义
- [ ] 消息发送函数有完整的 JSDoc 注释
- [ ] 错误处理覆盖所有可能的失败场景
- [ ] 超时机制防止无限等待

### 质量验收

- [ ] 类型检查通过：`npm run typecheck`
- [ ] 无 `any` 类型使用
- [ ] 错误码使用枚举而非字符串字面量
- [ ] 消息 ID 支持请求-响应匹配

### 文档验收

- [ ] 每个消息类型有示例
- [ ] 消息流图清晰
- [ ] 错误处理策略明确

---

## 🧪 测试策略

### 单元测试

- 消息类型守卫函数测试
- 消息序列化/反序列化测试
- 错误处理逻辑测试

### 集成测试

- Background ↔ Content Script 通信测试
- SidePanel ↔ Background 通信测试
- 跨页面执行状态同步测试

---

## 📋 TODO 清单

### 设计阶段
- [x] 消息类型分类
- [x] 基础消息结构定义
- [ ] 错误码枚举定义
- [ ] 响应格式标准化

### 实现阶段
- [ ] 创建 `src/shared/messages/` 目录
- [ ] 实现消息类型守卫
- [ ] 实现消息构建器
- [ ] 重构现有消息处理代码

### 测试阶段
- [ ] 编写消息类型测试
- [ ] 编写通信集成测试

---

## 📚 决策记录

| 决策 | 选择方案 | 理由 |
|------|---------|------|
| 消息 ID | UUID v4 | 唯一性保证，支持请求-响应匹配 |
| 错误格式 | `{ code, message, ... }` | 结构化错误，便于处理和调试 |
| 通道选择 | Runtime + Storage 混合 | Runtime 用于请求-响应，Storage 用于状态同步 |
| 类型定义位置 | `src/shared/types.ts` | 集中管理，便于跨模块使用 |

---

## 📅 变更历史

| 日期 | 时间 | 版本 | 变更说明 | 作者 |
|------|------|------|----------|------|
| 2026-03-24 | 17:30 | 0.1.0 | 初始版本 | Claude Code |
