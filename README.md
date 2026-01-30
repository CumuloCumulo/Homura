# 🔥 Homura - AI Browser Automation Agent

> Next-generation declarative AI browser automation. Define goals, not steps.

## 🎯 What is Homura?

Homura transforms traditional RPA (like Automa) from **imperative scripting** to **declarative automation**:

- **No flowcharts**: Users define "capabilities (tools)" and "goals (rules)", not step-by-step paths
- **AI-powered decisions**: LLM handles uncertain logic; engine handles precise DOM operations
- **Self-healing**: Automatic selector repair when elements change

## 📐 Architecture

```
┌─────────────────────────────────────────────┐
│ SidePanel (Presentation Layer)              │
│ - Recording Assistant                       │
│ - Tool Library Management                   │
│ - Execution Logs                            │
└─────────────────────────────────────────────┘
                    ↕ Messages
┌─────────────────────────────────────────────┐
│ Background (Intelligence Layer)             │
│ - Orchestrator (LLM-powered in v1.0)       │
│ - Rule Book Parser                          │
└─────────────────────────────────────────────┘
                    ↕ Messages
┌─────────────────────────────────────────────┐
│ Content Script (Execution Layer)            │
│ - Atomic Tool Engine                        │
│ - Scope + Anchor + Target Selection         │
│ - Debug Highlighter                         │
└─────────────────────────────────────────────┘
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
```

### Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

## 🧪 Testing

1. Open the test page: `dist/test-page.html` (or any page with a table)
2. Click the Homura extension icon to open the SidePanel
3. Click "Run Test Mission" to test the Scope+Anchor+Target execution

## 📦 Project Structure

```
src/
├── background/          # Service Worker (Orchestrator)
│   ├── index.ts        # Entry point
│   ├── messaging.ts    # Communication utilities
│   └── orchestrator.ts # Mission execution logic
│
├── content/            # Content Script (Executor)
│   ├── index.tsx       # Entry point
│   ├── messageHandler.ts
│   └── engine/
│       ├── executor.ts    # Atomic Tool Executor
│       ├── primitives.ts  # CLICK, INPUT, EXTRACT, etc.
│       └── highlighter.ts # Debug overlays
│
├── sidepanel/          # React UI
│   ├── App.tsx
│   ├── components/
│   └── stores/
│
└── shared/             # Shared types & utilities
    ├── types.ts        # Core type definitions
    ├── constants.ts
    └── utils.ts
```

## 🔧 Core Concepts

### Atomic Tool (原子工具)

A reusable automation action defined in JSON:

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

### Selector Logic: Scope + Anchor + Target

1. **Scope**: Find container elements (e.g., all table rows)
2. **Anchor**: Match specific container (e.g., row with name "张三")
3. **Target**: Operate on element within context (e.g., click Approve button)

### Primitives (底层基元)

Hardcoded atomic actions that AI cannot modify:

- `CLICK` - Click an element
- `INPUT` - Input text
- `EXTRACT_TEXT` - Extract text content
- `WAIT_FOR` - Wait for element
- `NAVIGATE` - Navigate to URL

## 📋 Roadmap

- [x] **MVP**: Execution engine with Scope+Anchor+Target
- [ ] **v1.0**: Smart recording, LLM integration
- [ ] **v1.5**: Rule Book editor (Markdown)
- [ ] **v2.0**: Self-healing selectors

## 📄 License

MIT

---

Built with 🔥 by the Homura Team
