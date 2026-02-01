# Homura UI/UX 设计规范

> 🧘 Deep Space × Cyberpunk Zen × Mindful Interaction
> 
> **不是给工具赋能，而是给 AI 赋能**

---

## 🔥 核心设计哲学

### 颠覆传统：从"命令式"到"声明式"

#### 传统 RPA 的困境

```
传统工具（如 Automa）的设计逻辑：
┌─────────────────────────────────────────────────┐
│  用户画流程图 → 节点连线 → If/Else 分支配置    │
│                     ↓                           │
│         复杂的可视化工作流编辑器                │
│                     ↓                           │
│     AI 很难理解这种"意大利面条式"的逻辑        │
└─────────────────────────────────────────────────┘

问题：
├── 认知负荷高：用户需要学习"编程思维"
├── 维护困难：流程图一旦复杂就难以修改
├── AI 不友好：分支逻辑让 LLM 无法有效参与
└── 本末倒置：是在给"工具"赋能，而非给"AI"赋能
```

#### Homura 的范式转换

```
Homura 的设计逻辑：
┌─────────────────────────────────────────────────┐
│  用户定义"能力"（工具库）+ "目标"（规则书）    │
│                     ↓                           │
│      AI 理解规则，动态决策调用哪个工具          │
│                     ↓                           │
│     引擎精确执行 DOM 操作（毫秒级响应）         │
└─────────────────────────────────────────────────┘

核心转变：
├── 不画流程图，写自然语言规则
├── 不配置分支，让 AI 自己判断
├── 不维护脚本，让 AI 自动修复
└── 给 AI 赋能，而非被工具拘束
```

### 大脑与肢体解耦

| 角色 | 职责 | 特点 |
|------|------|------|
| **AI（大脑）** | 非确定性决策 | 理解规则、判断条件、选择策略、处理异常 |
| **引擎（肢体）** | 确定性执行 | 高精度点击、数据提取、循环遍历、选择器匹配 |

```
混合动力循环示意：

外层循环（引擎控制）          内层循环（AI 决策）
┌─────────────────┐          ┌─────────────────┐
│ for (id of ids) │    →     │ Page + RuleBook │
│    遍历100条    │          │       ↓         │
│    抓取数据     │    ←     │  AI: 调用工具A  │
│    执行结果     │          │       ↓         │
└─────────────────┘          │  AI: 调用工具B  │
     ↑ 稳定、高速              │       ↓         │
                             │  AI: 完成/异常  │
                             └─────────────────┘
                                  ↑ 灵活、智能
```

---

## 👥 用户角色分层

### 双轨用户体验

| 用户类型 | 主要界面 | 核心交互 | 技能要求 |
|----------|----------|----------|----------|
| **小白用户** | Rule Book 编辑器 | 用自然语言写业务逻辑 | 无需编程 |
| **进阶用户** | Sidebar 录制器 | 录制操作，扩充工具库 | 理解选择器 |

### UI 对应关系

```
小白用户路径：
Dashboard → 规则书编辑（Markdown）→ 一键运行

进阶用户路径：
Sidebar → 录制操作 → AI 生成工具 JSON → 加入工具库
```

---

## 🌟 心智交互 (Mindful Interaction)

### 核心价值观

**从"争夺注意力"到"尊重注意力"**

最好的设计是让用户几乎感受不到"设计"的存在，却能专注、舒适且高效地达成目标。

### 四大支柱

#### 1. 数字节食 (Digital Diet)

```
✗ 传统 RPA：信息密集轰炸，所有参数一次性展示
✓ Homura：渐进式披露，默认只显示必要信息
```

- 工具卡片默认收起：图标 + 名称 + 类型 + 执行按钮
- 详细参数需要主动展开才显示
- 规则书替代流程图，自然语言替代节点配置

#### 2. 平静界面 (Calm Interface)

```
✗ 传统 RPA：复杂画布、密集连线、弹窗轰炸
✓ Homura：深色基底 + 微弱紫色点缀 + 呼吸感动效
```

- 背景使用 `zinc-950`（接近纯黑但不刺眼）
- 交互反馈使用"呼吸感"动效而非剧烈变化
- 去画布化，无连线，无节点配置弹窗

#### 3. 空间高效 (Space Efficiency)

