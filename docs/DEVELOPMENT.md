# Homura 开发指南

> 🔥 Next-Gen AI Browser Automation Agent

---

## 📁 项目结构

```
homura/
├── docs/                        # 开发文档
├── public/
│   ├── icons/                  # 扩展图标
│   └── test-pages/             # 测试页面
│       └── audit-table.html
│
└── src/
    ├── background/             # Service Worker（智能层）
    │   ├── index.ts           # 入口 + 消息路由 + AI 初始化 + 录制状态管理
    │   └── orchestrator.ts    # 任务编排逻辑
    │
    ├── content/               # Content Script（执行层）
    │   ├── index.tsx          # 入口
    │   ├── messageHandler.ts  # 消息处理（检查/录制/执行）
    │   └── engine/            # 🔥 核心引擎
    │       ├── executor.ts       # Atomic Tool 执行器
    │       ├── primitives.ts     # 底层基元 (CLICK/INPUT/...)
    │       └── highlighter.ts    # 调试高亮
    │
    ├── sidepanel/             # 录制器 UI (React + Framer Motion)
    │   ├── App.tsx            # 主应用（双模式切换）
    │   ├── components/
    │   │   ├── Header.tsx         # 头部（含 Dashboard 入口）
    │   │   ├── InspectMode.tsx    # 元素检查模式（主编排器）
    │   │   ├── SmartStatus.tsx    # AI 决策面板（呼吸动画）
    │   │   ├── PathVisualizer.tsx # 路径模式（祖先阶梯）
    │   │   ├── StructureView.tsx  # 结构模式（Scope+Anchor+Target）
    │   │   ├── RecordingPanel.tsx # 操作录制模式
    │   │   └── LogViewer.tsx      # 日志查看器
    │   ├── stores/
    │   │   ├── missionStore.ts    # 任务状态（旧）
    │   │   └── recordingStore.ts  # 录制状态 + AI 策略状态
    │   └── utils/
    │       └── ensureContentScript.ts # Content Script 注入工具
    │
    ├── dashboard/             # 管理中心 UI (React)
    │   ├── App.tsx            # 主布局
    │   ├── components/
    │   │   ├── ToolLibrary.tsx    # 工具库卡片列表
    │   │   ├── RuleBookEditor.tsx # Markdown 规则编辑器
    │   │   └── ExecutionLog.tsx   # 执行日志面板
    │   └── stores/
    │       └── toolStore.ts       # 工具库状态（持久化）
    │
    ├── services/              # 外部服务模块
    │   └── ai/                # AI 服务
    │       ├── index.ts          # 统一导出
    │       ├── client.ts         # 通义 API 客户端（含 generateSmartSelector）
    │       ├── smartRouter.ts    # 智能策略路由（Path vs Structure）
    │       ├── prompts.ts        # AI Prompt 模板
    │       ├── tools.ts          # AI Tool Schema 定义
    │       └── types.ts          # 含 SmartSelectorContext/Result
    │
    ├── shared/                # 共享模块
    │   ├── types.ts           # 核心类型定义
    │   ├── constants.ts       # 常量
    │   ├── utils.ts           # 工具函数
    │   └── selectorBuilder/   # 选择器生成模块
    │       ├── index.ts          # 统一导出
    │       ├── types.ts          # 类型（含 AncestorInfo, PathSelector）
    │       ├── analyzer.ts       # DOM 分析（含路径收集、语义评分）
    │       ├── generator.ts      # 选择器生成
    │       └── validator.ts      # 选择器验证
    │
    └── styles/
        └── global.css         # 全局样式
```

---

## 🧪 如何测试

### 1. 启动开发服务器

```bash
pnpm install
pnpm dev
```

### 2. 加载扩展

1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序" → 选择 `dist` 文件夹

### 3. 测试 SidePanel（录制器）

