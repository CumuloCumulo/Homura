# [功能名称] 规范文档

> 📋 本文档定义 [功能名称] 的技术规范

## 📄 元信息

| 字段 | 值 |
|------|-----|
| **创建时间** | YYYY-MM-DD HH:MM |
| **状态** | Draft → WIP → Proposed → Approved → Implemented → Deprecated |
| **优先级** | P0 \| P1 \| P2 \| P3 |
| **负责人** | @username |
| **预计完成** | YYYY-MM-DD |
| **实际完成** | - |
| **相关 Issue** | #123 |
| **父 Spec** | [父规范链接](./parent-spec.md) |
| **依赖 Spec** | [依赖规范链接](./dep-spec.md) |

---

## 🎯 快速上下文

> **一句话描述**: [用一句话说明这个功能是什么]

### 价值主张
- **用户问题**: [解决什么用户痛点]
- **技术价值**: [带来什么技术收益]
- **业务影响**: [对业务的影响]

### 边界定义
**包含**:
- ✅ [功能点1]
- ✅ [功能点2]

**不包含**:
- ❌ [不在范围内的功能1]
- ❌ [不在范围内的功能2]

---

## 🔗 关联资源

| 类型 | 路径/链接 | 说明 |
|------|----------|------|
| **实现文件** | `src/path/to/file.ts` | 主要实现 |
| **测试文件** | `src/path/to/file.test.ts` | 测试覆盖 |
| **类型定义** | `packages/sdk/src/types/...` | 类型定义 |
| **相关 Spec** | [link](./spec.md) | 关联规范 |
| **设计文档** | [link](../doc.md) | 设计参考 |

---

## 🎯 功能概述

### 目标
[详细描述功能要解决的问题]

### 背景
[为什么需要这个功能？当前问题是什么？]

---

## 🏗️ 技术设计

### 架构位置

```
[ASCII 架构图，展示功能在整体系统中的位置]
```

### 模块划分

| 模块 | 职责 | 位置 | 状态 |
|------|------|------|------|
| Module A | ... | `path/to/module` | ⏳ TODO |
| Module B | ... | `path/to/module` | ✅ Done |

### 依赖关系

```
[依赖关系图]
Spec A ─┐
         ├─→ 当前 Spec ─→ Spec C
Spec B ─┘
```

---

## 📝 类型定义

### SDK 通用类型

```typescript
// packages/sdk/src/types/feature.ts

/**
 * [类型说明]
 */
export interface FeatureConfig {
  /** [字段说明] */
  field: Type;
}
```

### 扩展特定类型

```typescript
// src/shared/types.ts

export interface FeatureState {
  // ...
}
```

---

## 🔌 API 设计

### 函数签名

```typescript
/**
 * [功能描述]
 * @param param1 - [参数说明]
 * @returns [返回值说明]
 * @example
 * ```ts
 * const result = await featureFunction(arg1);
 * ```
 */
export async function featureFunction(
  param1: Type1        // 必需
): Promise<ResultType> {
  // ...
}
```

### 消息类型（Chrome 扩展）

```typescript
export type FeatureMessage =
  | { type: 'FEATURE_ACTION'; payload: Payload }
  | { type: 'FEATURE_EVENT'; data: Data };
```

---

## 🔄 工作流

### 正常流程

```
1. [步骤1]
   └→ 输出: [输出物]
2. [步骤2]
   └→ 输出: [输出物]
3. [步骤3]
   └→ 输出: [输出物]
```

### 错误处理

| 场景 | 处理 | 返回 |
|------|------|------|
| Scenario A | Error handling A | `ErrorTypeA` |
| Scenario B | Error handling B | `ErrorTypeB` |

---

## ✅ 验收标准

### 功能验收
- [ ] [具体功能点1]
- [ ] [具体功能点2]
- [ ] [具体功能点3]

### 质量验收
- [ ] `npm run typecheck` 通过
- [ ] `npm run lint` 通过
- [ ] 测试覆盖率 ≥ 80%
- [ ] 无明显性能问题（<100ms）

### 文档验收
- [ ] DEVELOPMENT.md 更新（如需要）
- [ ] JSDoc 注释完整
- [ ] Spec 状态更新为 Implemented

---

## 🧪 测试策略

### 单元测试
```typescript
describe('Feature', () => {
  it('should [预期行为]', () => {
    // ...
  });
});
```

### 集成测试
- [ ] [集成点1] 测试
- [ ] [集成点2] 测试

---

## 📋 TODO 清单

### 设计阶段
- [ ] 类型定义
- [ ] API 设计
- [ ] 错误处理方案

### 实现阶段
- [ ] 核心逻辑
- [ ] 错误处理
- [ ] 单元测试

### 验收阶段
- [ ] 集成测试
- [ ] 文档更新
- [ ] Code Review

---

## 📚 决策记录 (ADR)

| 决策 | 选择方案 | 理由 | 日期 |
|------|---------|------|------|
| [决策点] | [选择的方案] | [为什么这样选择] | YYYY-MM-DD |

---

## 📅 变更历史

| 日期 | 时间 | 版本 | 变更说明 | 作者 |
|------|------|------|----------|------|
| YYYY-MM-DD | HH:MM | 0.1.0 | 初始版本 | @username |
| YYYY-MM-DD | HH:MM | 0.2.0 | [变更说明] | @username |

---

## 📚 相关文档

- [DEVELOPMENT.md](../DEVELOPMENT.md) - 开发规范
- [SDK Architecture](../sdk-architecture.md) - SDK 架构
- [API 设计规范](../DEVELOPMENT.md#api-设计规范) - API 规范
