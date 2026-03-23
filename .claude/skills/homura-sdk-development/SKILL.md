---
name: homura-sdk-development
description: "专门用于 Homura SDK 开发的 skill，确保类型安全和模块化设计"
---

# Homura SDK Development Skill

> 专门用于 Homura SDK 开发的 skill，确保类型安全和模块化设计

## 何时使用

当以下任务时使用此 skill：
- 修改 `packages/sdk/` 中的任何代码
- 为 SDK 添加新功能或模块
- 重构 SDK 内部实现
- 修复 SDK bug

## 开发前检查

开始开发前，必须：
1. 阅读 `docs/sdk-architecture.md` 了解 SDK 架构
2. 确认要修改的模块：types/selector/primitives/executor/utils
3. 检查类型是否已存在（避免重复定义）
4. 确认正确的导入路径

## SDK 模块规范

### Types 模块 (`packages/sdk/src/types/`)
- **职责**: 定义 SDK 核心类型
- **规则**:
  - 所有类型必须是通用类型（不依赖 Chrome Extension API）
  - 每个类型一个文件
  - 使用 `export type` 导出类型
  - 使用 `export interface` 导出接口
- **示例**:
  ```typescript
  // packages/sdk/src/types/selector.ts
  export interface SelectorLogic { ... }
  export type SelectorStrategy = 'path' | 'scope_anchor_target';
  ```

### Selector 模块 (`packages/sdk/src/selector/`)
- **职责**: 选择器生成、验证、分析
- **导入**: `import type { ... } from '@homura/sdk/types'`
- **导出**: 命名导出（不是 default）

### Primitives 模块 (`packages/sdk/src/primitives/`)
- **职责**: 原子操作实现（CLICK/INPUT/EXTRACT/WAIT/NAVIGATE）
- **依赖**: 仅依赖 types 和 utils
- **导出**: 每个原语单独导出

### Executor 模块 (`packages/sdk/src/executor/`)
- **职责**: 工具执行引擎
- **依赖**: types, primitives, selector
- **注意**: 不依赖 DOM API（保持通用性）

### Utils 模块 (`packages/sdk/src/utils/`)
- **职责**: 纯函数工具
- **规则**: 无副作用的纯函数
- **测试**: 必须有完整的单元测试

## 开发流程

### 1. 添加新功能到 SDK
```
1. 在 types/ 中定义类型（如需要）
2. 在对应模块中实现功能
3. 添加单元测试到 __tests__/
4. 运行 npm run typecheck
5. 运行 npm run build:sdk
6. 更新 docs/sdk-architecture.md（如需要）
```

### 2. 修改现有 SDK 功能
```
1. 阅读现有实现
2. 检查是否有测试用例
3. 修改实现
4. 更新测试（如需要）
5. 运行 npm run build:sdk
6. 在扩展中验证功能
```

## 自动化检查

开发 SDK 时，AI 必须：
- ✅ 每次修改后运行 `npm run typecheck`
- ✅ 修改完成后运行 `npm run build:sdk`
- ✅ 检查是否需要添加测试
- ✅ 验证导出的 API 是否一致

## 类型定义规则

### 类型所有权
| 类型 | 所有权 | 位置 |
|------|--------|------|
| SelectorLogic | SDK | `packages/sdk/src/types/selector.ts` |
| UnifiedSelector | SDK | `packages/sdk/src/types/selector.ts` |
| AtomicTool | SDK | `packages/sdk/src/types/primitives.ts` |
| Blueprint | SDK | `packages/sdk/src/types/blueprint.ts` |
| ValidationResult | SDK | `packages/sdk/src/selector/types.ts` |

### 避免重复定义
```typescript
// ✅ 正确：在唯一位置定义
// packages/sdk/src/types/selector.ts
export interface SelectorLogic { ... }

// ✅ 正确：需要时导入
// packages/sdk/src/types/blueprint.ts
import type { SelectorLogic } from './selector.js';

// ❌ 错误：重复定义
// packages/sdk/src/types/blueprint.ts
export interface SelectorLogic { ... }  // 冲突！
```

## 测试要求

- 所有核心逻辑必须有单元测试
- 测试文件位置：`packages/sdk/src/**/__tests__/`
- 使用 Vitest + jsdom
- 目标覆盖率：≥ 80%

## 导出规范

```typescript
// ✅ 正确：命名导出
export function analyzeElement(element: Element): ElementAnalysis { ... }
export type { ElementAnalysis };

// ❌ 避免：默认导出
export default function analyzeElement() { ... }
```

## 常见任务

### 添加新的 Primitive
1. 在 `types/primitives.ts` 中定义类型
2. 在 `primitives/index.ts` 中实现
3. 添加测试到 `primitives/__tests__/`
4. 在 `primitives/index.ts` 中导出

### 添加新的 Selector 策略
1. 在 `types/selector.ts` 中定义策略类型
2. 在 `selector/generator.ts` 中实现生成逻辑
3. 在 `selector/validator.ts` 中添加验证逻辑
4. 添加测试用例

## 注意事项

⚠️ **重要**:
- SDK 必须保持零运行时依赖
- 不依赖 DOM API（在扩展中才使用）
- 不依赖 Chrome Extension API
- 保持类型和实现的纯净性
- 所有导出必须使用 `.js` 扩展名（ESM）

## 相关文档

- [SDK 架构文档](../../docs/specs/architecture/sdk-architecture.md)
- [开发规范](../../docs/DEVELOPMENT.md)
- [项目 CLAUDE.md](../../CLAUDE.md)