1. 打开任意网页（非 chrome:// 页面）
2. **刷新页面**（确保 Content Script 加载）
3. 点击扩展图标打开 SidePanel
4. 选择模式：
   - **检查**：点击"开始检查"，然后点击页面元素
     - SmartStatus：查看 AI 决策状态和策略
     - Tab 切换：Path（路径模式）/ Structure（结构模式）
     - PathVisualizer：交互式祖先阶梯，勾选包含层级
     - StructureView：Scope+Anchor+Target 配置
     - AI 优化：智能路由，自动选择最佳策略
   - **录制**：点击"开始录制"，在页面上操作
     - 支持跨页面录制：页面跳转后自动恢复录制状态
     - 支持跨 Tab 录制：打开新标签页后自动跟踪
     - 自动生成 UnifiedSelector：每个操作自动生成选择器

### 4. 测试 Dashboard（管理中心）

打开方式：
- 点击 SidePanel 头部的 Dashboard 图标
- 右键扩展图标 → 选项
- 直接访问 `chrome-extension://[ID]/src/dashboard/index.html`

### 5. 添加新测试页面

在 `public/test-pages/` 中创建新的 HTML 文件：

```
public/test-pages/
├── audit-table.html      # 审批表格测试
├── search-form.html      # 搜索表单测试（待添加）
└── dynamic-list.html     # 动态列表测试（待添加）
```

---

## 🎯 核心概念

### Scope + Anchor + Target 模式

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SCOPE - 找到所有容器                                      │
│    "tr" → [Row1, Row2, Row3, ...]                           │
├─────────────────────────────────────────────────────────────┤
│ 2. ANCHOR - 在容器中定位                                     │
│    ".name" contains "李四" → Row2                           │
├─────────────────────────────────────────────────────────────┤
│ 3. TARGET - 在定位的容器中操作                               │
│    ".btn-approve" → CLICK                                   │
└─────────────────────────────────────────────────────────────┘
```

```typescript
{
  scope: { type: 'container_list', selector: 'tr' },
  anchor: { type: 'text_match', selector: '.name', value: '{{student_name}}' },
  target: { selector: '.btn-approve', action: 'CLICK' }
}
```

### 五大基元 (Primitives)

| 基元 | 说明 | 文件位置 |
|------|------|----------|
| `CLICK` | 模拟点击 | `primitives.ts` |
| `INPUT` | 表单输入 | `primitives.ts` |
| `EXTRACT_TEXT` | 提取文本 | `primitives.ts` |
| `WAIT_FOR` | 等待元素 | `primitives.ts` |
| `NAVIGATE` | 页面导航 | `primitives.ts` |

### 选择器生成模块

| 模块 | 职责 |
|------|------|
| `analyzer.ts` | DOM 分析：容器识别、锚点候选、路径收集、语义评分 |
| `generator.ts` | 生成 Scope + Anchor + Target 选择器逻辑 |
| `validator.ts` | 实时验证选择器、计算匹配数量 |

### 跨页面录制架构

录制状态通过 `chrome.storage.session` 持久化，即使 Service Worker 重启也能恢复：

```
┌─────────────────────────────────────────────────────────────┐
│                    Background Service Worker                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  recordingState (chrome.storage.session)             │   │
│  │  ├── isRecording: boolean                            │   │
│  │  ├── tabId: number                                   │   │
│  │  └── startTime: number                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  监听器：                                                   │
│  ├── webNavigation.onCreatedNavigationTarget               │
│  │   → 检测从录制 Tab 打开的新 Tab，自动切换跟踪           │
│  ├── tabs.onActivated                                       │
│  │   → 用户切换 Tab 时自动跟踪并恢复录制                   │
│  ├── webNavigation.onCompleted                              │
│  │   → 页面加载完成时重新注入录制模式                      │
│  └── tabs.onRemoved                                         │
│       → Tab 关闭时清理录制状态                              │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    Content Script                            │
│  ├── isRecordMode: boolean (内存状态)                       │
│  ├── 监听 click/input 事件                                  │
│  └── 发送 ACTION_RECORDED 消息到 SidePanel                  │
└─────────────────────────────────────────────────────────────┘
```

工作流程：
1. 用户点击"开始录制" → SidePanel 通知 Background 设置状态
2. 用户点击链接打开新 Tab → `onCreatedNavigationTarget` 检测并更新 tabId
3. 新页面加载完成 → `onCompleted` 向 Content Script 发送 `START_RECORDING`
4. 录制继续 → Content Script 监听用户操作

### 路径选择器

对于复杂嵌套的单一元素，使用路径选择器代替 Scope+Anchor+Target：

```
目标: input.input-inner
  ↓ 向上递归分析祖先
