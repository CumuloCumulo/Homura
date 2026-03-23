# Homura 开发指南

> 🔥 Next-Gen AI Browser Automation Agent

---

## 📁 项目结构

```
homura/
├── packages/                   # SDK 模块 (Monorepo)
│   └── sdk/                    # @homura/sdk - 核心引擎
│       ├── src/
│       │   ├── types/          # 类型定义
│       │   ├── selector/       # 选择器引擎
│       │   ├── primitives/     # 原子操作
│       │   ├── executor/       # 工具执行
│       │   ├── utils/          # 工具函数
│       │   └── constants.ts
│       ├── dist/               # 编译输出
│       └── package.json
│
├── docs/                        # 开发文档
├── public/
│   ├── icons/                  # 扩展图标
│   └── test-pages/             # 测试页面
│
└── src/                         # Chrome Extension (依赖 SDK)
    ├── background/             # Service Worker（智能层）
    │   ├── index.ts           # 入口 + 消息路由 + AI 初始化 + 录制状态管理
    │   └── orchestrator.ts    # 任务编排逻辑
    │
    ├── content/               # Content Script（执行层）
    │   ├── index.tsx          # 入口
    │   ├── messageHandler.ts  # 消息处理（检查/录制/执行）
    │   └── engine/            # 🔥 核心引擎（包装 SDK）
    │       ├── executor.ts       # 包装 SDK executor
    │       ├── primitives.ts     # Re-export SDK primitives
    │       └── highlighter.ts    # 调试高亮
    │
    ├── sidepanel/             # 录制器 UI (React + Framer Motion)
    │   ├── App.tsx            # 主应用（双模式切换）
    │   ├── components/
    │   │   ├── Header.tsx         # 头部（含 Dashboard 入口）
    │   │   ├── InspectMode.tsx    # 元素检查模式（主编排器）
    │   │   ├── SmartStatus.tsx    # AI 决策面板（呼吸动画）
    │   │   ├── PathVisualizer.tsx # 路径模式（祖先阶梯）
    │   │   ├── StructureView.tsx  # 结构模式（Scope+Anchor+Target）
    │   │   ├── RecordingPanel.tsx # 操作录制模式
    │   │   └── LogViewer.tsx      # 日志查看器
    │   ├── stores/
    │   │   ├── missionStore.ts    # 任务状态（旧）
    │   │   └── recordingStore.ts  # 录制状态 + AI 策略状态
    │   └── utils/
    │       └── ensureContentScript.ts # Content Script 注入工具
    │
    ├── dashboard/             # 管理中心 UI (React)
    │   ├── App.tsx            # 主布局
    │   ├── components/
    │   │   ├── ToolLibrary.tsx    # 工具库卡片列表
    │   │   ├── RuleBookEditor.tsx # Markdown 规则编辑器
    │   │   └── ExecutionLog.tsx   # 执行日志面板
    │   └── stores/
    │       └── toolStore.ts       # 工具库状态（持久化）
    │
    ├── services/              # 外部服务模块
    │   └── ai/                # AI 服务
    │       ├── index.ts          # 统一导出
    │       ├── client.ts         # 通义 API 客户端（含 generateSmartSelector）
    │       ├── smartRouter.ts    # 智能策略路由（Path vs Structure）
    │       ├── prompts.ts        # AI Prompt 模板
    │       ├── tools.ts          # AI Tool Schema 定义
    │       └── types.ts          # 含 SmartSelectorContext/Result
    │
    ├── shared/                # 共享模块（兼容层）
    │   ├── types.ts           # Re-export @homura/sdk/types
    │   ├── constants.ts       # Re-export @homura/sdk/constants
    │   ├── utils.ts           # Re-export @homura/sdk/utils
    │   └── selectorBuilder/   # Re-export @homura/sdk/selector
    │
    └── styles/
        └── global.css         # 全局样式
```

### SDK 模块说明

| 模块 | 路径 | 说明 |
|------|------|------|
| Types | `@homura/sdk/types` | 核心类型定义 |
| Selector | `@homura/sdk/selector` | 选择器生成与验证 |
| Primitives | `@homura/sdk/primitives` | 原子操作（CLICK/INPUT/EXTRACT/WAIT/NAVIGATE） |
| Executor | `@homura/sdk/executor` | 工具执行引擎 |
| Utils | `@homura/sdk/utils` | 工具函数 |
| Constants | `@homura/sdk/constants` | 共享常量 |

