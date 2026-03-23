<p align="center">
  <!-- Main Title with Typing Animation -->
  <img src="https://readme-typing-svg.demolab.com?font=Noto+Sans+SC&size=48&pause=2000&color=8B5CF6&vCenter=true&width=650&height=70&lines=Homura;AI+驱动的浏览器自动化" alt="Homura Title" />

  <!-- Tagline with Secondary Animation -->
  <img src="https://readme-typing-svg.demolab.com?font=Noto+Sans+SC&size=17&pause=3000&color=22D3EE&vCenter=true&width=600&repeat=true&lines=定义目标%2C+而非步骤;声明式自动化+for+the+AI+Era;用心交互设计" alt="Tagline" />
</p>

<p align="center">
  <!-- Badges -->
  <a href="https://chrome.google.com/webstore/detail/homura/">
    <img src="https://img.shields.io/badge/Chrome-扩展-8B5CF6?logo=google-chrome&logoColor=white&style=for-the-badge&logoWidth=20" alt="Chrome Extension" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/许可证-MIT-27272a?style=for-the-badge" alt="License" />
  </a>
  <a href="https://github.com/CumuloCumulo/Homura/releases">
    <img src="https://img.shields.io/badge/版本-1.1.0-D946EF?style=for-the-badge" alt="Version" />
  </a>
  <a href="https://www.npmjs.com/package/@homura/sdk">
    <img src="https://img.shields.io/badge/npm-@homura/sdk-34D399?style=for-the-badge&logo=npm&logoWidth=20" alt="SDK" />
  </a>
</p>

<p align="center">
  <!-- Navigation -->
  <a href="#-为什么选择-homura">为什么选择</a> •
  <a href="#-核心技术">核心技术</a> •
  <a href="#-核心功能">核心功能</a> •
  <a href="#-快速开始">快速开始</a> •
  <a href="#-模块化-sdk">SDK</a> •
  <a href="README.en.md">English</a>
</p>

<p align="center">
  <!-- Visitor Badge -->
  <img src="https://visitor-badge.laobi.icu/badge?page_id=CumuloCumulo.Homura" alt="Visitor Count" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/homura/homura/main/assets/demo.gif" alt="Demo GIF" width="850" />
</p>

---

<table>
<tr>
<td width="50%">

## ✨ 为什么选择 Homura？

### 🎯 AI 时代的声明式自动化

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Noto+Sans+SC&size=15&pause=4000&color=8B5CF6&vCenter=true&width=750&repeat=true&lines=传统+RPA%EF%BC%9A绘制复杂流程图%2C+手动配置分支;Homura%EF%BC%9A定义目标%2C+AI+自动规划执行路径" alt="Comparison" />
</p>

```
┌─────────────────────────────────────────────────────────────┐
│ 传统 RPA (命令式)                                             │
│  ┌─────┐   ┌─────┐   ┌─────┐                              │
│  │步骤1│ → │步骤2│ → │步骤3│ → ...                      │
│  └─────┘   └─────┘   └─────┘                              │
│  僵化的流程、手动分支、UI 变化即失效                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Homura (声明式)                                               │
│  ┌─────────────┐   ┌─────────────┐                        │
│  │ 技能库       │   │ 规则书        │                        │
│  │ (Skills)    │   │ (Rule Book)  │                        │
│  └─────────────┘   └─────────────┘                        │
│           │                    │                            │
│           └────────────────────┴                            │
│                     ↓                                       │
│  ┌──────────────┐  ┌───────────────┐                       │
│  │ AI 智能体    │  │  执行引擎      │                       │
│  │ (决策)       │  │  (精确执行)    │                       │
│  └──────────────┘  └───────────────┘                       │
│  动态决策、自愈能力、AI 驱动的自适应                             │
└─────────────────────────────────────────────────────────────┘
```

</td>
<td width="50%">

## 🏗️ 技术架构

