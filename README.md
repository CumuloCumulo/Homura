# 🔥 Homura

<div align="center">

**AI-Powered Browser Automation**

Define goals, not steps. Transform repetitive browser tasks into intelligent automation.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?logo=google-chrome)](https://chrome.google.com/webstore)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-orange.svg)](https://github.com/homura/homura)

</div>

---

## ✨ Features

- **🎯 Declarative Automation** — Define what you want, not how to get there
- **🤖 AI-Powered Decisions** — LLM handles complex logic, engine handles precise DOM operations
- **🔧 Smart Recording** — Record actions once, generate reusable tools automatically
- **🔄 Cross-Page Recording** — Continue recording across navigations and new tabs
- **💪 Self-Healing Selectors** — Automatic repair when page elements change
- **📊 Visual Debugging** — Real-time element highlighting and execution preview

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/homura/homura.git
cd homura

# Install dependencies
npm install

# Build the extension
npm run build
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `dist` folder

### Usage

Click the Homura icon in your toolbar to open the SidePanel:

| Mode | Description |
|------|-------------|
| **Inspect** | Hover over elements to analyze structure and generate selectors |
| **Record** | Record your actions to create reusable automation tools |

## 📖 Documentation

- [User Guide](docs/README.md) — Full documentation
- [SDK Reference](docs/sdk-architecture.md) — Build custom automations
- [Development](docs/DEVELOPMENT.md) — Contributing guide

## 🏗️ Architecture

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

## 🧩 Modular SDK

Homura's core is now available as a standalone SDK for building custom automations:

```typescript
import { analyzeElement, createUnifiedSelector } from '@homura/sdk/selector';
import { executeClick } from '@homura/sdk/primitives';

// Analyze an element and generate a robust selector
const element = document.querySelector('button');
const analysis = analyzeElement(element);
const selector = createUnifiedSelector(analysis);

// Execute with automatic retry and error handling
await executeClick(element);
```

[Learn more about the SDK →](docs/sdk-architecture.md)

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with 🔥 by the Homura Team**

[Documentation](docs/README.md) • [Report Issues](https://github.com/homura/homura/issues) • [Discussions](https://github.com/homura/homura/discussions)

</div>
