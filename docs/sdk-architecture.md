# @homura/sdk Architecture

> 🎯 **Goal**: Extract Homura's core capabilities into a reusable SDK for building browser automation tools.

> ✅ **Status**: Phase 1 Complete — SDK extracted and functional

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
│   │   └── execution.ts    # ExecuteToolResult, ExecutionError, etc.
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
│   ├── executor/           # Tool execution engine
│   │   ├── index.ts
│   │   └── tool.ts         # executeTool implementation
│   ├── utils/              # Utility functions
│   │   ├── index.ts
│   │   ├── variables.ts    # Variable substitution
│   │   ├── text.ts         # Text matching
│   │   ├── truncate.ts     # String truncation
│   │   ├── sleep.ts        # Async delays
│   │   ├── messageId.ts    # Message ID generation
│   │   └── dom.ts          # DOM utilities
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
    "./constants": "./dist/constants.js"
  }
}
```

---

## 🚀 Usage in Extension

The Homura extension uses a **compatibility layer** to maintain backward compatibility:

```typescript
// src/shared/selectorBuilder/index.ts
export * from '@homura/sdk/selector';

// Extension-specific types remain here
export interface RecordingState { ... }
export interface RecordedAction { ... }
```

This means:
- Existing code continues to work with old imports
- New code can import directly from `@homura/sdk`
- Extension-specific features stay in the extension

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

### 📋 Phase 2: AI Agent (Planned)

- [ ] Implement `AIAgent` class
- [ ] Implement Rule Book parser
- [ ] Implement LLM dispatcher

### 📋 Phase 3: Advanced Features (Planned)

- [ ] Self-healing selectors
- [ ] Automatic selector repair
- [ ] Blueprint export/import

---

*Last updated: 2026-03-22*
