# 🔥 Homura - AI Browser Automation Agent

> Next-generation declarative AI browser automation. Define goals, not steps.

## 🎯 What is Homura?

Homura transforms traditional RPA (like Automa) from **imperative scripting** to **declarative automation**:

- **No flowcharts**: Users define "capabilities (tools)" and "goals (rules)", not step-by-step paths
- **AI-powered decisions**: LLM handles uncertain logic; engine handles precise DOM operations
- **Self-healing**: Automatic selector repair when elements change
- **Smart recording**: Record actions and let AI generate reusable tools
- **Cross-page recording**: Continue recording across page navigations and new tabs
- **Dual-strategy selectors**: AI automatically chooses Path or Structure mode based on DOM analysis

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Presentation Layer                          │
├────────────────────────────┬────────────────────────────────────┤
│  SidePanel (录制器)         │  Dashboard (管理中心)              │
│  ├── Inspect Mode 元素检查  │  ├── Tool Library 工具库          │
│  │   ├── 路径模式 (Path)    │  ├── Rule Book Editor 规则书      │
│  │   └── 结构模式 (Structure)│  └── Execution Log 运行日志       │
│  ├── Record Mode 操作录制   │                                    │
│  └── Quick Actions 快速操作 │                                    │
└────────────────────────────┴────────────────────────────────────┘
                              ↕ Chrome Messages
┌─────────────────────────────────────────────────────────────────┐
│                      Intelligence Layer                          │
│  ├── AI Client (通义 API)     选择器生成、策略路由              │
│  │   ├── Smart Router         智能策略选择 (Path vs Structure)  │
│  │   └── UnifiedSelector      统一选择器 Schema                 │
│  ├── Tool Builder Agent       录制 → JSON 工具                  │
│  └── Orchestrator Agent       规则 → 决策调用                   │
└─────────────────────────────────────────────────────────────────┘
                              ↕ Chrome Messages
┌─────────────────────────────────────────────────────────────────┐
│                       Execution Layer                            │
│  ├── Atomic Tool Engine       UnifiedSelector 执行器            │
│  ├── Selector Builder         DOM 分析与双策略生成              │
│  │   ├── Path Strategy        语义路径选择器                    │
│  │   └── Scope+Anchor+Target  结构化选择器                      │
│  └── Debug Highlighter        调试可视化                        │
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
| **录制 (Record)** | Record user actions for tool generation (supports cross-page & cross-tab) |

#### Inspect Mode Features

| Tab | Description |
|-----|-------------|
| **路径模式 (Path)** | Semantic ancestor path visualization with toggleable nodes |
| **结构模式 (Structure)** | Scope + Anchor + Target configuration for repeating elements |

**Quick Actions** (available in both modes):
- 🔍 **高亮**: Highlight target element on page
- 👆 **点击**: Test click action
- 📄 **读取**: Extract text content
- ✏️ **填写**: Test input action

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
│   ├── index.ts            # Entry + message routing + recording state management
│   └── orchestrator.ts     # Mission execution logic
│
├── content/                # Content Script (Executor)
│   ├── index.tsx           # Entry point
│   ├── messageHandler.ts   # Inspect/Record/Execute handlers
│   └── engine/
│       ├── executor.ts     # UnifiedSelector Executor
│       ├── primitives.ts   # CLICK, INPUT, EXTRACT, etc.
│       └── highlighter.ts  # Debug overlays
│
├── sidepanel/              # Recording Assistant (React)
│   ├── App.tsx             # Main app with mode tabs
│   ├── components/
│   │   ├── Header.tsx      # Header with Dashboard link
│   │   ├── InspectMode.tsx # Element inspection (main orchestrator)
│   │   ├── SmartStatus.tsx # AI decision panel
│   │   ├── PathVisualizer.tsx   # Path mode view + quick actions
│   │   ├── StructureView.tsx    # Structure mode view + quick actions
│   │   ├── RecordingPanel.tsx   # Action recording UI
│   │   └── LogViewer.tsx   # Execution logs
│   ├── stores/
│   │   └── recordingStore.ts    # State with UnifiedSelector
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
│       ├── smartRouter.ts  # Strategy routing logic
│       ├── prompts.ts      # AI prompt templates
│       └── types.ts
│
└── shared/                 # Shared Modules
    ├── types.ts            # Core types (incl. UnifiedSelector)
    ├── constants.ts
    ├── utils.ts
    └── selectorBuilder/    # Selector generation
        ├── analyzer.ts     # DOM analysis + semantic scoring
        ├── generator.ts    # Dual-strategy generator + converters
        ├── types.ts        # Selector-specific types
        └── validator.ts    # Real-time validation
```

## 🔧 Core Concepts

### UnifiedSelector (统一选择器)

Homura uses a unified selector schema that supports two strategies:

```typescript
interface UnifiedSelector {
  id: string;                    // Unique ID
  strategy: 'path' | 'scope_anchor_target' | 'direct';
  fullSelector: string;          // Final CSS selector
  confidence: number;            // 0-1 confidence score
  validated: boolean;            // Has been validated
  
  // Path Strategy Data
  pathData?: {
    root: string;                // Semantic root (e.g. ".header")
    intermediates: string[];     // Path nodes (e.g. [".nav"])
    target: string;              // Target selector (e.g. "button.submit")
  };
  
  // Structure Strategy Data
  structureData?: {
    scope: { selector: string; type: 'container_list' | 'single_container' };
    anchor?: { selector: string; type: 'text_match' | 'attribute_match'; value: string };
    target: { selector: string };
  };
  
  action: { type: 'CLICK' | 'INPUT' | 'EXTRACT' | 'WAIT' | 'NAVIGATE'; params?: object };
}
```

### Strategy 1: Path Selector (路径选择器)

Best for **single, complex, or non-repeating elements**:

```
目标: input.search-input
        ↓ 向上遍历 DOM 树
div.search-box (score: 0.2) ← 跳过
        ↓
header.main-header (score: 0.9) ← 语义根 ✓
        
生成: .main-header .search-box input.search-input
置信度: 85%
```

### Strategy 2: Scope + Anchor + Target (结构选择器)

Best for **repeating structures** (tables, lists, cards):

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

### Smart Routing (智能路由)

AI automatically selects the best strategy:

| Condition | Strategy |
|-----------|----------|
| Repeating container (table/list) detected | `scope_anchor_target` |
| Single element with semantic ancestors | `path` |
| Simple unique element | `direct` |

### Atomic Tool (原子工具)

```json
{
  "tool_id": "click_approve",
  "name": "点击审批按钮",
  "parameters": {
    "student_name": { "type": "string", "required": true }
  },
  "unified_selector": {
    "strategy": "scope_anchor_target",
    "fullSelector": "tr .btn-approve",
    "structureData": {
      "scope": { "selector": "tr", "type": "container_list" },
      "anchor": { "selector": ".name", "type": "text_match", "value": "{{student_name}}" },
      "target": { "selector": ".btn-approve" }
    },
    "action": { "type": "CLICK" },
    "confidence": 0.92
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
- [x] **v0.6**: Path Selector + AI Smart Routing
- [x] **v0.7**: UnifiedSelector Schema + Dual-Mode UI
- [x] **v0.7.1**: Entropy-aware Anchor + Split Table Support
- [x] **v0.7.2**: Cross-page & Cross-tab Recording
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
