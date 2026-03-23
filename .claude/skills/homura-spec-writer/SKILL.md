---
name: homura-spec-writer
description: "帮助编写和管理 Homura 项目的规范文档"
---

# Homura Spec Writer Skill

> 帮助编写和管理 Homura 项目的规范文档

## 何时使用

当以下任务时使用此 skill：
- 需要为新功能编写规范文档
- 需要更新现有规范
- 需要审查 API 设计
- 需要定义类型定义

## Spec 文档结构

### 位置
所有规范文档放在 `docs/specs/` 目录

### 命名
使用小写字母和连字符：
```
docs/specs/ai-agent.md
docs/specs/blueprint-format.md
docs/specs/selector-validation.md
```

## Spec 文档模板

使用 `.claude/templates/spec-template.md` 作为模板，包含：
- 📄 元信息（状态、优先级、负责人）
- 🎯 功能概述
- 🏗️ 技术设计
- 📝 类型定义
- 🔌 API 设计
- 🔄 工作流
- ✅ 验收标准
- 🧪 测试策略

## Spec-Driven Development 流程

```
1. 📋 编写 Spec 文档
   ├── 定义功能目标
   ├── 设计类型和 API
   └── 确定验收标准

2. 👥 审查 Spec
   ├── 技术可行性审查
   ├── API 设计审查
   └── 类型冲突检查

3. 💻 实现功能
   ├── 按照 Spec 实现
   ├── 遵循开发规范
   └── 添加测试

4. ✅ 验收
   ├── 检查是否符合 Spec
   ├── 运行所有检查
   └── 更新文档

5. 📚 归档
   ├── 更新 Spec 状态为 Implemented
   └── 链接到相关代码
```

## 编写 Spec 的最佳实践

### 1. 先设计类型
在编写 Spec 时，先定义类型：
```typescript
// 明确类型归属
// SDK 通用类型 → packages/sdk/src/types/
// 扩展特定类型 → src/shared/types.ts

export interface FeatureConfig {
  // 清晰的类型定义
}
```

### 2. 设计清晰的 API
```typescript
// 遵循 API 设计规范
// 参数顺序：必需 → 可选 → 上下文
export async function featureFunction(
  required: Type,        // 必需
  optional?: Type,       // 可选
  context?: Context      // 上下文
): Promise<Result>
```

### 3. 定义验收标准
- 功能正常工作
- 类型检查通过
- 测试覆盖率 ≥ 80%
- 文档完整

### 4. 考虑边界情况
- 错误处理
- 性能考虑
- 兼容性

## Spec 状态管理

| 状态 | 说明 | 何时使用 |
|------|------|----------|
| **Draft** | 草稿 | 初步编写，待审查 |
| **Proposed** | 已提出 | 完成初稿，等待审查 |
| **Approved** | 已批准 | 审查通过，可以开始实现 |
| **Implemented** | 已实现 | 功能已完成，等待验收 |
| **Deprecated** | 已废弃 | 功能被替代，不再维护 |

## 审查 Checklist

审查 Spec 时检查：
- [ ] 类型定义清晰且无冲突
- [ ] API 设计遵循规范
- [ ] 错误处理完善
- [ ] 测试策略明确
- [ ] 验收标准具体
- [ ] 文档结构完整

## 自动化检查

编写 Spec 时，AI 应该：
- ✅ 检查类型定义是否已存在
- ✅ 验证 API 设计是否符合规范
- ✅ 确认类型归属（SDK vs @shared）
- ✅ 建议运行 `npm run check:duplicates`

## 示例 Spec

查看示例：
- `.claude/templates/spec-template.md` - 模板
- 具体功能的 spec（待添加）

## 相关文档

- [开发规范](../../docs/DEVELOPMENT.md)
- [SDK 架构](../../docs/sdk-architecture.md)
- [API 设计规范](../../docs/DEVELOPMENT.md#api-设计规范)