### Shared 模块说明（扩展特定）

| 模块 | 路径 | 说明 |
|------|------|------|
| Types | `@shared/types` | Chrome 扩展消息类型 |
| Utils | `@shared/utils` | Chrome 扩展工具函数（sendMessageToContent, getActiveTab） |
| Constants | `@shared/constants` | 扩展常量（STORAGE_KEYS, EXTENSION_IDS） |
| SelectorBuilder | `@shared/selectorBuilder` | 录制状态类型（RecordingState, RecordedAction） |

---

## 🚀 构建与开发

### 安装依赖

```bash
npm install
```

### 构建命令

```bash
# 仅构建 SDK
npm run build:sdk

# 构建扩展（包含 SDK）
npm run build:extension

# 完整构建
npm run build
```

### SDK 开发

```bash
cd packages/sdk

# 监听模式（开发时使用）
npm run dev

# 仅类型检查
npm run typecheck

# 清理构建产物
npm run clean
```

---

## 📖 SDK 使用规范

### 导入规则

**核心原则**: SDK 导入与扩展特定导入分离

```typescript
// ✅ 正确：SDK 功能直接从 @homura/sdk 导入
import type { UnifiedSelector, AtomicTool } from '@homura/sdk/types';
import { analyzeElement, createUnifiedSelector } from '@homura/sdk/selector';
import { executeClick } from '@homura/sdk/primitives';
import { executeTool } from '@homura/sdk/executor';
import { generateMessageId } from '@homura/sdk/utils';
import { HIGHLIGHT_COLORS } from '@homura/sdk/constants';

// ✅ 正确：扩展特定功能从 @shared 导入
import type { HomuraMessage, MessageType } from '@shared/types';
import { sendMessageToContent, getActiveTab } from '@shared/utils';
import { STORAGE_KEYS, EXTENSION_IDS } from '@shared/constants';
import type { RecordingState, RecordedAction } from '@shared/selectorBuilder';

// ❌ 错误：不要从 @shared 导入 SDK 功能
import type { UnifiedSelector } from '@shared/types'; // 已废弃
```

### 常用 SDK 函数

#### 元素分析

```typescript
import { analyzeElement } from '@homura/sdk/selector';

const element = document.querySelector('button');
const analysis = analyzeElement(element);

// analysis 包含：
// - minimalSelector: 最简选择器
// - targetSelector: 目标选择器
// - containerType: 'table' | 'list' | 'grid' | 'card' | 'single'
// - anchorCandidates: 锚点候选数组
// - ancestorPath: 祖先路径（带语义评分）
```

#### 选择器生成

```typescript
import { createUnifiedSelector, determineStrategy } from '@homura/sdk/selector';

// 自动检测最佳策略
const strategy = determineStrategy(analysis);
// 返回: 'path' | 'scope_anchor_target' | 'direct'

// 创建统一选择器
const unified = createUnifiedSelector(analysis, 'CLICK');
// unified.strategy: 'path' | 'scope_anchor_target'
// unified.pathData: 路径策略数据
// unified.structureData: 结构策略数据（scope + anchor + target）
```

#### 选择器验证

```typescript
import { validateSelectorDraft, countMatches } from '@homura/sdk/selector';

// 验证选择器
const result = validateSelectorDraft(draft);
// { valid: boolean, matchCount: number, error?: string }

// 计算匹配数量
const count = countMatches('button.submit');
```

#### 执行原子操作

```typescript
import { executeClick, executeInput } from '@homura/sdk/primitives';

// 点击元素
await executeClick(element, { delay: 100 });

// 输入文本
await executeInput(element, {
  value: 'Hello World',
  clearFirst: true,
  delay: 50
});
```

#### 工具执行

```typescript
import { executeTool } from '@homura/sdk/executor';
import type { AtomicTool } from '@homura/sdk/types';

const tool: AtomicTool = {
  tool_id: 'submit_form',
  name: 'Submit Form',
  parameters: { username: { type: 'string', required: true } },
  selector_logic: {
    target: { selector: 'button[type="submit"]', action: 'CLICK' }
  }
};

const result = await executeTool(tool, { username: 'alice' });
```

### 扩展特定功能

#### Chrome 消息传递

```typescript
import { sendMessageToContent } from '@shared/utils';
import type { HomuraMessage } from '@shared/types';

const message: HomuraMessage = {
  type: 'START_INSPECT',
  timestamp: Date.now()
};

await sendMessageToContent(message);
```

