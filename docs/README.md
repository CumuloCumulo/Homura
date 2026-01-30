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
┌─────────────────────────────────────────────────────────┐
│                    Homura 三层架构                       │
├─────────────────────────────────────────────────────────┤
│  表现层 (Presentation)                                   │
│  ├── SidePanel：录制助手、工具执行、日志查看             │
│  └── Dashboard：规则书编辑、工具库管理                   │
├─────────────────────────────────────────────────────────┤
│  智能层 (Intelligence)                                   │
│  ├── Tool Builder Agent：录制 → JSON 工具               │
│  ├── Orchestrator Agent：规则 → 决策调用                 │
│  └── Self-Healing Agent：异常 → 自动修复                 │
├─────────────────────────────────────────────────────────┤
│  执行层 (Execution)                                      │
│  ├── Atomic Tool Engine：Scope + Anchor + Target        │
│  └── State Monitor：DOM → JSON 摘要                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 核心概念速查

### Scope + Anchor + Target

```typescript
{
  scope:  { selector: 'tr' },                    // 1. 容器范围
  anchor: { selector: '.name', value: '张三' },  // 2. 定位锚点
  target: { selector: '.btn', action: 'CLICK' }  // 3. 操作目标
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

# 加载扩展
# 1. 打开 chrome://extensions/
# 2. 启用开发者模式
# 3. 加载 dist 文件夹
```

### 测试页面

```
public/test-pages/
└── audit-table.html   # 审批表格测试
```

---

## 🗺️ 开发路线

| 阶段 | 目标 | 状态 |
|------|------|------|
| **MVP** | 执行引擎 + Scope/Anchor/Target | ✅ |
| **v1.0** | Sidebar 录制 + LLM 生成工具 | ⏳ |
| **v1.5** | Rule Book 编辑器 (Markdown) | 📋 |
| **v2.0** | Self-Healing 自动修复 | 📋 |

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
