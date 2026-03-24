# @homura/sdk Architecture

> 🎯 **Goal**: Extract Homura's core capabilities into a reusable SDK for building browser automation tools.

> ✅ **Status**: Phase 2 Complete — SDK extracted, compatibility layer removed, migration complete

---

## 📐 Design Principles

### 1. Code Reuse, Not Rewrite

The SDK is a **reorganization** of existing code, not a rewrite. Both the main Homura extension and future custom plugins depend on the same SDK.

### 2. Monorepo Structure

```
homura/
├── packages/
│   └── sdk/              # @homura/sdk - Core engine
├── src/                  # Chrome extension (depends on sdk)
├── package.json          # Root package.json
└── tsconfig.json         # Root TypeScript config
```

### 3. Zero Runtime Dependencies

The SDK contains pure logic only — no React, no UI frameworks. This ensures it can run in any browser environment.

---

## 📦 Module Structure

```
packages/sdk/
├── src/
│   ├── types/              # Core type definitions
│   │   ├── index.ts
│   │   ├── primitives.ts   # CLICK, INPUT, EXTRACT_TEXT, etc.
│   │   ├── selector.ts     # SelectorScope, SelectorAnchor, etc.
│   │   └── execution.ts    # ExecuteToolResult, ExecutionError, ExecutionState, etc.
│   ├── selector/           # Selector generation & validation
│   │   ├── index.ts
│   │   ├── analyzer.ts     # DOM analysis + semantic scoring
│   │   ├── generator.ts    # Dual-strategy generation
│   │   ├── types.ts        # Selector-specific types
│   │   └── validator.ts    # Real-time validation
│   ├── primitives/         # Atomic operations
│   │   ├── index.ts
│   │   ├── click.ts
│   │   ├── input.ts
│   │   ├── extract.ts
│   │   ├── wait.ts
│   │   └── navigate.ts
│   ├── executor/           # Single tool execution
│   │   ├── index.ts
│   │   └── tool.ts         # executeTool implementation
│   ├── engine/             # Multi-tool execution engine (NEW)
│   │   └── index.ts        # ExecutionEngine, state persistence
│   ├── agent/              # AI Agent (NEW)
│   │   └── index.ts        # AIAgent, autonomous decision making
│   ├── utils/              # Utility functions
│   │   ├── index.ts
│   │   ├── variables.ts    # Variable substitution
│   │   ├── text.ts         # Text matching
│   │   ├── truncate.ts     # String truncation
│   │   ├── sleep.ts        # Async delays
│   │   ├── messageId.ts    # Message ID generation
│   │   ├── dom.ts          # DOM utilities
│   │   └── pageState.ts    # Page state extraction for AI (NEW)
│   ├── constants.ts        # Shared constants
│   └── index.ts            # Main entry point
├── dist/                   # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔌 API Reference

### Selector Analysis

```typescript
import { analyzeElement, collectAncestorPath } from '@homura/sdk/selector';

// Analyze a DOM element
const element = document.querySelector('button');
const analysis = analyzeElement(element);

// Result includes:
// - tag, id, classes, attributes
// - text content
// - semantic role (button, link, input, etc.)
// - ancestor path with semantic scoring
```

### Selector Generation

```typescript
import {
  buildPathSelector,
  buildRelativeSelector,
  createUnifiedSelector,
  generateSelectorStrategies
} from '@homura/sdk/selector';

// Generate multiple strategies
const strategies = await generateSelectorStrategies(analysis, context);

// Create unified selector (SDK's main format)
const unified = createUnifiedSelector(analysis, 'CLICK');

// Result:
// {
//   id: 'sel_xxx',
//   strategy: 'path' | 'scope_anchor_target',
//   fullSelector: 'container button.submit',
//   pathData?: { ... },
//   structureData?: { ... },
//   action: { type: 'CLICK' },
//   confidence: 0.85
// }
```

### Selector Validation

```typescript
import {
  validateSelectorDraft,
  countMatches,
  findTargetElement
} from '@homura/sdk/selector';