#### 获取当前标签页

```typescript
import { getActiveTab } from '@shared/utils';

const tab = await getActiveTab();
if (tab?.id) {
  await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
}
```

---

## 🛠️ 项目工具链

### 构建系统

```bash
# 项目根目录
homura/
├── package.json          # 主项目构建脚本
├── tsconfig.json         # TypeScript 配置
├── vite.config.ts        # Vite 打包配置
└── pnpm-workspace.yaml   # Monorepo 工作区配置

# SDK 目录
packages/sdk/
├── package.json          # SDK 包配置
└── tsconfig.json         # SDK TypeScript 配置
```

### 可用脚本

```bash
# 从项目根目录运行

# 构建 SDK
npm run build:sdk
# → cd packages/sdk && tsc

# 构建扩展（包含 SDK）
npm run build:extension
# → npm run build:sdk && tsc && vite build

# 完整构建
npm run build
# → npm run build:sdk && tsc && vite build

# 开发模式（Vite dev server）
npm run dev

# 预览构建产物
npm run preview

# 代码检查
npm run lint
```

### TypeScript 配置

**项目根 tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "paths": {
      "@shared/*": ["./src/shared/*"],
      "@homura/sdk": ["./packages/sdk/src"],
      "@homura/sdk/*": ["./packages/sdk/src/*"]
    }
  }
}
```

**SDK tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### Vite 配置要点

```typescript
// vite.config.ts
{
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        'service-worker-loader': 'src/background/index.ts',
        'sidepanel': 'src/sidepanel/index.html',
        'dashboard': 'src/dashboard/index.html'
      }
    }
  }
}
```

### Monorepo 工作区

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/sdk'
```

这允许在开发时直接从源码引用 SDK：
```json
// package.json
{
  "dependencies": {
    "@homura/sdk": "workspace:*"
  }
}
```

---

## 🧪 如何测试

### 1. 加载扩展

1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序" → 选择 `dist` 文件夹

### 3. 测试 SidePanel（录制器）

1. 打开任意网页（非 chrome:// 页面）
2. **刷新页面**（确保 Content Script 加载）
3. 点击扩展图标打开 SidePanel
4. 选择模式：
   - **检查**：点击"开始检查"，然后点击页面元素
     - SmartStatus：查看 AI 决策状态和策略
     - Tab 切换：Path（路径模式）/ Structure（结构模式）
     - PathVisualizer：交互式祖先阶梯，勾选包含层级
     - StructureView：Scope+Anchor+Target 配置
     - AI 优化：智能路由，自动选择最佳策略
   - **录制**：点击"开始录制"，在页面上操作
     - 支持跨页面录制：页面跳转后自动恢复录制状态
     - 支持跨 Tab 录制：打开新标签页后自动跟踪
     - 自动生成 UnifiedSelector：每个操作自动生成选择器

### 4. 测试 Dashboard（管理中心）

打开方式：
- 点击 SidePanel 头部的 Dashboard 图标
- 右键扩展图标 → 选项
- 直接访问 `chrome-extension://[ID]/src/dashboard/index.html`

### 5. 添加新测试页面

在 `public/test-pages/` 中创建新的 HTML 文件：

```
public/test-pages/
├── audit-table.html      # 审批表格测试
├── search-form.html      # 搜索表单测试（待添加）
└── dynamic-list.html     # 动态列表测试（待添加）
```

---

## 🎯 核心概念

