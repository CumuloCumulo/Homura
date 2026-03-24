# AI Agent 模式规范文档

> 🤖 **核心理念**：Skills + Rules → AI Agent 自主执行，而非预定义 Workflow

---

## 📄 元信息

| 字段 | 值 |
|------|-----|
| **创建时间** | 2026-03-24 14:00 |
| **状态** | ✅ Implemented |
| **优先级** | P0 |
| **负责人** | @claude |
| **实际完成** | 2026-03-24 16:30 |
| **相关 Spec** | [execution-engine.md](../architecture/execution-engine.md) |
| **实现文件** | `packages/sdk/src/agent/index.ts` |

---

## 🎯 快速上下文

> **一句话描述**: 基于 Blueprint 的 AI 自主导航执行器，让 AI 根据页面状态和规则自主决策执行流程

### 价值主张
- **用户问题**: 预定义 Workflow 无法处理动态页面和异常情况
- **技术价值**: AI 实时决策，支持循环、跳过、重试
- **业务影响**: 减少 80% 的边缘情况处理代码

### 边界定义
**包含**:
- ✅ AI 自主决策执行循环
- ✅ 页面状态提取
- ✅ 决策类型（call_skill/complete/ask_user/skip/retry）
- ✅ 执行上下文管理

**不包含**:
- ❌ 具体模型实现（由 LLMClient 接口抽象）
- ❌ 多 Tab 并行执行

---

## 🔗 关联资源

| 类型 | 路径/链接 | 说明 |
|------|----------|------|
| **实现文件** | `packages/sdk/src/agent/index.ts` | Agent 实现 |
| **类型定义** | `packages/sdk/src/types/execution.ts` | ExecutionState, AIDecision 等 |
| **执行引擎** | `packages/sdk/src/engine/index.ts` | 状态持久化执行引擎 |
| **页面状态** | `packages/sdk/src/utils/pageState.ts` | 页面摘要提取 |
| **相关 Spec** | [execution-engine.md](../architecture/execution-engine.md) | 执行引擎架构 |
| **架构文档** | [sdk-architecture.md](../architecture/sdk-architecture.md) | SDK 模块划分 |

---

## 🔄 模式对比

### ❌ Workflow 模式（传统 RPA）
```json
{
  "workflow": {
    "steps": [
      { "action": "click", "selector": "#btn1" },
      { "action": "input", "selector": "#input1", "value": "test" },
      { "action": "click", "selector": "#btn2" }
    ]
  }
}
```

**问题**：
- 线性执行，无法处理异常
- 预定义路径，无法动态调整
- 需要提前规划所有可能分支

### ✅ AI Agent 模式（Homura）
```json
{
  "skills": [
    { "tool_id": "search_student", ... },
    { "tool_id": "click_approve", ... }
  ],
  "rules": "# 审批规则\n根据学院自动审批..."
}
```

**优势**：
- AI 根据规则动态决策
- 可以循环、跳过、重试
- 自主处理异常情况

---

## 🏗️ 技术设计

### 架构位置

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AI 调度执行引擎架构                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   AI Agent  │         │   Execution  │         │   Executor   │
│  (决策层)    │ ──────▶ │   Engine    │ ──────▶ │   (执行层)    │
└─────────────┘         └─────────────┘         └─────────────┘
      │                        │                        │
      │ 1. 决策调用             │ 2. 状态管理             │ 3. 执行工具
      │                        │                        │
      ▼                        ▼                        ▼
  AIDecision              ExecutionContext        ExecuteToolResult
```

### 模块划分

| 模块 | 职责 | 位置 | 状态 |
|------|------|------|------|
| AIAgent | AI 决策循环 | `packages/sdk/src/agent/` | ✅ Implemented |
| ExecutionEngine | 状态持久化 | `packages/sdk/src/engine/` | ✅ Implemented |
| PageState | 页面摘要提取 | `packages/sdk/src/utils/pageState.ts` | ✅ Implemented |

---

## 📝 类型定义

### AI Agent 配置

```typescript
// packages/sdk/src/types/execution.ts

/**
 * AI Agent 配置
 */
export interface AIAgentConfig extends ExecutionConfig {
  /** LLM 客户端 */
  llmClient: LLMClient;

  /** 最大迭代次数 */
  maxIterations?: number;

  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * LLM 客户端接口
 */
export interface LLMClient {
  /**
   * 聊天 completion
   */
  chat(messages: Array<{ role: string; content: string }>): Promise<AIDecision>;
}
```

### 决策类型

```typescript
/**
 * AI 决策
 */
export interface AIDecision {
  /** 决策类型 */
  action: 'call_skill' | 'complete' | 'ask_user' | 'skip' | 'retry';

  /** 工具 ID（call_skill 时） */
  skillId?: string;

  /** 参数 */
  params?: Record<string, unknown>;

  /** 决策理由 */
  reasoning?: string;

  /** 需要用户输入的参数（ask_user 时） */
  requiredParams?: string[];
}
```

### 页面状态

```typescript
/**
 * 页面状态摘要
 */
export interface PageState {
  /** 当前 URL */
  url: string;

  /** 页面标题 */
  title: string;