### 大脑-肢体解耦设计

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Noto+Sans+SC&size=14&pause=3000&color=D946EF&vCenter=true&width=650&repeat=true&lines=AI+(大脑)+→+非确定性决策;引擎+(肢体)+→+确定性执行" alt="Brain-Limb" />
</p>

| 层级 | 职责 | 技术栈 |
|:-----:|:-----|:-------|
| **大脑 (AI)** | 非确定性决策 | LLM + 规则书 |
| **肢体 (引擎)** | 确定性执行 | Scope + Anchor + Target |

### 🎯 独特的选择器系统

**作用域 + 锚点 + 目标** — 三层定位架构：

```
┌─────────────────────────────────────────────────────────────┐
│ 1️⃣  SCOPE - 查找所有容器                                   │
│    selector: "tr.audit-row" → [Row1, Row2, Row3, ...]     │
├─────────────────────────────────────────────────────────────┤
│ 2️⃣  ANCHOR - 定位目标行                                    │
│    selector: ".name" contains "张三" → Row2                │
├─────────────────────────────────────────────────────────────┤
│ 3️⃣  TARGET - 在定位行内操作                                │
│    selector: "button.btn-approve" → CLICK                 │
└─────────────────────────────────────────────────────────────┘
```

**核心优势：**
- ✅ **高熵值锚点** — 验证跨行唯一性
- ✅ **分栏表格支持** — 处理冻结列布局
- ✅ **单元格级定位** — 精确元素位置
- ✅ **自愈能力** — AI 自动修复损坏的选择器

</td>
</tr>
</table>

---

## 🎨 核心功能

### 🤖 AI 驱动的编排

| 功能 | 说明 |
|:-----|:-----|
| **规则书驱动** | 用自然语言 (Markdown) 编写业务规则 |
| **动态决策** | AI 实时适应页面条件 |
| **迭代执行** | 持续执行直到目标达成 |
| **异常恢复** | AI 分析错误并尝试替代方案 |

### 🔧 智能录制

| 功能 | 说明 |
|:-----|:-----|
| **一键生成** | 录制操作，AI 生成可复用工具 |
| **自动参数化** | AI 识别变量 (如 "张三" → `{{student_name}}`) |
| **跨页录制** | 跨越导航和新标签页持续录制 |
| **实时验证** | 录制时实时测试选择器 |

### 🛡️ 稳健执行

| 功能 | 说明 |
|:-----|:-----|
| **原子操作** | CLICK, INPUT, EXTRACT_TEXT, WAIT_FOR, NAVIGATE |
| **毫秒级精度** | 直接 DOM 操作，无 Puppeteer 开销 |
| **可视化调试** | 实时元素高亮和执行预览 |
| **错误恢复** | 自动重试和回退策略 |

### 🎨 深空 UI 设计

> *"用心交互 — 数字减负、平静界面、空间高效"*

- **零学习曲线** — 熟悉的模式，渐进式披露
- **紧凑高效** — 为侧边栏优化
- **暗色主题** — 护眼，开发者友好
- **呼吸动画** — 微妙反馈，降低认知负荷

---

## 🚀 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/CumuloCumulo/Homura.git
cd Homura

# 安装依赖
npm install

# 构建扩展
npm run build
```

### 加载到 Chrome

1. 打开 `chrome://extensions/`
2. 启用 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择 `dist` 文件夹

### 首次自动化