### Scope + Anchor + Target 模式

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SCOPE - 找到所有容器                                      │
│    "tr" → [Row1, Row2, Row3, ...]                           │
├─────────────────────────────────────────────────────────────┤
│ 2. ANCHOR - 在容器中定位                                     │
│    ".name" contains "李四" → Row2                           │
├─────────────────────────────────────────────────────────────┤
│ 3. TARGET - 在定位的容器中操作                               │
│    ".btn-approve" → CLICK                                   │
└─────────────────────────────────────────────────────────────┘
```

```typescript
{
  scope: { type: 'container_list', selector: 'tr' },
  anchor: { type: 'text_match', selector: '.name', value: '{{student_name}}' },
  target: { selector: '.btn-approve', action: 'CLICK' }
}
```

### 五大基元 (Primitives)

| 基元 | 说明 | 文件位置 |
|------|------|----------|
| `CLICK` | 模拟点击 | `primitives.ts` |
| `INPUT` | 表单输入 | `primitives.ts` |
| `EXTRACT_TEXT` | 提取文本 | `primitives.ts` |
| `WAIT_FOR` | 等待元素 | `primitives.ts` |
| `NAVIGATE` | 页面导航 | `primitives.ts` |

### 选择器生成模块

| 模块 | 职责 |
|------|------|
| `analyzer.ts` | DOM 分析：容器识别、锚点候选、路径收集、语义评分 |
| `generator.ts` | 生成 Scope + Anchor + Target 选择器逻辑 |
| `validator.ts` | 实时验证选择器、计算匹配数量 |

### 跨页面录制架构

录制状态通过 `chrome.storage.session` 持久化，即使 Service Worker 重启也能恢复：

```
┌─────────────────────────────────────────────────────────────┐
│                    Background Service Worker                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  recordingState (chrome.storage.session)             │   │
│  │  ├── isRecording: boolean                            │   │
│  │  ├── tabId: number                                   │   │
│  │  └── startTime: number                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  监听器：                                                   │
│  ├── webNavigation.onCreatedNavigationTarget               │
│  │   → 检测从录制 Tab 打开的新 Tab，自动切换跟踪           │
│  ├── tabs.onActivated                                       │
│  │   → 用户切换 Tab 时自动跟踪并恢复录制                   │
│  ├── webNavigation.onCompleted                              │
│  │   → 页面加载完成时重新注入录制模式                      │
│  └── tabs.onRemoved                                         │
│       → Tab 关闭时清理录制状态                              │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    Content Script                            │
│  ├── isRecordMode: boolean (内存状态)                       │
│  ├── 监听 click/input 事件                                  │
│  └── 发送 ACTION_RECORDED 消息到 SidePanel                  │
└─────────────────────────────────────────────────────────────┘
```

工作流程：
1. 用户点击"开始录制" → SidePanel 通知 Background 设置状态
2. 用户点击链接打开新 Tab → `onCreatedNavigationTarget` 检测并更新 tabId
3. 新页面加载完成 → `onCompleted` 向 Content Script 发送 `START_RECORDING`
4. 录制继续 → Content Script 监听用户操作

### 路径选择器

对于复杂嵌套的单一元素，使用路径选择器代替 Scope+Anchor+Target：

```
目标: input.input-inner
  ↓ 向上递归分析祖先
div.official-header (score: 0.9) ← 语义根
  ↓
div.section (score: 0.6) ← 保留
  ↓
生成: .official-header .section input.input-inner
```

核心函数：
- `collectAncestorPath(element)`: 收集祖先路径信息
- `buildPathSelector(path, target)`: 构建路径选择器
- `calculateClassSemanticScore(class)`: 计算类名语义分数

---

## 🎨 UI 设计理念

### 心智交互 (Mindful Interaction)

我们的设计哲学基于 **"心智交互"** 趋势 — 从争夺注意力转向**尊重注意力**。

#### 三大原则

| 原则 | 实践 |
|------|------|
| **数字节食** | 减少非必要视觉噪音，界面能"淡出" |
| **渐进式披露** | 默认只显示核心信息，需要时再展开 |
| **空间高效** | 侧边栏寸土寸金，极致紧凑布局 |

#### 设计规范

```
色彩：Deep Space 暗色系
├── 背景：zinc-950（接近纯黑）
├── 卡片：zinc-900/50 + backdrop-blur（毛玻璃）
├── 边框：white/5（极淡）
└── 点缀：violet-500 → fuchsia-500（霓虹紫渐变）

选择器高亮色：
├── Scope: blue-500（容器范围）
├── Anchor: green-500（定位锚点）
└── Target: violet-500（操作目标）

排版：
├── 正文：text-[11px] ~ text-[13px]
├── 标签：text-[9px] ~ text-[10px]
└── 代码：JetBrains Mono / Geist Mono

