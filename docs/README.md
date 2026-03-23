# 📚 Homura 文档

> 🔥 **Next-Gen AI Browser Automation Agent**

---

## 📖 文档导航

### 🚀 快速开始

| 文档 | 说明 |
|------|------|
| [项目 README](../README.md) | 安装和基本使用 |
| [项目愿景](./guides/vision.md) | 核心哲学和设计理念 |

### 📋 开发指南

| 文档 | 说明 |
|------|------|
| [开发规范](./DEVELOPMENT.md) | **核心开发文档** - 项目结构、SDK 使用、工具链 |
| [命名规范](./guides/naming-convention.md) | 统一术语和命名约定 |

### 📐 技术规范

| 分类 | 文档 | 说明 |
|------|------|------|
| **架构** | [SDK 架构](./specs/architecture/sdk-architecture.md) | SDK 模块划分 |
| **架构** | [Blueprint Schema](./specs/architecture/blueprint-schema.md) | Blueprint 数据结构 |
| **架构** | [选择器系统](./specs/architecture/selector.md) | 选择器生成和验证 |
| **功能** | [Toolkit](./specs/features/toolkit.md) | 工具集规范 |
| **功能** | [Dashboard 编排](./specs/features/dashboard-orchestration.md) | 分层编排架构 |
| **UI** | [UI 设计](./specs/ui/UI-DESIGN.md) | Deep Space 设计规范 |

---

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                   │
│  ┌─────────────┐  ┌─────────────┐                      │
│  │  SidePanel  │  │  Dashboard  │                      │
│  │  Inspector  │  │  Tool Lib   │                      │
│  │  Recorder   │  │  Rule Book  │                      │
│  └─────────────┘  └─────────────┘                      │
├─────────────────────────────────────────────────────────┤
│                   Intelligence Layer                    │
│  ┌─────────────┐  ┌─────────────┐                      │
│  │ AI Service  │  │ Smart Route │                      │
│  └─────────────┘  └─────────────┘                      │
├─────────────────────────────────────────────────────────┤
│                    Execution Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │
│  │   Selector  │  │   Executor  │  │  Primitives  │   │
│  │    Engine   │  │    Engine   │  │  (5 actions) │   │
│  └─────────────┘  └─────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🗺️ 开发路线

| 版本 | 目标 | 状态 |
|------|------|------|
| MVP | Execution engine + Scope/Anchor/Target | ✅ |
| v0.5 | Selector generation + DOM analysis | ✅ |
| v0.6 | Path selector + AI routing | ✅ |
| v0.7 | UnifiedSelector + dual-mode UI | ✅ |
| v0.7.1 | High-entropy anchors + split tables | ✅ |
| v0.7.2 | Cross-page + cross-tab recording | ✅ |
| **v1.0** | **SDK extraction + layered orchestration** | ✅ |
| v1.5 | AI Agent + Blueprint export | 📋 计划中 |
| v2.0 | Self-healing selectors | 📋 计划中 |

---

*Last updated: 2026-03-23*
