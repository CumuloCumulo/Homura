# Homura 选择器设计文档

> 🎯 **核心理念**：程序化生成稳定、可复用的选择器，基于语义而非绝对位置

---

## 📐 核心架构：Scope + Anchor + Target

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SCOPE (作用域) - 找到所有重复容器                            │
│    selector: "#audit-table tr"  →  [Row1, Row2, Row3, ...]     │
│    ┌───────────────────────────────────────────────────────┐   │
│    │ Row1: Alice   | Computer Science | [Approve]          │   │
│    │ Row2: 张三    | 艺术学院         | [Approve] ← ANCHOR │   │
│    │ Row3: 李四    | 计算机学院       | [Approve]          │   │
│    └───────────────────────────────────────────────────────┘   │
│                                  ↓                              │
│ 2. ANCHOR (锚点) - 通过内容定位到特定容器                       │
│    selector: ".student-name"                                    │
│    value: "张三" (或 {{student_name}})                          │
│    matchMode: "contains"                                        │
│                                  ↓                              │
│ 3. TARGET (目标) - 在匹配的容器内找到操作元素                   │
│    selector: "button.btn-approve"                               │
│    action: "CLICK"                                              │
└─────────────────────────────────────────────────────────────────┘
```

### JSON 结构示例

```typescript
interface SelectorLogic {
  scope?: {
    type: 'container_list';
    selector: string;  // "#audit-table tr"
  };
  anchor?: {
    type: 'text_match' | 'attribute_match';
    selector: string;  // ".student-name"
    value: string;     // "张三" 或 "{{student_name}}"
    matchMode: 'contains' | 'exact' | 'startsWith' | 'endsWith';
    attribute?: string; // 用于 attribute_match
  };
  target: {
    selector: string;  // "button.btn-approve"
    action: 'CLICK' | 'INPUT' | 'EXTRACT_TEXT' | 'WAIT_FOR' | 'NAVIGATE';
  };
}
```

---

## 🔍 选择器生成流程

### 1. 容器识别 (`findRepeatingContainer`)

当用户点击一个元素时，向上遍历 DOM 树找到重复容器：

```
用户点击 button.btn-approve
        ↓
向上查找：button → td → tr → tbody → table
        ↓
检查每一层是否有相似兄弟元素
        ↓
跳过 TD/TH（太细粒度）→ 找到 TR（有多个相似兄弟）
        ↓
返回 TR 作为容器
```

#### 跳过的元素

```typescript
const SKIP_AS_CONTAINER = ['TD', 'TH', 'SPAN', 'A', 'STRONG', 'EM', 'B', 'I'];
```

这些元素虽然可能有重复的兄弟，但不适合作为容器：
- `TD/TH`：同一行有多个单元格，但"行"才是有意义的单位
- `SPAN/A`：太细粒度，通常是内容元素

#### 优先容器

```typescript
const PREFERRED_CONTAINERS = ['TR', 'LI', 'ARTICLE', 'SECTION'];
```

### 2. 语义容器识别 (`findSemanticContainer`)

对于非重复结构（如搜索栏），向上查找有语义标识的祖先：

```
用户点击 <button>Search</button>
        ↓
向上查找：button → div.search-bar
        ↓
发现 .search-bar 是语义类名
        ↓
返回 div.search-bar 作为语义容器
```

#### 语义类名模式

```typescript
const SEMANTIC_CLASS_PATTERNS = [
  /^(search|header|footer|nav|sidebar|content|main|form|modal|dialog|toolbar|menu)/i,
  /(-bar|-box|-panel|-container|-wrapper|-section|-area|-card|-item|-group|-block)$/i,
  /^(btn-group|input-group|form-group|card-body|card-header|list-group)/i,
];
```

### 3. 锚点候选 (`findAnchorCandidates`)

在容器内查找可用于定位的文本/属性：

```typescript
// 优先级：
1. data-testid, data-id 等唯一属性
2. 直接文本内容（姓名、ID 等）
3. aria-label, title 等语义属性

// 结果示例：
anchorCandidates: [
  { selector: ".student-name", type: "text_match", text: "张三", confidence: 0.85 },
  { selector: "[data-testid='student-name']", type: "attribute_match", confidence: 0.9 },
]
```

### 4. 选择器构建 (`buildMinimalSelector`)

为元素生成最小化但稳定的选择器：

```
优先级：
1. 稳定 ID      → #submit-btn
2. data-testid  → [data-testid="search"]
3. name 属性    → input[name="username"]
4. 语义 class   → button.btn-primary
5. role/type    → button[type="submit"]
6. 结构位置     → button:nth-of-type(2)
7. 纯标签       → button（依赖容器上下文）
```

#### 避免的选择器

```typescript
// ❌ 不稳定的选择器
element.id.match(/\d{5,}|uid|uuid|random|react|vue/i)  // 动态ID
element.classList.match(/active|hover|focus|selected|disabled|ng-|vue-|react-/i)  // 状态类