交互：
├── 动效：transition-all duration-200 ease-out
├── 辉光：shadow-neon（hover 时）
└── 收折：渐进式披露，默认收起卡片
```

---

## 🏛️ 软件工程规范

> 防止技术债积累、保持代码质量、统一开发规范

### Spec-Driven Development（规范驱动开发）

**核心原则**：先定义规范，再编写代码

```
1. 📋 定义规范 → 在 DEVELOPMENT.md 或相关文档中定义接口、类型
2. 🔤 类型定义 → 先定义 TypeScript 类型，确保无冲突
3. 💻 实现代码 → 按照规范实现
4. ✅ 测试验证 → 编写测试用例
5. 📚 文档同步 → 更新文档
```

### 类型系统规范

**防止类型冲突、统一类型定义**

#### 类型所有权

| 类型 | 所有权 | 路径 |
|------|--------|------|
| **SelectorLogic** | SDK | `packages/sdk/src/types/selector.ts` |
| **UnifiedSelector** | SDK | `packages/sdk/src/types/selector.ts` |
| **AtomicTool** | SDK | `packages/sdk/src/types/primitives.ts` |
| **Blueprint** | SDK | `packages/sdk/src/types/blueprint.ts` |
| **ValidationResult** | SDK | `packages/sdk/src/selector/types.ts` |
| **BlueprintValidationResult** | 扩展 | `src/dashboard/utils/blueprintValidator.ts` |
| **HomuraMessage** | 扩展 | `src/shared/types.ts` |
| **RecordingState** | 扩展 | `src/shared/selectorBuilder/types.ts` |

#### 类型定义规则

```typescript
// ✅ 正确：类型在唯一位置定义
// packages/sdk/src/types/selector.ts
export interface SelectorLogic {
  strategy: 'path' | 'scope_anchor_target';
  // ...
}

// ✅ 正确：需要时导入并 re-export
// packages/sdk/src/types/blueprint.ts
import type { SelectorLogic } from './selector.js';
export type { SelectorLogic } from './selector.js';

// ❌ 错误：重复定义类型
// packages/sdk/src/types/blueprint.ts
export interface SelectorLogic { ... }  // 冲突！
```

#### 类型命名约定

| 模式 | 用途 | 示例 |
|------|------|------|
| **...Config** | 配置对象 | `AgentConfig`, `SelectorConfig` |
| **...Options** | 可选参数 | `ExecuteOptions`, `ValidateOptions` |
| **...Result** | 返回结果 | `ExecuteToolResult`, `ValidationResult` |
| **...State** | 状态对象 | `RecordingState`, `AgentState` |
| **...Props** | React Props | `ToolCardProps`, `ButtonProps` |
| **...Draft** | 未验证数据 | `SelectorDraft` |
| **...Meta** | 元数据 | `BlueprintMeta` |

### API 设计规范

**统一的 API 签名、一致的函数命名**

#### 函数签名约定

```typescript
// ✅ 正确：参数顺序（必需 → 可选 → 上下文）
export async function executeTool(
  tool: AtomicTool,                    // 必需
  params: Record<string, unknown>,     // 必需
  context?: ExecutionContext           // 可选上下文
): Promise<ExecuteToolResult> {
  // ...
}

// ✅ 正确：对象参数（≥3 个参数或有关联性）
export async function executeInput(
  element: Element,
  params: {
    value: string;
    clearFirst?: boolean;
    delay?: number;
  }
): Promise<ExecuteToolResult> {
  // ...
}
```

#### 错误处理约定

```typescript
// ✅ 正确：明确错误类型
export async function executeTool(
  tool: AtomicTool,
  params: Record<string, unknown>
): Promise<ExecuteToolResult> {
  try {
    // ...
  } catch (error) {
    throw new ExecutionError(
      `Failed to execute tool ${tool.tool_id}`,
      { cause: error }
    );
  }
}

// ❌ 错误：吞掉错误
export async function executeTool(...) {
  try {
    // ...
  } catch (e) {
    console.error(e);
    return null;  // 不要吞掉错误！
  }
}
```

### 代码质量检查

#### 自动化检查脚本

```bash
# 添加到 package.json
npm run typecheck    # TypeScript 类型检查
npm run lint         # ESLint 检查
npm run check:dups   # 检查类型重复
npm run test         # 运行测试
```

#### 开发前检查清单

- [ ] 新类型是否已检查不与现有类型冲突？
- [ ] 是否从正确的模块导入类型（SDK vs @shared）？
- [ ] 函数签名是否遵循 API 规范？
- [ ] 是否添加了 JSDoc 注释？
- [ ] 是否添加了错误处理？
- [ ] 是否添加了测试用例？

### Git Hook 检查

建议添加 pre-commit hook：

```bash
#!/bin/sh
# .husky/pre-commit

# 1. TypeScript 类型检查
npm run typecheck

# 2. ESLint 检查
npm run lint

