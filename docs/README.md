# 📚 Homura 文档中心

> 🔥 Next-Gen AI Browser Automation Agent
> 
> **不是给工具赋能，而是给 AI 赋能**

---

## 📖 文档目录

### 🎯 项目核心

| 文档 | 说明 |
|------|------|
| [project-vision.md](./project-vision.md) | **项目白皮书**：核心哲学、三层架构、数据结构、开发路线 |
| [naming-convention.md](./naming-convention.md) | **产品命名**：Mission、Blueprint、Rule Book 等概念定义 |

### 🛠️ 开发指南

| 文档 | 说明 |
|------|------|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | **开发入门**：项目结构、测试方法、快速启动 |
| [UI-DESIGN.md](./UI-DESIGN.md) | **UI/UX 规范**：心智交互哲学、色彩系统、组件规范 |
| [key-considerations.md](./key-considerations.md) | **开发注意事项**：选择器设计、录制流程、核心操作 |

### 🔧 技术参考

| 文档 | 说明 |
|------|------|
| [automa-architecture.md](./automa-architecture.md) | **Automa 架构分析**：项目结构、技术栈、启动方式 |
| [automa-execution.md](./automa-execution.md) | **Automa 执行引擎**：Click 操作的分层设计与执行流程 |
| [ai-constraints.md](./ai-constraints.md) | **AI 约束机制**：乐高积木模式、Primitives、沙箱执行 |

---

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                      表现层 (Presentation)                       │
├────────────────────────────┬────────────────────────────────────┤
│  SidePanel (录制器)         │  Dashboard (管理中心)              │
│  ├── Inspect Mode 元素检查  │  ├── Tool Library 工具库          │
│  ├── Record Mode 操作录制   │  ├── Rule Book Editor 规则书      │
│  └── Build Mode 选择器构建  │  └── Execution Log 运行日志       │
├────────────────────────────┴────────────────────────────────────┤
│                      智能层 (Intelligence)                       │
│  ├── AI Client (通义 API)     选择器生成、工具构建              │
│  ├── Tool Builder Agent       录制 → JSON 工具                  │
│  ├── Orchestrator Agent       规则 → 决策调用                   │
│  └── Self-Healing Agent       异常 → 自动修复                   │
├─────────────────────────────────────────────────────────────────┤
│                      执行层 (Execution)                          │
│  ├── Atomic Tool Engine       Scope + Anchor + Target 执行     │
│  ├── Selector Builder         DOM 分析与选择器生成              │
│  └── Debug Highlighter        调试可视化                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 项目结构速查

```
src/
├── background/              # Service Worker（智能层入口）
│   ├── index.ts            # 消息路由 + AI 初始化
│   └── orchestrator.ts     # 任务编排
│
├── content/                # Content Script（执行层）
│   ├── messageHandler.ts   # 检查/录制/执行消息处理
│   └── engine/
│       ├── executor.ts     # Scope+Anchor+Target 执行器
│       ├── primitives.ts   # 五大基元
│       └── highlighter.ts  # 调试高亮
│
├── sidepanel/              # 录制器 UI (React)
│   ├── components/
│   │   ├── InspectMode.tsx    # 元素检查
│   │   ├── RecordingPanel.tsx # 操作录制
│   │   └── SelectorBuilder.tsx # 选择器编辑
│   └── stores/
│       └── recordingStore.ts
│
├── dashboard/              # 管理中心 UI (React)
│   ├── components/
│   │   ├── ToolLibrary.tsx    # 工具卡片
│   │   ├── RuleBookEditor.tsx # Markdown 编辑器
│   │   └── ExecutionLog.tsx   # 日志面板
│   └── stores/
│       └── toolStore.ts       # 持久化存储
│
├── services/               # 外部服务
│   └── ai/
│       ├── client.ts       # 通义 API 客户端
│       ├── prompts.ts      # AI Prompt 模板
│       └── types.ts
│
└── shared/                 # 共享模块
    ├── types.ts            # 核心类型
    └── selectorBuilder/    # 选择器生成模块
        ├── analyzer.ts     # DOM 结构分析
        ├── generator.ts    # 选择器生成
        └── validator.ts    # 实时验证
```

---

## 🔑 核心概念速查

### Scope + Anchor + Target

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SCOPE (作用域) - 找到所有容器                            │
│    selector: "tr" → [Row1, Row2, Row3, ...]                │
│    ┌───────────────────────────────────────────────────┐   │
│    │ Row1: 张三 | 计算机学院 | [批准]                   │   │
│    │ Row2: 李四 | 艺术学院   | [批准] ← 2. ANCHOR 匹配  │   │
│    │ Row3: 王五 | 数学学院   | [批准]                   │   │
│    └───────────────────────────────────────────────────┘   │
│                               ↓                            │
│                    3. TARGET: 点击 [批准] 按钮             │
└─────────────────────────────────────────────────────────────┘
```

```typescript
{
  scope:  { type: 'container_list', selector: 'tr' },
  anchor: { type: 'text_match', selector: '.name', value: '{{student_name}}' },
  target: { selector: '.btn-approve', action: 'CLICK' }
}
```

### 五大基元 (Primitives)

| 基元 | 说明 | AI 可修改 |
|------|------|-----------|
| `CLICK` | 模拟点击 | ❌ |
| `INPUT` | 表单输入 | ❌ |
| `EXTRACT_TEXT` | 提取文本 | ❌ |
| `WAIT_FOR` | 等待元素 | ❌ |
| `NAVIGATE` | 页面导航 | ❌ |

### 大脑与肢体

| 角色 | 职责 | 特点 |
|------|------|------|
| **AI (大脑)** | 非确定性决策 | 理解规则、判断条件、选择策略 |
| **引擎 (肢体)** | 确定性执行 | 高精度点击、数据提取、选择器 |

---

## 🚀 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发
pnpm dev

# 构建生产版本
pnpm build
```

### 加载扩展

1. 打开 `chrome://extensions/`
2. 启用开发者模式
3. 加载 `dist` 文件夹

### 打开界面

| 界面 | 打开方式 |
|------|----------|
| **SidePanel** | 点击扩展图标 |
| **Dashboard** | SidePanel 头部按钮 / 右键扩展 → 选项 |

---

## 🗺️ 开发路线

| 阶段 | 目标 | 状态 |
|------|------|------|
| **MVP** | 执行引擎 + Scope/Anchor/Target | ✅ 完成 |
| **v0.2** | SidePanel 三模式 (Inspect/Record/Build) | ✅ 完成 |
| **v0.3** | Dashboard 工具库 + 规则书编辑器 | ✅ 完成 |
| **v0.4** | AI 服务集成 (通义 API) | ✅ 完成 |
| **v0.5** | 选择器生成模块 (DOM 分析) | ✅ 完成 |
| **v1.0** | AI 驱动的完整工具生成 | 🚧 进行中 |
| **v1.5** | Rule Book 解析与执行 | 📋 计划中 |
| **v2.0** | Self-Healing 自动修复 | 📋 计划中 |

---

## 🎨 设计理念

> **心智交互 (Mindful Interaction)**
> 
> 从"争夺注意力"到"尊重注意力"

- 🧘 **数字节食**：渐进式披露，减少认知负荷
- 🌙 **平静界面**：深色基底 + 微弱紫色点缀
- 📐 **空间高效**：侧边栏寸土寸金
- 🤖 **AI 友好**：结构化数据，语义化选择器

---

*🔥 Built with Mindful Interaction Design Philosophy*