// Validate selector works on current page
const result = validateSelectorDraft(selectorDraft);
// Returns: { valid: boolean, matchCount: number, error?: string }

// Count matches
const count = countMatches('button.submit');

// Find and return target element
const element = await findTargetElement(selectorLogic, params);
```

### Primitive Operations

```typescript
import {
  executeClick,
  executeInput,
  executeExtractText,
  executeWaitFor,
  executeNavigate
} from '@homura/sdk/primitives';

// Click an element
await executeClick(buttonElement, { delay: 100 });

// Input text
await executeInput(inputElement, { value: 'Hello World', clearFirst: true });

// Extract text
const text = await executeExtractText(element, { attribute: 'textContent' });

// Wait for element
await executeWaitFor(() => document.querySelector('.loaded'), { timeout: 5000 });

// Navigate
await executeNavigate('https://example.com');
```

### Tool Execution

```typescript
import { executeTool } from '@homura/sdk/executor';

// Define an atomic tool
const tool: AtomicTool = {
  tool_id: 'approve_button',
  name: 'Click Approve Button',
  parameters: { student_name: { type: 'string', required: true } },
  selector_logic: {
    target: {
      selector: '.btn-approve',
      action: 'CLICK'
    },
    scope: {
      type: 'container_list',
      selector: 'tr'
    },
    anchor: {
      type: 'text_match',
      selector: '.name',
      value: '{{student_name}}',
      matchMode: 'contains'
    }
  }
};

// Execute with parameters
const result = await executeTool(tool, { student_name: '张三' });

// Result:
// {
//   success: true,
//   data: undefined,
//   metadata: { duration: 145 }
// }
```

### Execution Engine (Multi-tool)

```typescript
import { createExecutionEngine } from '@homura/sdk/engine';

// Create engine with callbacks
const engine = createExecutionEngine({
  maxRetries: 3,
  failureStrategy: 'continue',
  onProgress: (state) => console.log('Progress:', state.currentIndex),
  onComplete: (state) => console.log('Complete!'),
  onError: (error, state) => console.error('Error:', error)
});

// Execute tool sequence
const state = await engine.execute([
  { tool: tool1, params: { name: 'test' } },
  { tool: tool2, params: {} }
]);

// Resume after page navigation
const resumedState = await engine.resume();
```

### AI Agent

```typescript
import { createAIAgent } from '@homura/sdk/agent';
import type { LLMClient } from '@homura/sdk/agent';

// Implement LLM client
const llmClient: LLMClient = {
  async chat(messages) {
    // Call your LLM API
    return { action: 'call_skill', skillId: '...', params: {} };
  }
};

// Create agent
const agent = createAIAgent(blueprint, {
  llmClient,
  maxIterations: 50,
  onProgress: (state) => console.log('Agent progress:', state)
});

// Execute
const result = await agent.execute({ studentName: '张三' });
```

---

## 📦 Package Exports

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types/index.js",
    "./selector": "./dist/selector/index.js",
    "./primitives": "./dist/primitives/index.js",
    "./utils": "./dist/utils/index.js",
    "./executor": "./dist/executor/index.js",
    "./engine": "./dist/engine/index.js",
    "./agent": "./dist/agent/index.js",
    "./constants": "./dist/constants.js"
  }
}
```

---

## 🔄 Import Architecture (v2.0)

### SDK Types/Functions — Direct Import from SDK