# 3. 检查类型重复
if grep -r "export interface SelectorLogic" packages/sdk/src/ | wc -l | grep -q "^[2-9]"; then
  echo "❌ 发现重复的类型定义：SelectorLogic"
  exit 1
fi

# 4. 检查错误的导入路径
if git diff --cached --name-only | grep -E '\.ts$' | xargs grep "from '@shared/types.*AtomicTool"; then
  echo "❌ 不要从 @shared/types 导入 SDK 类型"
  exit 1
fi
```

### 常见错误与修复

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| `TS2308: Member already exported` | 类型重复定义 | 删除重复定义，使用 re-export |
| `TS2345: Type 'X' is not assignable` | 类型不匹配 | 检查导入路径，确保类型正确 |
| `TS2304: Cannot find name 'get'` | Zustand store 使用错误 | 使用 `useStore.getState()` |
| `TS2352: Conversion may be a mistake` | 类型断言错误 | 使用 `as unknown as Type` |

---

## 📋 开发检查清单

### 通用检查
- [ ] 新功能是否遵循 Scope+Anchor+Target 模式？
- [ ] UI 组件是否保持紧凑（p-2/p-3，text-xs）？
- [ ] 是否实现了渐进式披露（默认收起）？
- [ ] 动效是否舒缓（duration-200+）？
- [ ] 是否添加了对应的测试页面？
- [ ] Content Script 消息处理是否有错误处理？
- [ ] AI 调用是否有重试机制？
- [ ] 录制功能是否支持跨页面/跨 Tab？
- [ ] 是否使用 `chrome.storage.session` 持久化关键状态？

### SDK 使用检查
- [ ] SDK 类型是否从 `@homura/sdk/types` 导入？
- [ ] SDK 函数是否从对应模块（`@homura/sdk/selector` 等）导入？
- [ ] 扩展特定类型是否从 `@shared/*` 导入？
- [ ] 是否误从 `@shared/types` 导入 SDK 类型（已废弃）？
- [ ] 修改 SDK 后是否运行了 `npm run build:sdk`？
- [ ] 新增的通用功能是否考虑添加到 SDK？

---

## 🔧 常见问题

### "Could not establish connection" 错误

**原因**：Content Script 未加载

**解决**：
1. 刷新目标页面
2. 检查是否在 chrome:// 页面（不支持）
3. 重新加载扩展

### Dashboard 打不开

**解决**：
1. 确认扩展已加载
2. 使用 SidePanel 头部的 Dashboard 按钮
3. 或访问 `chrome-extension://[扩展ID]/src/dashboard/index.html`

### 选择器验证失败

**检查**：
1. Scope 选择器是否匹配到元素
2. Anchor 值是否与页面文本匹配
3. Target 选择器是否在匹配的 Scope 内

### 跨页面录制不工作

**原因**：Service Worker 生命周期或 Tab 跟踪问题

**解决**：
1. 检查 `manifest.json` 是否包含 `webNavigation` 权限
2. 确认录制状态是否正确存储到 `chrome.storage.session`
3. 查看 Background Console 是否有 `[Homura] Recording state restored` 日志
4. 如果是新 Tab，检查 `onCreatedNavigationTarget` 或 `onActivated` 是否触发

**调试方法**：
```
1. 打开 chrome://extensions/
2. 点击扩展的 "Service Worker" 链接
3. 查看 Console 日志，搜索 "[Homura]"
```

---

## 📚 API 设计规范

> 统一 API 签名、一致的函数命名、清晰的错误处理

### 函数签名约定

#### 参数顺序

```typescript
// 1. 必需参数在前
export function createUnifiedSelector(
  analysis: ElementAnalysis,  // 必需
  action: PrimitiveType        // 必需
): UnifiedSelector { ... }

// 2. 可选参数在后
export async function executeClick(
  element: Element,
  options?: ExecuteOptions  // 可选
): Promise<ExecuteToolResult> { ... }

// 3. 上下文参数最后
export async function executeTool(
  tool: AtomicTool,
  params: Record<string, unknown>,
  context?: ExecutionContext  // 上下文
): Promise<ExecuteToolResult> { ... }
```

#### 对象参数 vs 多参数

```typescript
// ✅ 使用对象参数：当参数 ≥ 3 个或有关联性
export async function executeInput(
  element: Element,
  params: {
    value: string;
    clearFirst?: boolean;
    delay?: number;
  }
): Promise<ExecuteToolResult> { ... }

// ✅ 使用多参数：当参数独立且 ≤ 2 个
export function generateMessageId(prefix?: string): string { ... }
```

### 错误处理规范

```typescript
// ✅ 正确：明确错误类型
export async function executeTool(
  tool: AtomicTool,
  params: Record<string, unknown>
): Promise<ExecuteToolResult> {
  try {
    // ...
  } catch (error) {
    throw new ExecutionError(
      `Failed to execute tool ${tool.tool_id}`,
      { cause: error }
    );
  }
}

// ❌ 错误：吞掉错误
export async function executeTool(...) {
  try {
    // ...
  } catch (e) {
    console.error(e);
    return null;  // 不要吞掉错误！
  }
}
```

### 异步函数约定

```typescript
// ✅ 正确：明确返回类型
export async function executeClick(
  element: Element,
  options?: ExecuteOptions
): Promise<ExecuteToolResult> {
  // ...
}

// ✅ 正确：使用 JSDoc 文档
/**
 * 执行点击操作
 * @param element - 目标元素
 * @param options - 执行选项
 * @returns 执行结果
 */
