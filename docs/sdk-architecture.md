# @homura/sdk 架构设计文档

> 🎯 **目标**：将 Homura 的核心能力抽离为独立的 SDK，支持快速开发定制化浏览器自动化插件

---

## 📐 设计原则

### 1. 代码复用，而非重写
SDK 是对现有代码的**重新组织和抽离**，不是重写。Homura 主插件和定制插件都依赖同一个 SDK。

### 2. Monorepo 架构
```
homura/
├── packages/
│   ├── sdk/              # @homura/sdk - 核心引擎
│   ├── extension/        # 主 Homura 插件（依赖 sdk）
│   └── (future) cli/     # CLI 工具（依赖 sdk，可选）
├── package.json (root)
└── pnpm-workspace.yaml
```

### 3. 零运行时依赖
SDK 只包含纯逻辑，不依赖 React、UI 框架，确保在任何环境下都能运行。

---

## 📦 模块划分

### 核心模块

| 模块 | 来源 | 说明 |
|------|------|------|
| `types` | `src/shared/types.ts` | 核心 TypeScript 类型定义 |
| `selector` | `src/shared/selectorBuilder/*` | 选择器生成、验证、执行 |
| `primitives` | `src/content/engine/primitives.ts` | 五大基元操作 |
| `executor` | `src/content/engine/executor.ts` | 工具执行器 |
| `agent` | `src/background/orchestrator.ts` | AI 编排器（待实现） |

### 目录结构

```
packages/sdk/
├── src/
│   ├── types/                 # 类型定义
│   ├── selector/              # 选择器引擎
│   ├── primitives/            # 五大基元
│   ├── executor/              # 工具执行器
│   ├── agent/                 # AI Agent
│   ├── utils/                 # 工具函数
│   └── index.ts               # SDK 主入口
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔌 API 设计

### 选择器引擎
```typescript
import { SelectorEngine } from '@homura/sdk/selector';

// 从 DOM 元素生成选择器
const selector = await SelectorEngine.fromElement(element, {
  strategy: 'auto',
  action: 'CLICK'
});

// 验证选择器
const result = SelectorEngine.validate(selector);

// 执行选择器
const outcome = await SelectorEngine.execute(selector, params);
```

### 工具执行
```typescript
import { executeTool } from '@homura/sdk/executor';

const result = await executeTool(tool, {
  student_name: '张三'
});
```

### AI Agent
```typescript
import { AIAgent } from '@homura/sdk/agent';

const agent = new AIAgent({
  skills: [tool1, tool2, tool3],
  rules: '# 审批规则\n...',
  llmProvider: 'tongyi'
});

const result = await agent.execute({ student_name: '张三' });
```

---

## 📋 开发阶段

### Phase 1: 基础抽离（P0）
- [ ] 创建 `packages/sdk` 目录结构
- [ ] 配置 Monorepo
- [ ] 抽离 `types` 模块
- [ ] 抽离 `selector` 模块
- [ ] 抽离 `primitives` 模块
- [ ] 抽离 `executor` 模块

### Phase 2: Agent 实现（P1）
- [ ] 实现 `AIAgent` 基础逻辑
- [ ] 实现 Rule Book 解析器
- [ ] 实现 LLM 调度器

### Phase 3: 高级特性（P2）
- [ ] 实现 `SelfHealingAgent`
- [ ] 实现选择器自动修复

---

*本文档记录 SDK 的架构设计，随开发持续更新*
