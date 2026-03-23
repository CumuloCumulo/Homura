---
name: homura-spec-writer
description: "帮助编写和管理 Homura 项目的规范文档 - Spec-Driven Development"
---

# Homura Spec Writer Skill

> Spec-Driven Development: 先定义规范，再编写代码，确保质量和一致性

## 何时使用

当以下任务时使用此 skill：
- 需要为新功能编写规范文档
- 需要更新现有规范
- 需要审查 API 设计
- 需要定义类型定义
- 需要做技术决策记录

---

## 📁 Spec 文档架构

### 目录结构

```
docs/specs/
├── architecture/           # 架构级规范（系统级设计）
│   ├── sdk-architecture.md
│   ├── layered-orchestration.md
│   └── selector-system.md
│
├── features/              # 功能级规范（具体功能实现）
│   ├── ai-agent-mode.md
│   ├── blueprint-import.md
│   └── toolkit.md
│
├── api/                   # API 规范（接口定义）
│   ├── message-protocol.md
│   └── storage-api.md
│
├── workflows/             # 工作流规范（流程定义）
│   ├── recording-flow.md
│   └── execution-flow.md
│
├── ui/                    # UI 组件规范
│   └── component-guidelines.md
│
└── deprecated/            # 已废弃规范（保留历史）
    └── old-mission-format.md
```

### 命名规范

| 类型 | 命名规则 | 示例 |
|------|----------|------|
| 架构文档 | `{domain}-architecture.md` | `sdk-architecture.md` |
| 功能文档 | `{feature-name}.md` | `ai-agent-mode.md` |
| API 文档 | `{api-name}-api.md` | `storage-api.md` |
| 工作流 | `{workflow}-flow.md` | `recording-flow.md` |

---

## 📄 Spec 文档模板

使用 `.claude/templates/spec-template.md` 作为模板

### 核心章节

| 章节 | 用途 | 必填 |
|------|------|------|
| 📄 元信息 | 追踪状态、负责人、时间 | ✅ |
| 🎯 快速上下文 | 一句话描述 + 价值主张 | ✅ |
| 🔗 关联资源 | 链接到代码、测试、相关 Spec | ✅ |
| 🏗️ 技术设计 | 架构、模块、依赖关系 | ✅ |
| 📝 类型定义 | TypeScript 类型定义 | ✅ |
| 🔌 API 设计 | 函数签名、消息类型 | ⚠️ |
| 🔄 工作流 | 正常流程、错误处理 | ⚠️ |
| ✅ 验收标准 | 功能、质量、文档验收 | ✅ |
| 🧪 测试策略 | 单元、集成、E2E 测试 | ⚠️ |
| 📋 TODO 清单 | 设计、实现、验收任务 | ✅ |
| 📚 决策记录 | ADR (Architecture Decision Record) | ⚠️ |
| 📅 变更历史 | 精确到分钟的变更记录 | ✅ |

---

## 🔄 Spec-Driven Development 流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Spec 编写                                                       │
│ ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │
│ │ 快速上下文  │ → │ 类型定义    │ → │ API 设计    │ → │ 验收标准    │  │
│ └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘  │
│        ↓                  ↓                  ↓                  ↓         │
│    一句话描述        TypeScript      函数签名        具体可测量的        │
│    + 价值主张        类型归属          参数顺序            标准          │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Spec 审查                                                       │
│ ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                     │
│ │ 技术可行性  │ → │ API 设计    │ → │ 类型冲突    │                     │
│ │   审查      │   │   审查      │   │   检查      │                     │
│ └─────────────┘   └─────────────┘   └─────────────┘                     │
│        ↓                  ↓                  ↓                            │
│    架构影响          遵循规范        npm run check:duplicates            │
│    依赖分析          命名规范                                              │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 3: 实现 (Draft → WIP → Proposed → Approved)                       │
│ ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                     │
│ │ 按照规范    │ → │ 遵循开发    │ → │ 添加测试    │                     │
│ │   实现      │   │   规范      │   │   覆盖      │                     │
│ └─────────────┘   └─────────────┘   └─────────────┘                     │
│        ↓                  ↓                  ↓                            │
│    参考 Spec         DEVELOPMENT.md    TDD / 80%+ coverage              │
│    类型定义          coding standards                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 4: 验收 (Approved → Implemented)                                  │
│ ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                     │
│ │ 类型检查    │ → │ 测试通过    │ → │ 更新文档    │                     │
│ └─────────────┘   └─────────────┘   └─────────────┘                     │
│        ↓                  ↓                  ↓                            │
│  npm run typecheck  npm run test      更新 Spec 状态                     │
│  npm run lint       npm run coverage  添加实现文件链接                   │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 5: 归档                                                            │
│ ┌─────────────┐   ┌─────────────┐                                       │
│ │ 更新 Spec   │ → │ 链接代码    │                                       │
│ │   状态      │   │   路径      │                                       │
│ └─────────────┘   └─────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Spec 状态管理

### 状态流转

```
Draft (草稿)
  ↓ 完成 WIP
WIP (工作中)
  ↓ 提交审查
Proposed (已提出)
  ↓ 审查通过
Approved (已批准)
  ↓ 实现完成
Implemented (已实现)
  ↓ 被替代
Deprecated (已废弃)

特殊状态:
Blocked (阻塞) - 有依赖未完成
Superseded (被取代) - 被 Spec B 完全替代
```

### 状态说明