div.official-header (score: 0.9) ← 语义根
  ↓
div.section (score: 0.6) ← 保留
  ↓
生成: .official-header .section input.input-inner
```

核心函数：
- `collectAncestorPath(element)`: 收集祖先路径信息
- `buildPathSelector(path, target)`: 构建路径选择器
- `calculateClassSemanticScore(class)`: 计算类名语义分数

---

## 🎨 UI 设计理念

### 心智交互 (Mindful Interaction)

我们的设计哲学基于 **"心智交互"** 趋势 — 从争夺注意力转向**尊重注意力**。

#### 三大原则

| 原则 | 实践 |
|------|------|
| **数字节食** | 减少非必要视觉噪音，界面能"淡出" |
| **渐进式披露** | 默认只显示核心信息，需要时再展开 |
| **空间高效** | 侧边栏寸土寸金，极致紧凑布局 |

#### 设计规范

```
色彩：Deep Space 暗色系
├── 背景：zinc-950（接近纯黑）
├── 卡片：zinc-900/50 + backdrop-blur（毛玻璃）
├── 边框：white/5（极淡）
└── 点缀：violet-500 → fuchsia-500（霓虹紫渐变）

选择器高亮色：
├── Scope: blue-500（容器范围）
├── Anchor: green-500（定位锚点）
└── Target: violet-500（操作目标）

排版：
├── 正文：text-[11px] ~ text-[13px]
├── 标签：text-[9px] ~ text-[10px]
└── 代码：JetBrains Mono / Geist Mono

交互：
├── 动效：transition-all duration-200 ease-out
├── 辉光：shadow-neon（hover 时）
└── 收折：渐进式披露，默认收起卡片
```

---

## 📋 开发检查清单

- [ ] 新功能是否遵循 Scope+Anchor+Target 模式？
- [ ] UI 组件是否保持紧凑（p-2/p-3，text-xs）？
- [ ] 是否实现了渐进式披露（默认收起）？
- [ ] 动效是否舒缓（duration-200+）？
- [ ] 是否添加了对应的测试页面？
- [ ] Content Script 消息处理是否有错误处理？
- [ ] AI 调用是否有重试机制？
- [ ] 录制功能是否支持跨页面/跨 Tab？
- [ ] 是否使用 `chrome.storage.session` 持久化关键状态？

---

## 🔧 常见问题

### "Could not establish connection" 错误

**原因**：Content Script 未加载

**解决**：
1. 刷新目标页面
2. 检查是否在 chrome:// 页面（不支持）
3. 重新加载扩展

### Dashboard 打不开

**解决**：
1. 确认扩展已加载
2. 使用 SidePanel 头部的 Dashboard 按钮
3. 或访问 `chrome-extension://[扩展ID]/src/dashboard/index.html`

### 选择器验证失败

**检查**：
1. Scope 选择器是否匹配到元素
2. Anchor 值是否与页面文本匹配
3. Target 选择器是否在匹配的 Scope 内

### 跨页面录制不工作

**原因**：Service Worker 生命周期或 Tab 跟踪问题

**解决**：
1. 检查 `manifest.json` 是否包含 `webNavigation` 权限
2. 确认录制状态是否正确存储到 `chrome.storage.session`
3. 查看 Background Console 是否有 `[Homura] Recording state restored` 日志
4. 如果是新 Tab，检查 `onCreatedNavigationTarget` 或 `onActivated` 是否触发

**调试方法**：
```
1. 打开 chrome://extensions/
2. 点击扩展的 "Service Worker" 链接
3. 查看 Console 日志，搜索 "[Homura]"
```

---

## 🚀 路线图