```
侧边栏宽度有限，寸土寸金
├── 紧凑内边距：p-2 / p-3（不用 p-4）
├── 小字号：text-[10px] ~ text-[13px]
├── 矮按钮：h-7 / h-8（不用 h-10+）
└── 细边框：border-white/5
```

#### 4. AI 友好 (AI-First Design)

```
✗ 传统设计：为人类设计，AI 难以理解
✓ Homura 设计：为 AI + 人类共同设计

具体实践：
├── 结构化数据：JSON Schema 替代代码片段
├── 语义化选择器：Scope + Anchor + Target 模式
├── 自然语言规则：Markdown 规则书
└── 轻量状态摘要：DOM → JSON（减少 Token 消耗）
```

---

## 🎨 界面形态

### Sidebar（录制助手）- AI-First 版本

```
┌─────────────────────────────────┐
│ [H] Homura        ● recording  │ ← 状态指示
├─────────────────────────────────┤
│  [ 开始检查 ]                   │ ← 控制面板
├─────────────────────────────────┤
│ ✨ AI 识别到表格结构            │ ← SmartStatus
│    已切换至 [Anchor Mode]       │
│ ┌─────────┬─────────┐          │
│ │ 路径模式 │结构模式 │          │ ← Mode Tab Bar
│ └─────────┴─────────┘          │
├─────────────────────────────────┤
│ 【路径模式】                    │
│   Target: button.btn-approve    │
│     │                           │
│     ├─ [✓] tr.audit-row (80%)  │ ← PathVisualizer
│     │                           │
│     └─ [✓] table#audit (90%)   │
│                                 │
│   选择器: table#audit tr button │
├─────────────────────────────────┤
│ 【结构模式】                    │
│   SCOPE: tr (blue)              │ ← StructureView
│   ANCHOR: .name = "{{name}}"    │
│   TARGET: button.btn-approve    │
│                                 │
│   [高亮] [点击] [读取]         │ ← 快速操作
├─────────────────────────────────┤
│ [AI优化] [复制]                 │ ← ActionBar
│ [保存到工具库]                  │
└─────────────────────────────────┘

特点：
├── AI-First：SmartStatus 展示决策过程
├── 双模式 Tab：Path / Structure 平滑切换
├── PathVisualizer：交互式祖先阶梯
├── StructureView：Scope+Anchor+Target
└── Framer Motion 动画过渡
```

### Dashboard（规则书编辑）

```
┌──────────────────────────────────────────────────────┐
│ Homura Dashboard                                      │
├────────────────┬─────────────────────────────────────┤
│                │                                      │
│  工具库        │  # 教室分配规则                     │
│  ┌──────────┐ │                                      │
│  │ 🔍 搜索  │ │  1. 对于每个【待审核请求】          │
│  └──────────┘ │  2. 如果是"艺术学院"                │
│  ┌──────────┐ │     → 优先【仙林校区】              │
│  │ ✓ 批准  │ │  3. 使用【搜索教室】工具            │
│  └──────────┘ │  4. 选择容量 > 申请人数的教室       │
│  ┌──────────┐ │  5. 如果没有 → 切换校区重试         │
│  │ ✕ 拒绝  │ │                                      │
│  └──────────┘ │                                      │
│                │                                      │
├────────────────┴─────────────────────────────────────┤
│  运行日志                                             │
│  [14:32:01] ✓ 批准: 张三                             │
│  [14:32:03] ✓ 搜索: 仙林校区                         │
└──────────────────────────────────────────────────────┘

特点：
├── 左侧：工具卡片堆栈（拖拽排序）
├── 右侧：Markdown 规则编辑器
└── 底部：实时运行日志
```

---

## 🎨 视觉系统

### 色彩规范

| 用途 | 颜色 | Tailwind |
|------|------|----------|
| **背景** | #09090b | `bg-zinc-950` |
| **卡片** | rgba(24,24,27,0.5) | `bg-zinc-900/50` |
| **边框** | rgba(255,255,255,0.05) | `border-white/5` |
| **正文** | #a1a1aa | `text-zinc-400` |
| **标题** | #fafafa | `text-zinc-50` |
| **主操作** | #8b5cf6 → #d946ef | `from-violet-500 to-fuchsia-500` |
| **高亮** | #a78bfa | `text-violet-400` |
| **成功** | #34d399 | `text-emerald-400` |
| **错误** | #fb7185 | `text-rose-400` |