```typescript
// Types
import type {
  PrimitiveAction,
  UnifiedSelector,
  SelectorLogic,
  AtomicTool,
  ExecuteToolRequest,
  ExecuteToolResult
} from '@homura/sdk/types';

// Selector functions
import {
  analyzeElement,
  createUnifiedSelector,
  validateSelectorDraft,
  determineStrategy
} from '@homura/sdk/selector';

// Primitives
import {
  executeClick,
  executeInput,
  executeExtractText
} from '@homura/sdk/primitives';

// Executor
import { executeTool } from '@homura/sdk/executor';

// Utils
import {
  generateMessageId,
  sleep,
  substituteVariables,
  getPageState
} from '@homura/sdk/utils';

// Engine (Multi-tool execution)
import {
  createExecutionEngine,
  loadExecutionState,
  clearExecutionState
} from '@homura/sdk/engine';

// Agent (AI autonomous execution)
import {
  createAIAgent,
  type LLMClient,
  type AIAgentConfig
} from '@homura/sdk/agent';

// Constants
import { HIGHLIGHT_COLORS, TIMEOUTS } from '@homura/sdk/constants';
```

### Extension-Specific Types — Import from @shared

```typescript
// Messaging types (Chrome extension specific)
import type {
  MessageType,
  Message,
  HomuraMessage,
  ExecuteToolMessage,
  ExecutionResultMessage
} from '@shared/types';

// Chrome extension utilities
import {
  sendMessageToContent,
  getActiveTab
} from '@shared/utils';

// Extension constants
import {
  STORAGE_KEYS,
  EXTENSION_IDS
} from '@shared/constants';

// Recording state types
import type {
  RecordingState,
  RecordedAction
} from '@shared/selectorBuilder';
```

### Why This Architecture?

| Aspect | SDK (`@homura/sdk`) | Shared (`@shared/*`) |
|--------|---------------------|---------------------|
| **Purpose** | Reusable automation logic | Chrome Extension specifics |
| **Environment** | Any browser | Chrome Extension API |
| **Dependencies** | Zero runtime deps | Chrome types, messaging |
| **Use Case** | Custom plugins, standalone scripts | Main extension only |

---

## 📋 Completed Phases

### ✅ Phase 1: SDK Extraction (Complete)

- [x] Create `packages/sdk` directory structure
- [x] Configure build system (TypeScript, package.json)
- [x] Extract `types` module
- [x] Extract `selector` module (analyzer, generator, validator)
- [x] Extract `primitives` module
- [x] Extract `executor` module
- [x] Extract `utils` module
- [x] Create compatibility layer in main extension
- [x] Update build scripts

### ✅ Phase 2: Compatibility Layer Removal (Complete)

- [x] Refactor `src/shared/types.ts` — remove SDK re-exports
- [x] Refactor `src/shared/utils.ts` — remove SDK re-exports
- [x] Refactor `src/shared/constants.ts` — remove SDK re-exports
- [x] Refactor `src/shared/selectorBuilder/index.ts` — remove SDK re-exports
- [x] Update 23+ files to import directly from SDK
- [x] Fix `src/shared/index.ts` to re-export from SDK for convenience
- [x] Add helper exports to SDK selector module
- [x] TypeScript compilation passes
- [x] Build succeeds

### ✅ Phase 3: AI Agent (Complete)

- [x] Implement `AIAgent` class
- [x] Implement `ExecutionEngine` for state persistence
- [x] Implement `getPageState` for page context extraction
- [x] Implement cross-page execution recovery
- [x] Update orchestrator for background coordination
- [x] Navigate primitive refactored for background execution

See: [ai-agent-mode.md](../features/ai-agent-mode.md), [execution-engine.md](./execution-engine.md)

### 📋 Phase 4: Advanced Features (Planned)

- [ ] Self-healing selectors
- [ ] Automatic selector repair
- [ ] Blueprint export/import

---

## 🛠️ Development Workflow

### Building the SDK

```bash
# From packages/sdk/
npm run build          # Compile TypeScript
npm run dev            # Watch mode
npm run typecheck      # Type check only
npm run clean          # Remove dist/
```

### Building the Extension

```bash
# From root
npm run build:sdk          # Build SDK only
npm run build:extension    # Build extension (includes SDK)
npm run build              # Full build
```

### Testing

After building, load the extension:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → Select `dist` folder

---

*Last updated: 2026-03-24*
