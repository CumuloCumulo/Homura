# 🔥 Homura - AI Browser Automation Agent

> Next-generation declarative AI browser automation. Define goals, not steps.

## 🎯 What is Homura?

Homura transforms traditional RPA (like Automa) from **imperative scripting** to **declarative automation**:

- **No flowcharts**: Users define "capabilities (tools)" and "goals (rules)", not step-by-step paths
- **AI-powered decisions**: LLM handles uncertain logic; engine handles precise DOM operations
- **Self-healing**: Automatic selector repair when elements change
- **Smart recording**: Record actions and let AI generate reusable tools

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Presentation Layer                          │
├────────────────────────────┬────────────────────────────────────┤
│  SidePanel (录制器)         │  Dashboard (管理中心)              │
│  • Inspect Mode (元素检查)  │  • Tool Library (工具库)          │
│  • Record Mode (操作录制)   │  • Rule Book Editor (规则书)      │
│  • Build Mode (选择器构建)  │  • Execution Logs (运行日志)      │
└────────────────────────────┴────────────────────────────────────┘
                              ↕ Messages
┌─────────────────────────────────────────────────────────────────┐
│                      Intelligence Layer                          │
│  • AI Client (通义 API)     - Selector generation               │
│  • Tool Builder Agent       - Recording → JSON tool             │
│  • Orchestrator Agent       - Rule Book → Tool calls            │
└─────────────────────────────────────────────────────────────────┘
                              ↕ Messages
┌─────────────────────────────────────────────────────────────────┐
│                       Execution Layer                            │
│  • Atomic Tool Engine       - Scope + Anchor + Target           │
│  • Selector Builder         - DOM analysis & generation         │
│  • Debug Highlighter        - Visual feedback                   │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/homura.git
cd homura

# Install dependencies
pnpm install

# Start development
pnpm dev

# Build for production
pnpm build
```

### Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

## 🖥️ Usage

### SidePanel (录制器)

Click the extension icon to open:

| Mode | Description |
|------|-------------|
| **检查 (Inspect)** | Click page elements to analyze structure |
| **录制 (Record)** | Record user actions for tool generation |
| **构建 (Build)** | Edit Scope + Anchor + Target selectors |

### Dashboard (管理中心)

Open via:
- Click the Dashboard icon in SidePanel header
- Right-click extension → Options
- `chrome-extension://[ID]/src/dashboard/index.html`

Features:
- **工具库**: Manage saved atomic tools
- **规则书**: Write automation rules in Markdown
- **执行日志**: View real-time execution logs

## 📦 Project Structure

```
src/
├── background/              # Service Worker (Orchestrator)
│   ├── index.ts            # Entry + message routing
│   └── orchestrator.ts     # Mission execution logic
│
├── content/                # Content Script (Executor)
│   ├── index.tsx           # Entry point
│   ├── messageHandler.ts   # Inspect/Record/Execute handlers
│   └── engine/
│       ├── executor.ts     # Atomic Tool Executor
│       ├── primitives.ts   # CLICK, INPUT, EXTRACT, etc.
│       └── highlighter.ts  # Debug overlays
│
├── sidepanel/              # Recording Assistant (React)
│   ├── App.tsx             # Main app with mode tabs
│   ├── components/
│   │   ├── Header.tsx      # Header with Dashboard link
│   │   ├── InspectMode.tsx # Element inspection UI
│   │   ├── RecordingPanel.tsx # Action recording UI
│   │   ├── SelectorBuilder.tsx # Selector editor
│   │   └── LogViewer.tsx   # Execution logs
│   ├── stores/
│   │   └── recordingStore.ts
│   └── utils/
│       └── ensureContentScript.ts
│
├── dashboard/              # Management Dashboard (React)
│   ├── App.tsx             # Main dashboard layout
│   ├── components/
│   │   ├── ToolLibrary.tsx # Tool cards
│   │   ├── RuleBookEditor.tsx # Markdown editor
│   │   └── ExecutionLog.tsx
│   └── stores/
│       └── toolStore.ts    # Persisted tool storage
│
├── services/               # External Services
│   └── ai/
│       ├── client.ts       # Tongyi API client
│       ├── prompts.ts      # AI prompt templates
│       └── types.ts
│
└── shared/                 # Shared Modules
    ├── types.ts            # Core type definitions
    ├── constants.ts
    ├── utils.ts
    └── selectorBuilder/    # Selector generation
        ├── analyzer.ts     # DOM structure analysis
        ├── generator.ts    # Scope+Anchor+Target gen
        └── validator.ts    # Real-time validation
```

## 🔧 Core Concepts

### Selector Logic: Scope + Anchor + Target

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SCOPE (作用域)                                            │
│    Find all containers: "tr" → [Row1, Row2, Row3, ...]      │
│    ┌─────────────────────────────────────────────────────┐  │
│    │  Row1: 张三 | 计算机学院 | [批准]                    │  │
│    │  Row2: 李四 | 艺术学院   | [批准]  ← 2. ANCHOR 匹配  │  │
│    │  Row3: 王五 | 数学学院   | [批准]                    │  │
│    └─────────────────────────────────────────────────────┘  │
│                                  ↓                          │
│                       3. TARGET: Click [批准]               │
└─────────────────────────────────────────────────────────────┘
```

### Atomic Tool (原子工具)

```json
{
  "tool_id": "click_approve",
  "name": "点击审批按钮",
  "parameters": {
    "student_name": { "type": "string", "required": true }
  },
  "selector_logic": {
    "scope": { "type": "container_list", "selector": "tr" },
    "anchor": { "type": "text_match", "selector": ".name", "value": "{{student_name}}" },
    "target": { "selector": ".btn-approve", "action": "CLICK" }
  }
}
```

### Primitives (底层基元)

| Primitive | Description | AI Modifiable |
|-----------|-------------|---------------|
| `CLICK` | Click an element | ❌ |
| `INPUT` | Input text | ❌ |
| `EXTRACT_TEXT` | Extract text content | ❌ |
| `WAIT_FOR` | Wait for element | ❌ |
| `NAVIGATE` | Navigate to URL | ❌ |

## 📋 Roadmap

- [x] **MVP**: Execution engine with Scope+Anchor+Target
- [x] **v0.2**: SidePanel recording modes (Inspect/Record/Build)
- [x] **v0.3**: Dashboard with Tool Library & Rule Book editor
- [x] **v0.4**: AI service integration (Tongyi API)
- [x] **v0.5**: Selector Builder with DOM analysis
- [ ] **v1.0**: Full AI-powered tool generation
- [ ] **v1.5**: Rule Book parser & orchestrator
- [ ] **v2.0**: Self-healing selectors

## 🎨 Design Philosophy

> **Mindful Interaction** - From "attention grabbing" to "attention respecting"

- 🧘 **Digital Diet**: Progressive disclosure, show only what's needed
- 🌙 **Calm Interface**: Deep space theme with subtle violet accents
- 📐 **Space Efficient**: Every pixel counts in sidepanel
- 🤖 **AI-First**: Designed for both humans and AI to understand

## 📄 License

MIT

---

Built with 🔥 by the Homura Team