```
已完成：
├── ✅ MVP: 执行引擎 + Scope/Anchor/Target
├── ✅ v0.2: SidePanel 三模式
├── ✅ v0.3: Dashboard 工具库 + 规则书
├── ✅ v0.4: AI 服务集成
├── ✅ v0.5: 选择器生成模块
├── ✅ v0.6: 路径选择器 + AI Tool Calling
├── ✅ v0.7: UnifiedSelector + 双模式 UI
├── ✅ v0.7.1: 熵感知锚点 + 分割表格支持
└── ✅ v0.7.2: 跨页面/跨 Tab 录制

进行中：
└── 🚧 v1.0: AI 完整工具生成

计划中：
├── 📋 v1.5: Rule Book 解析执行
└── 📋 v2.0: Self-Healing 自动修复
```

---

## 🔧 SDK 抽离与定制插件开发 (2026-03-22 新增)

### 架构转型

从单一的 Chrome Extension 转变为 **SDK + 插件生态系统**：

```
Homura 主插件
    ↓ 依赖 SDK
@homura/sdk
    ↓ 依赖 SDK
定制插件 (你开发的插件)
```

### 开发优先级

| 优先级 | 任务 | 预估时间 | 状态 |
|--------|------|----------|------|
| P0 | SDK 基础抽离 | 1 周 | 🚧 进行中 |
| P0 | 主插件迁移到 SDK | 3 天 | 📋 待开始 |
| P1 | AI Agent 实现 | 1 周 | 📋 待开始 |
| P1 | Blueprint 导出功能 | 2 天 | 📋 待开始 |
| P2 | 自愈机制 | 3 天 | 📋 待开始 |
| P2 | CLI 工具 | 2 天 | 📋 待开始 |

### 详细任务清单

#### Phase 1: SDK 基础抽离
- [ ] 创建 Monorepo 结构
  ```bash
  mkdir -p packages/sdk
  # 配置 pnpm-workspace.yaml
  ```
- [ ] 抽离 types 模块
  - `src/shared/types.ts` → `packages/sdk/src/types/`
- [ ] 抽离 selector 模块
  - `src/shared/selectorBuilder/*` → `packages/sdk/src/selector/`
- [ ] 抽离 primitives 模块
  - `src/content/engine/primitives.ts` → `packages/sdk/src/primitives/`
- [ ] 抽离 executor 模块
  - `src/content/engine/executor.ts` → `packages/sdk/src/executor/`
- [ ] 配置 SDK 构建
  - TypeScript 编译
  - 单元测试
  - API 文档

#### Phase 2: AI Agent 实现
- [ ] 实现 AIAgent 基础类
- [ ] 实现 Rule Book 解析器
- [ ] 实现 LLM 调度器
- [ ] 实现执行上下文管理
- [ ] 编写 Agent 测试

#### Phase 3: Blueprint 导出
- [ ] 设计 Blueprint Schema
- [ ] 在 Dashboard 添加导出面板
- [ ] 实现 Blueprint 验证
- [ ] 实现 Blueprint 下载

#### Phase 4: 主插件迁移
- [ ] 修改主插件依赖 SDK
- [ ] 移除冗余代码
- [ ] 验证功能完整性
- [ ] 更新文档

#### Phase 5: 维护工具
- [ ] 实现运行时自愈
- [ ] 实现健康检查
- [ ] 实现 AI 批量修复
- [ ] 实现热更新机制

### 相关文档

- [SDK 架构设计](./sdk-architecture.md) - SDK 模块划分和 API 设计
- [AI Agent 模式](./ai-agent-mode.md) - Skills + Rules → AI Agent
- [Blueprint Schema](./blueprint-schema.md) - Blueprint 数据结构定义
- [插件维护机制](./plugin-maintenance.md) - 运行时自愈和开发时维护

### 使用 SDK 开发定制插件

```bash
# 未来使用 CLI 生成插件
homura create my-plugin --blueprint ./blueprint.json

# 当前手动创建
mkdir my-plugin
cd my-plugin
npm init -y
npm install @homura/sdk

# 编写插件代码
# 参考 AI Agent 模式文档
```

---

*本文档持续更新，记录最新的开发计划和任务*
