# Homura Spec 文档索引

> Spec-Driven Development: 规范先行，代码跟随

## 📁 目录结构

```
docs/specs/
├── architecture/    # 架构级规范（系统级设计）
├── features/        # 功能级规范（具体功能实现）
├── workflows/       # 工作流规范（流程定义）
├── ui/              # UI 组件规范
└── README.md        # 本文档
```

## 🏗️ 架构级规范 (architecture/)

系统级设计，描述整体架构和核心组件。

| 文档 | 状态 | 说明 |
|------|------|------|
| [SDK Architecture](./architecture/sdk-architecture.md) | ✅ Implemented | SDK 模块架构和导入规则 |
| [Blueprint Schema](./architecture/blueprint-schema.md) | 📋 Proposed | Blueprint 数据结构定义 |
| [Selector System](./architecture/selector.md) | ✅ Implemented | 选择器生成和验证系统 |

## ✨ 功能级规范 (features/)

具体功能实现规范，包含类型定义、API 设计和验收标准。

| 文档 | 状态 | 优先级 | 说明 |
|------|------|--------|------|
| [Toolkit](./features/toolkit.md) | ✅ Implemented | P0 | 工具集类型定义和编排 |
| [Dashboard Orchestration](./features/dashboard-orchestration.md) | ✅ Implemented | P0 | Dashboard 分层编排架构 |
| [Auto Tool Sync](./features/auto-tool-sync.md) | ✅ Implemented | P1 | SidePanel ↔ Dashboard 工具自动同步 |
| [Dashboard-SidePanel Bridge](./features/dashboard-sidepanel-bridge.md) | 📋 Proposed | P1 | Dashboard-SidePanel 联动架构 |
| [Recording Import](./features/recording-import.md) | 📋 Proposed | P1 | 录制数据导入流程 |
| [AI Agent Mode](./features/ai-agent-mode.md) | 📋 Proposed | P1 | AI Agent 决策模式 |

## 🔄 工作流规范 (workflows/)

跨模块的业务流程规范。

| 文档 | 状态 | 说明 |
|------|------|------|
| *待添加* | - | - |

## 🎨 UI 组件规范 (ui/)

UI 设计系统和组件规范。

| 文档 | 状态 | 说明 |
|------|------|------|
| [UI Design](./ui/UI-DESIGN.md) | ✅ Active | Deep Space 设计规范 |

## 📖 指南文档 (guides/)

开发指南和最佳实践（非规范类文档）。

| 文档 | 说明 |
|------|------|
| [命名规范](../guides/naming-convention.md) | 统一术语和命名约定 |
| [AI 约束](../guides/ai-constraints.md) | AI 调用约束和限制 |
| [关键考虑点](../guides/key-considerations.md) | 开发中的关键决策 |
| [插件维护](../guides/plugin-maintenance.md) | 插件维护指南 |
| [项目愿景](../guides/project-vision.md) | 项目愿景和方向 |

## 🎯 Spec 状态说明

| 状态 | 图标 | 说明 |
|------|------|------|
| **Draft** | 📝 | 初始草稿 |
| **WIP** | 🚧 | 工作中 |
| **Proposed** | 📋 | 已提出，等待审查 |
| **Approved** | ✅ | 已批准，可以开始实现 |
| **Implemented** | ✨ | 已实现 |
| **Active** | 🔥 | 持续维护（如 UI 规范） |
| **Deprecated** | ❌ | 已废弃 |

## 📝 创建新 Spec

### 1. 选择目录

| 规范类型 | 目录 |
|----------|------|
| 架构设计 | `specs/architecture/` |
| 功能实现 | `specs/features/` |
| 工作流 | `specs/workflows/` |
| UI 组件 | `specs/ui/` |

### 2. 使用模板

```bash
# 从模板创建新 Spec
cp .claude/templates/spec-template.md docs/specs/features/my-feature.md
```

### 3. 必填章节

- 📄 元信息（状态、时间精确到分钟）
- 🎯 快速上下文（一句话描述 + 价值主张）
- 🔗 关联资源（实现文件、测试文件）
- 📝 类型定义
- ✅ 验收标准
- 📅 变更历史

## 📚 相关文档

- [开发规范](../DEVELOPMENT.md) - 完整开发指南
- [项目 README](../README.md) - 项目概述
- [.claude/templates/spec-template.md](../../.claude/templates/spec-template.md) - Spec 模板