// ❌ 非标准 CSS
button:contains("Search")  // jQuery 语法，原生不支持
```

---

## 🚀 执行逻辑

### 完整的 Scope + Anchor + Target 执行

```typescript
function executeWithSelectorLogic(logic: SelectorLogic, params: Record<string, string>) {
  // 1. 替换变量
  const anchorValue = logic.anchor?.value.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] || '');
  
  // 2. 无 Scope - 直接查找 Target
  if (!logic.scope) {
    const target = document.querySelector(logic.target.selector);
    return executeAction(target, logic.target.action);
  }
  
  // 3. 获取所有 Scope 元素
  const scopeElements = document.querySelectorAll(logic.scope.selector);
  
  // 4. 无 Anchor - 使用第一个 Scope
  if (!logic.anchor) {
    const target = scopeElements[0]?.querySelector(logic.target.selector);
    return executeAction(target, logic.target.action);
  }
  
  // 5. 遍历找到 Anchor 匹配的容器
  for (const scope of scopeElements) {
    const anchor = scope.querySelector(logic.anchor.selector);
    if (anchor && matchText(anchor.textContent, anchorValue, logic.anchor.matchMode)) {
      // 6. 在匹配的容器内找 Target
      const target = scope.querySelector(logic.target.selector);
      return executeAction(target, logic.target.action);
    }
  }
  
  throw new Error('Anchor not matched');
}
```

### 简化的 Scoped Selector 执行

对于快速操作，使用组合选择器：

```typescript
// 生成: ".search-bar button"
const scopedSelector = `${containerSelector} ${targetSelector}`;

// 执行
const element = document.querySelector(scopedSelector);
element.click();
```

---

## 📊 方法对比

| 方法 | 稳定性 | 可复用性 | 示例 |
|------|--------|----------|------|
| **索引定位** | ❌ 差 | ❌ 不可 | `tr:nth-child(1) button` |
| **完整路径** | ❌ 差 | ❌ 不可 | `#table > tbody > tr:nth(1) > td:nth(4) > button` |
| **XPath** | ⚠️ 中 | ✅ 可 | `//tr[.//td[text()="张三"]]//button` |
| **Scope+Anchor+Target** | ✅ 好 | ✅ 可 | `{scope, anchor: {{name}}, target}` |

### 为什么 Scope + Anchor + Target 最优？

1. **语义稳定**：基于内容（"张三"）而非位置（第1行）
2. **可复用**：通过变量 `{{student_name}}` 处理不同目标
3. **排序安全**：即使表格排序变化，只要内容存在就能定位
4. **AI 友好**：结构化 JSON，易于 AI 理解和生成

---

## 🛠️ 核心函数

### analyzer.ts

| 函数 | 作用 |
|------|------|
| `analyzeElement(element)` | 分析元素，返回容器、锚点候选、选择器等 |
| `findRepeatingContainer(element)` | 找到重复容器（如 TR、LI） |
| `findSemanticContainer(element)` | 找到语义容器（如 .search-bar） |
| `findAnchorCandidates(container)` | 在容器内找锚点候选 |
| `buildMinimalSelector(element)` | 生成最小化稳定选择器 |
| `buildRelativeSelector(target, container)` | 生成相对于容器的选择器 |

### generator.ts

| 函数 | 作用 |
|------|------|
| `generateSelectorLogic(analysis, options)` | 生成完整的 Scope+Anchor+Target 逻辑 |
| `createSelectorDraft(analysis, action)` | 创建可编辑的选择器草稿 |
| `draftToSelectorLogic(draft)` | 将草稿转换为最终逻辑 |

### validator.ts

| 函数 | 作用 |
|------|------|
| `validateSelectorDraft(draft)` | 验证选择器草稿是否有效 |
| `findTargetElement(logic, anchorValue)` | 使用逻辑找到目标元素 |

---

## 📝 设计决策记录

### 2026-01-31: 跳过 TD/TH 作为容器