  /** DOM 摘要 */
  summary: {
    /** 关键文本 */
    text: string[];

    /** 链接 */
    links: Array<{ text: string; href: string }>;

    /** 表单 */
    forms: Array<{ id: string; fields: string[] }>;

    /** 按钮 */
    buttons: string[];
  };
}
```

---

## 🔌 API 设计

### 创建 Agent

```typescript
/**
 * 工厂函数：创建 AI Agent
 *
 * @param blueprint - Blueprint 定义
 * @param config - Agent 配置
 * @returns AI Agent 实例
 */
export function createAIAgent(
  blueprint: Blueprint,
  config: AIAgentConfig
): AIAgent;
```

### Agent 类

```typescript
/**
 * AI Agent
 *
 * 基于 Blueprint 的 AI 自主导航执行器
 */
export class AIAgent {
  constructor(blueprint: Blueprint, config: AIAgentConfig);

  /**
   * 执行 Agent
   *
   * @param userParams - 用户提供的初始参数
   * @returns 执行状态
   */
  async execute(userParams?: Record<string, unknown>): Promise<ExecutionState>;

  /**
   * 设置用户响应
   *
   * 用于恢复 ask_user 暂停的状态
   */
  setUserResponse(params: Record<string, unknown>): void;

  /**
   * 恢复执行
   */
  async resume(): Promise<ExecutionState>;

  /**
   * 获取当前状态
   */
  getState(): ExecutionState | null;
}
```

---

## 🔄 工作流

### 执行循环

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent 执行循环                          │
└─────────────────────────────────────────────────────────────┘

                    ┌───────────────┐
                    │   开始执行     │
                    └───────┬───────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  检查超时/迭代次数     │
                └───────┬───────┘
                        │
            ┌───────────┴───────────┐
            │                       │
        未超时                     超时
            │                       │
            ▼                       ▼
┌───────────────────┐      ┌───────────────┐
│  获取页面状态      │      │  抛出超时错误  │
└─────────┬─────────┘      └───────────────┘
          │
          ▼
┌───────────────────┐
│  构建 Prompt      │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  LLM 决策         │
└─────────┬─────────┘
          │
    ┌─────┼─────┬─────┬─────┐
    │     │     │     │     │
    ▼     ▼     ▼     ▼     ▼
  call  complete  ask  skip  retry
 _skill              _user
    │     │     │     │     │
    ▼     ▼     ▼     ▼     ▼
 ┌─────────────────────────────────┐
 │       执行决策，更新上下文        │
 └─────────────┬───────────────────┘
               │
               ▼
       ┌───────────────┐
       │   继续下一轮   │
       └───────────────┘
```

### 错误处理

| 场景 | 处理 | 返回 |
|------|------|------|
| 超过最大迭代次数 | 抛出错误 | `Error('超过最大迭代次数')` |
| 执行超时 | 抛出错误 | `Error('执行超时')` |
| 技能不存在 | 警告并跳过 | 继续执行 |
| 页面跳转 | 暂停执行 | `ExecutionState.status = 'paused'` |
| 需要用户输入 | 暂停执行 | `ExecutionState.status = 'paused'` |

---

## ✅ 验收标准

### 功能验收
- [x] AI 能够根据页面状态自主决策
- [x] 支持所有决策类型（call_skill/complete/ask_user/skip/retry）
- [x] 页面跳转后能够恢复执行
- [x] 用户介入后能够继续执行
- [x] 超时和迭代次数限制生效

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
import { createAIAgent } from '@homura/sdk/agent';
import type { LLMClient } from '@homura/sdk/agent';
import blueprint from './blueprint.json';

// 实现 LLM 客户端
const llmClient: LLMClient = {
  async chat(messages) {
    const response = await fetch('https://api.example.com/v1/chat', {
      method: 'POST',
      body: JSON.stringify({ messages })
    });
    return response.json();
  }
};

// 创建 Agent
const agent = createAIAgent(blueprint, {
  llmClient,
  maxIterations: 50,
  timeout: 300000,
  onProgress: (state) => {
    console.log('进度:', state.currentIndex);
  },
  onComplete: (state) => {
    console.log('完成', state);
  }
});

// 执行
const result = await agent.execute({
  studentName: '张三'
});
```

### 带用户介入

```typescript
const agent = createAIAgent(blueprint, {
  llmClient,
  onPaused: (reason, state) => {
    // 显示对话框让用户输入
    const userInput = prompt(reason);
    if (userInput) {
      agent.setUserResponse({ userInput });
      agent.resume();
    }
  }
});
```

---

## 📚 决策记录 (ADR)

| 决策 | 选择方案 | 理由 | 日期 |
|------|---------|------|------|
| LLM 接口 | 由使用者实现 | 解耦具体模型，支持多种 LLM | 2026-03-24 |
| 页面摘要 | 限制数量 | 避免 Prompt 过大，控制成本 | 2026-03-24 |
| 执行引擎 | 复用 ExecutionEngine | 共享状态管理和恢复逻辑 | 2026-03-24 |

---

## 📅 变更历史

| 日期 | 时间 | 版本 | 变更说明 | 作者 |
|------|------|------|----------|------|
| 2026-03-24 | 14:00 | 0.1.0 | 初始版本（设计文档） | @claude |
| 2026-03-24 | 16:30 | 1.0.0 | 实现完成，更新 API 文档 | @claude |

---

## 📚 相关文档

- [execution-engine.md](../architecture/execution-engine.md) - 执行引擎架构
- [sdk-architecture.md](../architecture/sdk-architecture.md) - SDK 架构
- [blueprint-schema.md](../architecture/blueprint-schema.md) - Blueprint 数据结构