<ol>
<li>点击工具栏中的 Homura 图标</li>
<li>切换到 <strong>录制</strong> 模式</li>
<li>在页面上执行你的操作</li>
<li>点击 <strong>生成工具</strong> — AI 创建可复用自动化</li>
<li>测试并保存到 <strong>工具库</strong></li>
</ol>

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    表现层 (Presentation)                    │
│  ┌──────────────┐  ┌───────────────┐                      │
│  │  SidePanel   │  │   Dashboard    │                      │
│  │              │  │               │                      │
│  │  • 检查器    │  │   • 工具库     │                      │
│  │  • 录制器    │  │   • 蓝图      │                      │
│  │  • 测试模式  │  │   • 规则书     │                      │
│  └──────────────┘  └───────────────┘                      │
├─────────────────────────────────────────────────────────────┤
│                    智能层 (Intelligence)                    │
│  ┌──────────────┐  ┌───────────────┐                      │
│  │  AI 服务     │  │   编排器       │                      │
│  │              │  │               │                      │
│  │  • 工具      │  │   • 智能体    │                      │
│  │  │  构建器   │  │   • 决策      │                      │
│  │  │           │  │   │   循环    │                      │
│  │  └───────────┘  │   └───────────┘                      │
│  └──────────────┘  └───────────────┘                      │
├─────────────────────────────────────────────────────────────┤
│                    执行层 (Execution)                       │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐   │
│  │   选择器     │  │    执行器      │  │  原语操作     │   │
│  │   引擎       │  │               │  │  (5 actions) │   │
│  │              │  │  ┌─────────┐ │  └──────────────┘   │
│  │  • 路径      │  │  │ 高亮器  │ │                      │
│  │  │ 结构     │  │  └─────────┘ │                      │
│  │  └──────────┘  │               │                      │
│  └──────────────┘  └───────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 模块化 SDK

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Noto+Sans+SC&size=15&pause=3000&color=8B5CF6&vCenter=true&width=600&repeat=true&lines=使用+Homura+核心作为独立+SDK;使用+@homura/sdk+构建自定义自动化" alt="SDK Tagline" />
</p>

```typescript
import { analyzeElement, createUnifiedSelector } from '@homura/sdk/selector';
import { executeClick } from '@homura/sdk/primitives';
import { executeTool } from '@homura/sdk/executor';

// 分析元素并生成稳健的选择器
const element = document.querySelector('button');
const analysis = analyzeElement(element);
const selector = createUnifiedSelector(analysis, 'CLICK');

// 使用自动重试和错误处理执行
await executeClick(element, { delay: 100 });
```

```bash
npm install @homura/sdk
```

---

## 📚 文档

| 文档 | 描述 |
|:---------|:------------|
| [用户指南](docs/README.zh-CN.md) | 完整文档 |
| [开发指南](docs/DEVELOPMENT.md) | 贡献指南 |
| [SDK 架构](docs/specs/architecture/sdk-architecture.md) | SDK 参考 |
| [UI 设计](docs/specs/ui/UI-DESIGN.md) | 设计系统 |

---

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 类型检查
npm run typecheck

# 构建 SDK
npm run build:sdk

# 构建扩展
npm run build:extension

# 运行测试
npm test
```

---

## 🤝 贡献

欢迎贡献！请参阅 [开发指南](docs/DEVELOPMENT.md)

**核心原则：**
1. **规范驱动开发** — 先写规范
2. **类型安全优先** — 必须通过类型检查
3. **测试覆盖率 ≥80%** — 维持高测试标准
4. **一致命名** — 遵循 [命名规范](docs/guides/naming-convention.md)

---

## 📄 许可证

MIT License — 详见 [LICENSE](LICENSE)

---

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Noto+Sans+SC&size=18&pause=3000&color=8B5CF6&vCenter=true&width=450&repeat=false&lines=用心设计+by+the+Homura+Team" alt="Footer" />

  <a href="docs/README.zh-CN.md">文档</a> •
  <a href="https://github.com/CumuloCumulo/Homura/issues">报告问题</a> •
  <a href="https://github.com/CumuloCumulo/Homura/discussions">讨论</a>
</p>

<p align="center">
  <!-- Star History Chart -->
  <a href="https://star-history.com/#CumuloCumulo/Homura&Timeline">
    <img src="https://api.star-history.com/svg?repos=CumuloCumulo/Homura&type=Timeline" alt="Star History Chart" />
  </a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/devicons/devicon/icons/typescript/typescript-original.svg" alt="TypeScript" width="30" height="30"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/icons/react/react-original.svg" alt="React" width="30" height="30"/>
  <img src="https://raw.githubusercontent.com/devicons/devicon/icons/chrome/chrome-original.svg" alt="Chrome" width="30" height="30"/>
</p>