**问题**：点击表格按钮时，`findRepeatingContainer` 返回 `TD` 而非 `TR`，导致选择器 `td:nth-of-type(4) button` 匹配到第一行而非用户选择的行。

**解决**：添加 `SKIP_AS_CONTAINER` 列表，跳过 TD/TH 等细粒度元素，继续向上查找 TR。

### 2026-01-31: 语义容器识别

**问题**：对于 `<div class="search-bar"><button>Search</button></div>`，按钮没有语义属性，选择器 `button` 可能匹配到其他按钮。

**解决**：添加 `findSemanticContainer`，识别有语义类名（如 `.search-bar`）的祖先，生成 `.search-bar button`。

### 2026-01-31: Chrome Messaging 序列化

**问题**：`ElementAnalysis` 通过 Chrome messaging 传递后，`HTMLElement` 对象丢失 DOM 方法。

**解决**：添加序列化字段 `containerSelector`、`containerTagName`、`scopedSelector`，在 generator 中优先使用这些字段。

---

## 🛤️ 路径选择器 (Path Selector)

### 设计动机

对于复杂的单一元素（非重复结构），Scope + Anchor + Target 模式可能不适用。例如：

```html
<div class="official-header">
  <div class="section">
    <div class="input">
      <input class="input-inner" placeholder="搜索...">
    </div>
  </div>
</div>
```

传统方法可能生成 `input.input-inner`，但这不够稳定。路径选择器通过**向上递归分析祖先**，找到语义根并构建路径。

### 核心概念

```
┌─────────────────────────────────────────────────────────────────┐
│ 目标元素: input.input-inner                                      │
│        ↓ 向上递归                                                 │
│ div.input (score: 0.1) ← 跳过（泛化类名）                        │
│        ↓                                                          │
│ div.section (score: 0.6) ← 保留（有一定语义）                    │
│        ↓                                                          │
│ div.official-header (score: 0.9) ← 语义根                        │
│                                                                   │
│ 生成: .official-header .section input.input-inner               │
└─────────────────────────────────────────────────────────────────┘
```

### 类名语义评分

```typescript
// 跳过的类名模式
const SKIP_CLASS_PATTERNS = [
  /^(input|box|item|btn|icon|text|title|label|wrapper|container)$/i,
  /^[a-z]{1,2}$/i,           // 单双字母
  /^(el-|ant-|van-|v-|ng-|react-)/i,  // 框架前缀
  /^(is-|has-|active|hover|focus)/i,  // 状态类
];

// 语义评分模式
const SEMANTIC_SCORE_PATTERNS = [
  { pattern: /^(official|custom|primary|main)/i, score: 0.9 },
  { pattern: /(-header|-footer|-sidebar)/i, score: 0.9 },
  { pattern: /(-search|-login|-form|-modal)/i, score: 0.85 },
  { pattern: /(-bar|-panel|-section)/i, score: 0.75 },
  { pattern: /(-card|-list|-table)/i, score: 0.7 },
];
```

### 祖先路径数据结构

```typescript
interface AncestorInfo {
  tagName: string;           // 标签名
  id?: string;               // 稳定 ID
  classes: string[];         // 所有类名
  semanticScore: number;     // 语义评分 (0-1)
  selector: string;          // 该层最佳选择器
  outerHTML: string;         // HTML 概要（用于 AI）
  depth: number;             // 距离目标的深度
  isSemanticRoot: boolean;   // 是否适合作为根
}

interface PathSelector {
  root: string;              // 语义根选择器
  path: string[];            // 中间路径
  target: string;            // 目标选择器
  fullSelector: string;      // 完整选择器
  confidence: number;        // 置信度
}
```

### 生成流程

```
1. collectAncestorPath(element)
   ├── 向上遍历父元素（最多 6 层）
   ├── 计算每层的 semanticScore
   ├── 找到 isSemanticRoot = true 的祖先
   └── 返回 AncestorInfo[]

2. buildPathSelector(ancestorPath, targetSelector)
   ├── 找到最佳语义根（score >= 0.7）
   ├── 筛选有价值的中间层
   └── 组合成 ".root .path .target"
```

### AI 辅助生成

当程序化生成不够理想时，可以调用 AI：

```typescript
// 发送祖先路径给 AI
const result = await aiClient.generatePathSelector({
  intent: '定位搜索输入框',
  targetSelector: 'input.input-inner',
  targetHtml: '<input class="input-inner" ...>',
  ancestorPath: [ /* AncestorInfo[] */ ],
});

// AI 返回优化的路径选择器
{
  root: '.official-header',
  path: ['.section'],
  target: 'input.input-inner',
  fullSelector: '.official-header .section input.input-inner',
  confidence: 0.85,
  reasoning: '选择 .official-header 作为语义根，跳过泛化的 .input 层'
}
```