| 状态 | 说明 | 何时使用 | 下一步 |
|------|------|----------|--------|
| **Draft** | 初始草稿 | 刚开始编写 | → WIP |
| **WIP** | 工作中 | 正在完善 Spec | → Proposed |
| **Proposed** | 已提出 | 等待审查 | → Approved / Rejected |
| **Approved** | 已批准 | 审查通过，开始实现 | → Implemented |
| **Implemented** | 已实现 | 功能完成，等待验收 | → 验收通过后归档 |
| **Deprecated** | 已废弃 | 功能被替代 | 保持文档供参考 |
| **Blocked** | 阻塞 | 依赖其他 Spec | 解除依赖后恢复 |
| **Superseded** | 被取代 | 被 Spec B 替代 | 链接到新 Spec |

---

## 📝 时间追踪规范

### 时间精度

```markdown
## 📄 元信息

| 字段 | 格式 | 示例 |
|------|------|------|
| 创建时间 | YYYY-MM-DD HH:MM | 2026-03-23 14:30 |
| 预计完成 | YYYY-MM-DD | 2026-03-25 |
| 实际完成 | YYYY-MM-DD HH:MM | 2026-03-25 16:45 |
```

### 变更历史

```markdown
## 📅 变更历史

| 日期 | 时间 | 版本 | 变更说明 | 作者 |
|------|------|------|----------|------|
| 2026-03-23 | 14:30 | 0.1.0 | 初始版本 | @alice |
| 2026-03-23 | 16:45 | 0.2.0 | 添加错误处理 | @alice |
| 2026-03-24 | 09:15 | 1.0.0 | 实现完成 | @bob |
```

---

## 🧩 Vibe Coding 友好特性

### 1. 快速上下文

每个 Spec 开头提供一句话描述 + 价值主张，让 AI 快速理解：

```markdown
## 🎯 快速上下文

> **一句话描述**: 自动生成 Scope+Anchor+Target 选择器

- **用户问题**: 手动编写选择器容易出错
- **技术价值**: 统一选择器生成逻辑
- **业务影响**: 减少录制失败率 50%
```

### 2. 关联资源链接

明确记录代码、测试、相关 Spec 的路径：

```markdown
## 🔗 关联资源

| 类型 | 路径 | 说明 |
|------|------|------|
| 实现文件 | `src/background/orchestrator.ts` | 主实现 |
| 测试文件 | `src/background/orchestrator.test.ts` | 测试 |
| 相关 Spec | [ai-agent-mode.md](./ai-agent-mode.md) | 依赖 Spec |
```

### 3. TODO 清单

将实现任务分解为可勾选项：

```markdown
## 📋 TODO 清单

### 设计阶段
- [x] 类型定义
- [x] API 设计
- [ ] 错误处理方案

### 实现阶段
- [ ] 核心逻辑
- [ ] 错误处理
- [ ] 单元测试
```

### 4. 决策记录 (ADR)

记录重要技术决策及理由：

```markdown
## 📚 决策记录

| 决策 | 选择方案 | 理由 |
|------|---------|------|
| 选择器策略 | scope_anchor_target | 更稳定、可维护 |
| 状态存储 | chrome.storage.session | 跨 Service Worker 重启 |
```

---

## ✍️ 编写 Spec 的最佳实践

### 1. 先设计类型

```typescript
// 明确类型归属
// SDK 通用类型 → packages/sdk/src/types/
// 扩展特定类型 → src/shared/types.ts

export interface FeatureConfig {
  /** 清晰的字段说明 */
  field: Type;
}
```

### 2. 设计清晰的 API

```typescript
// 参数顺序：必需 → 可选 → 上下文
export async function featureFunction(
  required: Type,        // 必需
  optional?: Type,       // 可选
  context?: Context      // 上下文
): Promise<Result>
```

### 3. 定义验收标准

- ✅ 功能正常工作
- ✅ 类型检查通过
- ✅ 测试覆盖率 ≥ 80%
- ✅ 文档完整

### 4. 考虑边界情况

- 错误处理
- 性能考虑
- 兼容性

---

## 🔍 审查 Checklist

审查 Spec 时检查：

**类型定义**
- [ ] 类型定义清晰且无冲突
- [ ] 类型归属正确（SDK vs @shared）
- [ ] 运行 `npm run check:duplicates` 无冲突

**API 设计**
- [ ] API 设计遵循规范
- [ ] 函数签名参数顺序正确
- [ ] 错误处理完善

**文档完整**
- [ ] 快速上下文清晰
- [ ] 关联资源链接完整
- [ ] 验收标准具体可测
- [ ] TODO 清单完整

**测试策略**
- [ ] 测试策略明确
- [ ] 测试覆盖边界情况

---

## 🤖 AI 辅助指令

编写 Spec 时，AI 应该：

1. **自动检查**
   - ✅ 检查类型定义是否已存在
   - ✅ 验证 API 设计是否符合规范
   - ✅ 确认类型归属（SDK vs @shared）
   - ✅ 建议运行 `npm run check:duplicates`

2. **自动关联**
   - 🔗 查找相关 Spec 并建立链接
   - 🔗 识别依赖的现有代码
   - 🔗 推荐参考文档

3. **自动补全**
   - 📋 根据类型定义生成验收标准
   - 📋 根据函数签名生成测试框架
   - 📋 根据错误场景生成错误处理建议

---

## 📚 示例 Spec

查看示例：
- `.claude/templates/spec-template.md` - 模板
- `docs/specs/features/toolkit.md` - 功能规范示例
- `docs/specs/architecture/layered-orchestration.md` - 架构规范示例

---

## 📖 相关文档

- [开发规范](../../docs/DEVELOPMENT.md)
- [SDK 架构](../../docs/specs/architecture/sdk-architecture.md)
- [API 设计规范](../../docs/DEVELOPMENT.md#api-设计规范)
- [命名规范](../../docs/guides/naming-convention.md)