### 语义色（选择器高亮）

```css
--scope-color: #3b82f6;   /* blue-500 - 容器范围 */
--anchor-color: #22c55e;  /* green-500 - 定位锚点 */
--target-color: #8b5cf6;  /* violet-500 - 操作目标 */
```

### 排版规范

| 用途 | 字号 | 字体 |
|------|------|------|
| 标题 | 13-14px | Inter |
| 正文 | 11-12px | Inter |
| 标签 | 9-10px | Inter |
| 代码/选择器 | 10-11px | JetBrains Mono |

---

## ✨ 动效规范

### 基本原则

1. **舒缓不急躁**：最小 `duration-200`
2. **有目的性**：每个动效都应传达信息
3. **可选关闭**：尊重 `prefers-reduced-motion`

### 动效类型

| 类型 | 用途 | 实现 |
|------|------|------|
| **呼吸** | 状态指示灯 | `animate-breathing` (3s) |
| **辉光** | Hover 反馈 | `shadow-neon` |
| **滑入** | 列表项出现 | `animate-slide-down` |
| **收折** | 卡片展开 | `grid-template-rows` transition |

### Framer Motion 动效（AI-First 组件）

| 动效 | 组件 | 实现 |
|------|------|------|
| **Tab 切换** | ModeTabBar | `AnimatePresence mode="wait"` |
| **Tab 指示器** | TabButton | `layoutId="tab-indicator"` |
| **状态面板** | SmartStatus | `initial={{ opacity: 0, y: -10 }}` |
| **祖先阶梯** | PathVisualizer | `staggerChildren: 0.05` |
| **悬停偏移** | AncestorItem | `whileHover={{ x: 4 }}` |
| **进度条** | SmartStatus | `animate={{ x: '100%' }}` loop |

---

## 🤖 AI-First 组件规范

### SmartStatus 组件 - AI 决策面板

AI 思考过程的可视化，替代传统静态标题。

```tsx
// 状态流: idle → analyzing → decided
<motion.div className="bg-zinc-900/80 border border-violet-500/20 rounded-lg p-3">
  <div className="flex items-center gap-2.5">
    <SparklesIcon className="w-4 h-4 text-fuchsia-400 animate-pulse" />
    <span className="text-xs text-zinc-300">
      AI 识别到重复列表结构，已切换至 
      <code className="text-emerald-400">Anchor Mode</code>
    </span>
  </div>
  {/* 分析中进度条 */}
  {status === 'analyzing' && (
    <motion.div className="h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
  )}
</motion.div>
```

**Props:**
- `status: 'idle' | 'analyzing' | 'decided'`
- `strategy: 'path_selector' | 'scope_anchor_target' | null`
- `reasoning?: string` - AI 的决策理由
- `onOverride?: (mode: 'path' | 'structure') => void`

### PathVisualizer 组件 - 路径模式视图

垂直祖先阶梯，交互式选择包含层级。

```
Target: input.input-inner
    │
    ├── [x] div.input (10%) ← 灰色，未勾选
    │
    ├── [✓] div.section (60%) ← 正常
    │
    └── [✓] div.official-header (90%) ← 语义根高亮
```

**特性:**
- Checkbox 控制层级包含状态
- 语义评分颜色编码: `emerald` (≥70%) / `yellow` (≥40%) / `zinc`
- Framer Motion 交错动画
- 底部显示生成的选择器

**Props:**
- `ancestorPath: AncestorInfo[]`
- `pathSelector?: PathSelector`
- `onPathChange?: (includedDepths: number[]) => void`

### StructureView 组件 - 结构模式视图

Scope + Anchor + Target 的可视化配置。

**颜色编码:**
| 组件 | 颜色 | Tailwind |
|------|------|----------|
| Scope (容器) | 蓝色 | `text-blue-400` |
| Anchor (锚点) | 绿色 | `text-emerald-400` |
| Target (目标) | 紫色 | `text-violet-400` |

**特性:**
- 快速操作面板（高亮、点击、输入、读取）
- 锚点候选列表（可选择、可展开）
- 选择器输入框（可编辑）
- 动作类型下拉选择

### Mode Tab Bar - 模式切换

使用 Framer Motion `layoutId` 实现平滑指示器动画。