### 核心函数

| 函数 | 作用 |
|------|------|
| `collectAncestorPath(element)` | 收集祖先路径信息 |
| `buildPathSelector(path, target)` | 构建路径选择器 |
| `calculateClassSemanticScore(class)` | 计算类名语义分数 |
| `calculateElementSemanticScore(element)` | 计算元素整体分数 |

---

## 🤖 AI 智能路由 (Smart Routing)

### 统一入口

系统通过 `AI_GENERATE_SMART_SELECTOR` 消息统一处理选择器生成请求，AI 自动选择最佳策略：

```typescript
// SmartSelectorContext - 统一上下文
interface SmartSelectorContext {
  intent: string;              // 用户意图
  targetSelector: string;      // 目标选择器
  targetHtml: string;          // 目标 HTML
  ancestorPath: AncestorInfo[]; // 祖先路径
  structureInfo: {
    containerType: ContainerType;
    hasRepeatingStructure: boolean;
    anchorCandidates: AnchorCandidate[];
  };
}
```

### 路由决策逻辑

```typescript
// smartRouter.ts
function shouldUseScopeAnchorTarget(context: SmartSelectorContext): boolean {
  const { containerType, hasRepeatingStructure, anchorCandidates } = context.structureInfo;
  
  // 规则 A: 表格/列表 + 有锚点 → Scope+Anchor+Target
  if (hasRepeatingStructure && 
      (containerType === 'table' || containerType === 'list') &&
      anchorCandidates.length > 0) {
    return true;
  }
  
  // 规则 B: 其他情况 → Path Selector
  return false;
}
```

### UI 集成

用户可以在 SidePanel 中看到 AI 的决策过程：

1. **SmartStatus** 显示当前策略和理由
2. **Tab Bar** 允许手动切换 Path / Structure 模式
3. **PathVisualizer** 或 **StructureView** 根据模式显示

---

## 📊 选择器策略对比

| 场景 | 推荐策略 | 触发条件 |
|------|---------|----------|
| **表格/列表** | Scope + Anchor + Target | `containerType ∈ {table, list}` + 有锚点 |
| **单一元素** | Path Selector | `containerType === 'single'` |
| **复杂嵌套** | AI Path Selector | 祖先路径复杂，需语义分析 |
| **用户覆盖** | 手动模式 | 用户点击 Tab 切换 |

---

## 🔮 未来改进

1. ~~**AI 辅助锚点选择**~~：✅ 已实现 - 通过 Path Selector AI 生成
2. **自动修复**：当选择器失效时，AI 分析页面变化并修复
3. **多锚点支持**：支持多个锚点条件组合（AND/OR）
4. **XPath 回退**：对于复杂场景提供 XPath 作为备选
5. **路径压缩**：AI 智能判断哪些中间层可以省略

---

## 📝 设计决策记录

### 2026-01-31: 路径选择器系统

**问题**：对于复杂嵌套的单一元素（如 `div.official-header > div.section > div.input > input`），传统方法无法生成稳定选择器。容器 `#app` 太宽泛，`input` 不够唯一。

**解决**：
1. 添加 `collectAncestorPath` 收集祖先信息
2. 添加类名语义评分系统（`SKIP_CLASS_PATTERNS`, `SEMANTIC_SCORE_PATTERNS`）
3. 添加 `buildPathSelector` 程序化生成路径
4. 添加 AI Tool `generate_path_selector` 支持 AI 辅助生成
5. 在 UI 中显示祖先路径，支持 AI 优化

### 2026-01-31: AI-First UI 重构

**问题**：原 UI 直接硬编码调用 `AI_GENERATE_PATH_SELECTOR`，未利用完整的 `ElementAnalysis` 数据；用户无法看到 AI 的决策过程。

**解决**：
1. 创建 `SmartSelectorContext` 统一传递分析数据
2. 添加 `smartRouter.ts` 实现程序化路由决策
3. 创建 `SmartStatus` 组件可视化 AI 状态流
4. 创建 `PathVisualizer` 和 `StructureView` 双视图
5. 添加 Tab 系统支持用户手动覆盖
6. 使用 Framer Motion 实现平滑过渡动画

---

*📌 本文档记录 Homura 选择器系统的设计理念和实现细节，供开发参考*
