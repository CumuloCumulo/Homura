# 📚 Homura 文档中心

> 🔥 **Next-Gen AI Browser Automation Agent**
> 
> 不是给工具赋能，而是给 AI 赋能

---

## 📖 文档目录

### 核心设计文档

| 文档 | 说明 |
|------|------|
| [project-vision.md](./project-vision.md) | 项目白皮书：核心哲学、架构、路线图 |
| [naming-convention.md](./naming-convention.md) | 命名规范：Mission vs Blueprint vs Workflow |

### 技术文档

| 文档 | 说明 |
|------|------|
| [selector.md](./selector.md) | **选择器系统**：UnifiedSelector、双策略路由 |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 开发入门：项目结构、快速启动、SDK 开发路线 |
| [UI-DESIGN.md](./UI-DESIGN.md) | UI/UX 规范：心智交互、组件规范 |
| [ai-constraints.md](./ai-constraints.md) | AI 约束：Primitives、沙箱执行 |
| [key-considerations.md](./key-considerations.md) | 关键开发考虑事项 |

### SDK 与插件生态（2026-03-22 新增）

| 文档 | 说明 |
|------|------|
| [sdk-architecture.md](./sdk-architecture.md) | **SDK 架构**：Monorepo 结构、模块划分、API 设计 |
| [ai-agent-mode.md](./ai-agent-mode.md) | **AI Agent 模式**：Skills + Rules → AI 自主执行 |
| [blueprint-schema.md](./blueprint-schema.md) | **Blueprint Schema**：数据结构定义、验证规则 |
| [plugin-maintenance.md](./plugin-maintenance.md) | **插件维护**：运行时自愈、开发时维护、热更新 |

---

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                      表现层 (Presentation)                       │
├────────────────────────────┬────────────────────────────────────┤
│  SidePanel (录制器)         │  Dashboard (管理中心)              │
│  ├── Inspect Mode          │  ├── Tool Library 工具库          │
│  │   ├── Path 路径模式     │  └── Rule Book 规则书             │
│  │   └── Structure 结构模式│                                    │
│  └── Quick Actions 快速操作│                                    │
├────────────────────────────┴────────────────────────────────────┤
│                      智能层 (Intelligence)                       │
│  ├── Smart Router          智能策略路由 (Path vs Structure)    │
│  ├── UnifiedSelector       统一选择器 Schema                   │
│  └── Tool Builder          录制 → JSON 工具                    │
├─────────────────────────────────────────────────────────────────┤
│                      执行层 (Execution)                          │
│  ├── Atomic Tool Engine    UnifiedSelector 执行器              │
│  ├── Selector Builder      DOM 分析 + 双策略生成               │
│  └── Primitives            CLICK/INPUT/EXTRACT/WAIT/NAVIGATE   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 核心概念

### UnifiedSelector (统一选择器)

```typescript
interface UnifiedSelector {
  strategy: 'path' | 'scope_anchor_target' | 'direct';
  fullSelector: string;
  pathData?: { root, intermediates, target };      // Path 策略
  structureData?: { scope, anchor, target };       // Structure 策略
  action: { type: 'CLICK' | 'INPUT' | ... };
}
```

### 双策略路由

| 场景 | 策略 |
|------|------|
| 表格/列表中的元素 | Scope + Anchor + Target |
| 单一嵌套元素 | Path Selector |

### 五大基元 (Primitives)

| 基元 | 说明 |
|------|------|
| `CLICK` | 模拟点击 |
| `INPUT` | 表单输入 |
| `EXTRACT_TEXT` | 提取文本 |
| `WAIT_FOR` | 等待元素 |
| `NAVIGATE` | 页面导航 |

---

## 🚀 快速开始

```bash
pnpm install && pnpm dev
```

1. 打开 `chrome://extensions/` → 启用开发者模式
2. 加载 `dist` 文件夹
3. 点击扩展图标打开 SidePanel

---

## 🗺️ 开发路线

| 版本 | 目标 | 状态 |
|------|------|------|
| MVP | 执行引擎 + Scope/Anchor/Target | ✅ |
| v0.5 | 选择器生成 + DOM 分析 | ✅ |
| v0.6 | 路径选择器 + AI 路由 | ✅ |
| v0.7 | UnifiedSelector + 双模式 UI | ✅ |
| v0.7.1 | 高熵值锚点 + Split Table 支持 | ✅ |
| v0.7.2 | 跨页面/跨 Tab 录制 | ✅ |
| **v1.0** | **SDK 抽离 + AI Agent** | 🚧 进行中 |
| **v1.5** | **Blueprint 导出 + 插件生态** | 📋 计划中 |
| v2.0 | Self-Healing 自动修复 | 📋 |

### SDK 开发优先级

| 优先级 | 任务 | 预估时间 |
|--------|------|----------|
| P0 | SDK 基础抽离（types, selector, primitives, executor） | 1 周 |
| P0 | 主插件迁移到 SDK | 3 天 |
| P1 | AI Agent 实现 | 1 周 |
| P1 | Blueprint 导出功能 | 2 天 |
| P2 | 自愈机制 | 3 天 |

详见 [DEVELOPMENT.md](./DEVELOPMENT.md)

---

*🔥 Built with Mindful Interaction Design Philosophy*

*最后更新: 2026-03-22*