export async function executeClick(
  element: Element,
  options?: ExecuteOptions
): Promise<ExecuteToolResult> {
  // ...
}
```

### API 版本控制

**SemVer 版本号**：
- **Major（主版本）**：破坏性变更
- **Minor（次版本）**：新功能，向后兼容
- **Patch（补丁）**：Bug 修复

**破坏性变更处理**：
```typescript
// ❌ 不要直接删除旧 API
export function oldApiName() { }  // 删除！

// ✅ 标记为废弃，保留至少一个大版本
/**
 * @deprecated 使用 `newApiName` 代替
 * @removed 2.0.0
 */
export function oldApiName() { }

/**
 * 新 API，推荐使用
 */
export function newApiName() { }
```

---

## 🔄 开发工作流

> Spec-Driven Development：规范 → 类型 → 代码 → 测试 → 文档

### 新功能开发流程

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 📋 规范定义                                              │
│    在 DEVELOPMENT.md 中定义接口、类型、函数签名              │
├─────────────────────────────────────────────────────────────┤
│ 2. 🔤 类型定义                                              │
│    创建类型文件，确保无冲突                                  │
│    - 检查类型是否已存在                                     │
│    - 在正确的模块中定义                                     │
│    - 从正确的模块导入依赖                                   │
├─────────────────────────────────────────────────────────────┤
│ 3. 💻 实现代码                                              │
│    按照规范实现，添加 JSDoc 注释                            │
├─────────────────────────────────────────────────────────────┤
│ 4. ✅ 运行检查                                              │
│    - npm run typecheck                                     │
│    - npm run lint                                          │
│    - npm run check:duplicates                              │
├─────────────────────────────────────────────────────────────┤
│ 5. 🧪 编写测试                                              │
│    - 单元测试（核心逻辑）                                   │
│    - 集成测试（API 边界）                                   │
│    - npm run test                                          │
├─────────────────────────────────────────────────────────────┤
│ 6. 📚 更新文档                                              │
│    - 更新 DEVELOPMENT.md                                   │
│    - 更新相关 README                                       │
└─────────────────────────────────────────────────────────────┘
```

### 开发前检查清单

- [ ] **规范定义**：功能规范是否已在文档中定义？
- [ ] **类型检查**：新类型是否检查了冲突？
- [ ] **导入路径**：是否从正确的模块导入？
- [ ] **JSDoc 注释**：是否添加了注释？
- [ ] **错误处理**：是否正确处理错误？
- [ ] **测试用例**：是否编写了测试？
- [ ] **Git Hook**：pre-commit 检查是否通过？

### 代码提交规范

**Commit Message 格式**：
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码风格（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**：
```
feat(selector): add path strategy support

- Implement path selector generation
- Add ancestor path analysis
- Support self-targeting elements

Closes #123
```

### PR 审查清单

**代码质量**：
- [ ] 通过所有检查（typecheck, lint, test）
- [ ] 无 console.log 或调试代码
- [ ] 错误处理完善
- [ ] 添加了必要的注释

**测试覆盖**：
- [ ] 核心逻辑有单元测试
- [ ] 边界情况有测试
- [ ] 测试覆盖率 ≥ 80%

**文档更新**：
- [ ] 更新了 DEVELOPMENT.md
- [ ] 更新了相关 API 文档
- [ ] 添加了使用示例

---

## 🚀 路线图

