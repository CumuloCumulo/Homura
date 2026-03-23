<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Noto+Sans+SC&size=42&pause=2000&color=F97316&vCenter=true&width=600&height=60&lines=%F0%9F%94%A5+Homura;AI+%E9%A9%B1%E5%8A%A8%E7%9A%84%E6%B5%8F%E8%A7%88%E5%99%A8%E8%87%AA%E5%8A%A8%E5%8C%96" alt="Homura" />
  <img src="https://readme-typing-svg.demolab.com?font=Noto+Sans+SC&size=16&pause=3000&color=22D3EE&vCenter=true&width=550&repeat=true&lines=%E5%AE%9A%E4%B9%89%E7%9B%AE%E6%A0%87%EF%BC%8C%E8%80%8C%E9%9D%9E%E6%AD%A5%E9%AA%A4" alt="Tagline" />
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/homura/">
    <img src="https://img.shields.io/badge/Chrome-扩展-success?logo=google-chrome&style=for-the-badge" alt="Chrome" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/许可证-MIT-blue?style=for-the-badge" alt="License" />
  </a>
  <a href="https://github.com/homura/homura/releases">
    <img src="https://img.shields.io/badge/版本-1.1.0-orange?style=for-the-badge" alt="Version" />
  </a>
</p>

<p align="center">
  <a href="#-为什么选择-homura">为什么选择</a> •
  <a href="#-核心功能">核心功能</a> •
  <a href="#-快速开始">快速开始</a> •
  <a href="README.md">English</a>
</p>

---

## ✨ 为什么选择 Homura？

### 🎯 AI 时代的声明式自动化

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Noto+Sans+SC&size=14&pause=4000&color=A78BFA&vCenter=true&width=700&repeat=true&lines=传统+RPA%EF%BC%9A绘制复杂流程图;Homura%EF%BC%9A定义目标%2C+AI+自动规划路径" alt="对比" />
</p>

```
┌─────────────────────────────────────────────────────────────┐
│ 传统 RPA (命令式)                                             │
│  ┌─────┐   ┌─────┐   ┌─────┐                              │
│  │步骤1│ → │步骤2│ → │步骤3│ → ...                 │
│  └─────┘   └─────┘   └─────┘                              │
│  僵化的流程、手动分支、UI 变化即失效                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Homura (声明式)                                               │
│  ┌─────────────┐   ┌─────────────┐                        │
│  │ 技能库       │   │ 规则书        │                        │
│  └─────────────┘   └─────────────┘                        │
│           │                    │                            │
│           └────────────────────┴                            │
│                     ↓                                       │
│  ┌──────────────┐  ┌───────────────┘                       │
│  │ AI 智能体    │  │  执行引擎      │                       │
│  │ (智能决策)   │  │  (精确执行)    │                       │
│  └──────────────┘  └───────────────┘                       │
│  动态决策、自愈能力、AI 驱动的自适应                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 核心技术

### 大脑-肢体解耦架构

| 层级 | 职责 | 技术 |
|:-----:|:-----|:-----------|
| **大脑 (AI)** | 非确定性决策 | LLM + 规则书 |
| **肢体 (引擎)** | 确定性执行 | 作用域 + 锚点 + 目标 |

### 🔥 独特的选择器系统

**作用域 + 锚点 + 目标** — 三层定位，对 UI 变化稳健：

- ✅ **高熵值锚点** — 验证跨行唯一性
- ✅ **支持分栏表格** — 处理冻结列布局
- ✅ **单元格级定位** — 精确元素位置
- ✅ **自愈能力** — AI 自动修复损坏的选择器

---

## 🎨 核心功能

### 🤖 AI 驱动的编排
- **规则书驱动** — 用自然语言编写业务规则
- **动态决策** — AI 实时适应页面条件
- **迭代执行** — 持续执行直到目标达成
- **异常恢复** — AI 分析错误并尝试替代方案

### 🔧 智能录制
- **一键生成** — 录制操作，AI 生成工具
- **自动参数化** — AI 识别变量
- **跨页录制** — 跨页面持续录制
- **实时验证** — 录制时测试选择器

### 🛡️ 稳健执行
- **原子操作** — CLICK, INPUT, EXTRACT_TEXT, WAIT_FOR, NAVIGATE
- **毫秒级精度** — 直接 DOM 操作
- **可视化调试** — 实时高亮和预览
- **错误恢复** — 自动重试和回退

### 🎨 深空 UI
> *"用心交互 — 数字减负、平静界面、空间高效"*

---

## 🚀 快速开始

```bash
git clone https://github.com/homura/homura.git
cd homura
npm install
npm run build
```

### 加载到 Chrome
1. 打开 `chrome://extensions/`
2. 启用 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择 `dist` 文件夹

---

## 📦 模块化 SDK

```typescript
import { analyzeElement } from '"'"'@homura/sdk/selector'"'"';
import { executeClick } from '"'"'@homura/sdk/primitives'"'"';

const element = document.querySelector('"'"'button'"'"');
await executeClick(element, { delay: 100 });
```

```bash
npm install @homura/sdk
```

---

## 📚 文档

| 文档 | 描述 |
|:---------|:------------|
| [用户指南](docs/README.md) | 完整文档 |
| [开发指南](docs/DEVELOPMENT.md) | 贡献指南 |
| [SDK 架构](docs/specs/architecture/sdk-architecture.md) | SDK 参考 |

---

## 🛠️ 开发

```bash
npm install      # 安装依赖
npm run typecheck # 类型检查
npm run build:sdk # 构建 SDK
npm test         # 运行测试
```

---

## 🤝 贡献

欢迎贡献！请参阅 [开发指南](docs/DEVELOPMENT.md)

**核心原则：**
1. **规范驱动开发** — 先写规范
2. **类型安全优先** — 必须通过类型检查
3. **测试覆盖率 ≥80%**
4. **一致的命名** — 遵循命名规范

---

## 📄 许可证

MIT License — see [LICENSE](LICENSE)

---

<p align="center">
  <a href="docs/README.md">文档</a> •
  <a href="https://github.com/homura/homura/issues">报告问题</a> •
  <a href="https://github.com/homura/homura/discussions">讨论</a>
</p>
