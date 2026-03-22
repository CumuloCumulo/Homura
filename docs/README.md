# 📚 Homura Documentation

> 🔥 **Next-Gen AI Browser Automation Agent**

---

## 📖 Documentation Index

### Getting Started

| Document | Description |
|----------|-------------|
| [Project Vision](./project-vision.md) | Core philosophy and design principles |
| [Quick Start](../README.md) | Installation and basic usage |

### Core Concepts

| Document | Description |
|----------|-------------|
| [Selector System](./selector.md) | UnifiedSelector schema and dual-strategy routing |
| [AI Constraints](./ai-constraints.md) | Primitives and sandboxed execution model |
| [Blueprint Schema](./blueprint-schema.md) | Data structures and validation rules |

### SDK & Extension

| Document | Description |
|----------|-------------|
| [SDK Architecture](./sdk-architecture.md) | **@homura/sdk** module structure and API |
| [AI Agent Mode](./ai-agent-mode.md) | Skills + Rules → Autonomous execution |
| [Plugin Maintenance](./plugin-maintenance.md) | Runtime self-healing and hot-reload |

### Development

| Document | Description |
|----------|-------------|
| [Development Guide](./DEVELOPMENT.md) | Project structure and development workflow |
| [UI Design](./UI-DESIGN.md) | Component specs and UX guidelines |
| [Key Considerations](./key-considerations.md) | Important development notes |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                   │
│  ┌─────────────┐  ┌─────────────┐                      │
│  │  SidePanel  │  │  Dashboard  │                      │
│  │  Inspector  │  │  Tool Lib   │                      │
│  │  Recorder   │  │  Rule Book  │                      │
│  └─────────────┘  └─────────────┘                      │
├─────────────────────────────────────────────────────────┤
│                   Intelligence Layer                    │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │
│  │ AI Service  │  │ Smart Route │  │ Tool Builder │   │
│  └─────────────┘  └─────────────┘  └──────────────┘   │
├─────────────────────────────────────────────────────────┤
│                    Execution Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │
│  │   Selector  │  │   Executor  │  │  Primitives  │   │
│  │    Engine   │  │    Engine   │  │  (5 actions) │   │
│  └─────────────┘  └─────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 Core Concepts

### UnifiedSelector

Homura uses a unified selector schema that supports multiple strategies:

```typescript
interface UnifiedSelector {
  id: string;                    // Unique ID
  strategy: 'path' | 'scope_anchor_target' | 'direct';
  fullSelector: string;          // Final CSS selector
  confidence: number;            // 0-1 confidence score

  // Path Strategy Data
  pathData?: {
    root: string;                // Semantic root
    intermediates: string[];     // Path nodes
    target: string;              // Target selector
  };

  // Structure Strategy Data
  structureData?: {
    scope: { selector: string; type: 'container_list' | 'single_container' };
    anchor?: { selector: string; type: 'text_match' | 'attribute_match'; value: string };
    target: { selector: string };
  };

  action: { type: 'CLICK' | 'INPUT' | 'EXTRACT_TEXT' | 'WAIT_FOR' | 'NAVIGATE'; params?: object };
}
```

### Strategy Selection

| Scenario | Strategy | Example |
|----------|----------|---------|
| Repeating elements (tables, lists) | `scope_anchor_target` | Click button in specific table row |
| Single nested element | `path` | Click submit button in form |
| Simple unique element | `direct` | Click element with unique ID |

### Five Primitives

| Primitive | Description | Modifiable |
|-----------|-------------|------------|
| `CLICK` | Click an element | ❌ |
| `INPUT` | Input text | ❌ |
| `EXTRACT_TEXT` | Extract text content | ❌ |
| `WAIT_FOR` | Wait for element | ❌ |
| `NAVIGATE` | Navigate to URL | ❌ |

---

## 🗺️ Roadmap

| Version | Goal | Status |
|---------|------|--------|
| MVP | Execution engine + Scope/Anchor/Target | ✅ |
| v0.5 | Selector generation + DOM analysis | ✅ |
| v0.6 | Path selector + AI routing | ✅ |
| v0.7 | UnifiedSelector + dual-mode UI | ✅ |
| v0.7.1 | High-entropy anchors + split tables | ✅ |
| v0.7.2 | Cross-page + cross-tab recording | ✅ |
| **v1.0** | **SDK extraction + AI Agent** | ✅ |
| v1.5 | Blueprint export + plugin ecosystem | 📋 Planned |
| v2.0 | Self-healing selectors | 📋 Planned |

---

*Last updated: 2026-03-22*