```
已完成：
├── ✅ MVP: 执行引擎 + Scope/Anchor/Target
├── ✅ v0.2: SidePanel 三模式
├── ✅ v0.3: Dashboard 工具库 + 规则书
├── ✅ v0.4: AI 服务集成
├── ✅ v0.5: 选择器生成模块
├── ✅ v0.6: 路径选择器 + AI Tool Calling
├── ✅ v0.7: UnifiedSelector + 双模式 UI
├── ✅ v0.7.1: 熵感知锚点 + 分割表格支持
├── ✅ v0.7.2: 跨页面/跨 Tab 录制
├── ✅ v1.0: SDK 抽离完成
└── ✅ v1.1: 兼容层移除，统一使用 SDK

计划中：
├── 📋 v1.5: AI Agent + Rule Book 解析执行
└── 📋 v2.0: Self-Healing 自动修复
```

---

## 🔧 SDK 抽离与定制插件开发

> ✅ **v1.1 已完成**：SDK 抽离 + 兼容层移除，统一使用 @homura/sdk

### 架构转型

从单一的 Chrome Extension 转变为 **SDK + 插件生态系统**：

```
定制插件 A
    ↓ 依赖 SDK
@homura/sdk (核心引擎)
    ↓ 依赖 SDK
Homura 主插件
    ↓ 依赖 SDK
定制插件 B
```

### 开发优先级

| 优先级 | 任务 | 状态 |
|--------|------|------|
| P0 | SDK 基础抽离 | ✅ 完成 |
| P0 | 主插件迁移到 SDK | ✅ 完成 |
| P0 | 兼容层移除 | ✅ 完成 |
| P1 | AI Agent 实现 | 📋 计划中 (v1.5) |
| P1 | Blueprint 导出功能 | 📋 计划中 (v1.5) |
| P2 | 自愈机制 | 📋 计划中 (v2.0) |
| P2 | CLI 工具 | 📋 计划中 (v2.0) |

### SDK v1.1 已完成模块

#### Phase 1: SDK 基础抽离 ✅
- [x] 创建 Monorepo 结构 (`packages/sdk/`)
- [x] 抽离 types 模块 (`@homura/sdk/types`)
- [x] 抽离 selector 模块 (`@homura/sdk/selector`)
- [x] 抽离 primitives 模块 (`@homura/sdk/primitives`)
- [x] 抽离 executor 模块 (`@homura/sdk/executor`)
- [x] 抽离 utils 模块 (`@homura/sdk/utils`)
- [x] 配置 SDK 构建 (TypeScript, package.json)

#### Phase 2: 主插件迁移 ✅
- [x] 创建兼容层 (`src/shared/`)
- [x] 更新导入路径
- [x] 移除冗余代码
- [x] 验证功能完整性

#### Phase 3: 兼容层移除 ✅
- [x] 重构 `src/shared/types.ts` — 移除 SDK re-export
- [x] 重构 `src/shared/utils.ts` — 移除 SDK re-export
- [x] 重构 `src/shared/constants.ts` — 移除 SDK re-export
- [x] 重构 `src/shared/selectorBuilder/index.ts` — 移除 SDK re-export
- [x] 更新 23+ 文件直接从 SDK 导入
- [x] 更新 `src/shared/index.ts` 为 SDK 重新导出
- [x] 增强 SDK selector 模块导出辅助函数
- [x] TypeScript 编译通过
- [x] 构建成功

### 导入架构（v1.1）

```typescript
// SDK 功能 — 直接从 @homura/sdk 导入
import { analyzeElement, createUnifiedSelector } from '@homura/sdk/selector';
import { executeClick } from '@homura/sdk/primitives';
import { executeTool } from '@homura/sdk/executor';
import type { UnifiedSelector, AtomicTool } from '@homura/sdk/types';

// 扩展特定功能 — 从 @shared 导入
import type { HomuraMessage, MessageType } from '@shared/types';
import { sendMessageToContent, getActiveTab } from '@shared/utils';
import { STORAGE_KEYS } from '@shared/constants';
import type { RecordingState } from '@shared/selectorBuilder';
```

### 使用 SDK 开发定制插件

```bash
# 安装 SDK
npm install @homura/sdk

# 使用 SDK
import { analyzeElement, createUnifiedSelector } from '@homura/sdk/selector';
import { executeTool } from '@homura/sdk/executor';
```

---

*本文档持续更新，记录最新的开发计划和任务*