```tsx
<div className="flex gap-1 p-1 bg-zinc-900/50 rounded-lg">
  <TabButton active={mode === 'path'}>路径模式</TabButton>
  <TabButton active={mode === 'structure'}>结构模式</TabButton>
  <motion.div layoutId="tab-indicator" className="bg-zinc-800 rounded-md" />
</div>
```

---

## 🧱 通用组件规范

### 工具卡片（核心组件）

```jsx
// 收起状态 - 极简信息
<div className="bg-zinc-900/50 border border-white/5 rounded-lg">
  <div className="flex items-center gap-2.5 px-3 py-2.5">
    <Icon />           {/* 动作类型图标 */}
    <span>工具名称</span>
    <Badge>CLICK</Badge>
    <ChevronIcon />    {/* 展开指示 */}
    <PlayButton />     {/* 快速执行 */}
  </div>
</div>

// 展开状态 - 渐进披露
<div className="bg-zinc-800/60 border border-violet-500/20 shadow-neon">
  {/* 头部保持不变 */}
  <div className="animate-fade-in">
    <Description />    {/* 工具描述 */}
    <SelectorInfo />   {/* Scope/Anchor/Target */}
    <Parameters />     {/* 输入参数 */}
    <ExecuteButton />  {/* 执行按钮 */}
  </div>
</div>
```

### 输入框（填空题风格）

```jsx
<input className="
  w-full h-8 px-0 text-xs font-mono
  bg-transparent border-b border-zinc-800
  text-zinc-200 placeholder:text-zinc-700
  focus:border-violet-500/50 focus:outline-none
" />
```

### 规则书编辑器

```jsx
// Markdown 编辑区域
<textarea className="
  w-full h-full p-4 font-mono text-sm
  bg-zinc-900/30 text-zinc-300
  placeholder:text-zinc-600
  focus:outline-none
  resize-none
" />
```

---

## 🎯 交互模式

### 渐进式披露

```
层级 1：扫描 → 只看工具图标和名称
层级 2：探索 → 展开查看选择器和参数
层级 3：操作 → 填写参数并执行
层级 4：编辑 → 进入 Dashboard 修改规则
```

### AI 协作模式

```
用户录制操作 → AI 理解意图 → 生成工具 JSON
      ↓                              ↓
用户编写规则 → AI 解析规则 → 决策调用工具
      ↓                              ↓
执行失败时   → AI 分析原因 → 自动修复选择器
```

### 反馈层级

| 优先级 | 类型 | 表现 |
|--------|------|------|
| P0 | 错误 | `rose-400` + 震动 |
| P1 | 成功 | `emerald-400` + 闪烁 |
| P2 | 进行中 | `violet-400` + 脉冲 |
| P3 | 信息 | `zinc-400` + 淡入 |

---

## 📐 布局规范

### SidePanel 结构

```
┌─────────────────────────┐ ← Header (py-2.5)
│ [H] Homura    [status]  │
├─────────────────────────┤ ← Tabs (py-2)
│ [Tools] [Logs(n)]       │
├─────────────────────────┤
│   Quick Action          │ ← 一键测试
│   Tool Card 1 (收起)    │ ← space-y-2
│   Tool Card 2 (收起)    │
│   Tool Card 3 (展开)    │
├─────────────────────────┤ ← Footer (py-1.5)
│ v0.1.0        ● idle    │
└─────────────────────────┘
```

### 间距规范

| 元素 | 内边距 | 间距 |
|------|--------|------|
| 容器 | p-3 | - |
| 卡片 | px-3 py-2.5 | space-y-2 |
| 输入区 | - | space-y-2.5 |
| 代码块 | p-2 | space-y-1.5 |

---

## 💎 设计总结

### 做加法

- ✅ AI 辅助录制
- ✅ AI 自动修复
- ✅ AI 语义理解
- ✅ 自然语言规则

### 做减法

- ❌ 画布 (Canvas)
- ❌ 连线 (Lines)
- ❌ If/Else 节点配置
- ❌ 复杂参数弹窗

### 核心原则

> **不是给工具赋能，而是给 AI 赋能**
> 
> 设计适合 AI 理解的数据结构，设计适合人类操作的极简界面。
> 让 AI 处理"思考"，让引擎处理"执行"，让用户专注"目标"。

---

*🧘 设计的最高境界是让用户忘记设计的存在*
