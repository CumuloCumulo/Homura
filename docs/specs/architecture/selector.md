# Homura 选择器设计文档

> 🎯 **核心理念**：统一数据结构，智能策略路由，语义优先定位

---

## 📐 统一选择器 (UnifiedSelector)

所有选择器统一使用 `UnifiedSelector` schema，支持两种策略：

```typescript
interface UnifiedSelector {
  id: string;                    // 唯一标识符
  strategy: 'path' | 'scope_anchor_target' | 'direct';
  fullSelector: string;          // 最终 CSS 选择器
  confidence: number;            // 置信度 0-1
  validated: boolean;            // 是否已验证

  // 策略 A: Path Selector
  pathData?: {
    root: string;                // 语义根 (如 ".header")
    intermediates: string[];     // 中间路径
    target: string;              // 目标选择器
  };

  // 策略 B: Scope + Anchor + Target
  structureData?: {
    scope: { selector: string; type: 'container_list' | 'single_container' };
    anchor?: { selector: string; type: 'text_match' | 'attribute_match'; value: string; matchMode: string };
    target: { selector: string };
  };

  action: { type: 'CLICK' | 'INPUT' | 'EXTRACT' | 'WAIT' | 'NAVIGATE'; params?: object };
}
```

---

## 🔀 智能策略路由

| 场景 | 策略 | 触发条件 |
|------|------|----------|
| 表格/列表中的元素 | `scope_anchor_target` | 检测到重复容器 + 有锚点候选 |
| 单一嵌套元素 | `path` | 无重复结构 + 有语义祖先 |
| 简单唯一元素 | `direct` | 元素本身足够唯一 |

---

## 📍 策略 A: Path Selector

适用于**单一、复杂、非重复**元素：

```
目标: input.search-input
        ↓ 向上遍历 DOM
div.search-box (score: 0.2) ← 跳过
        ↓
header.main-header (score: 0.9) ← 语义根 ✓

生成: .main-header .search-box input.search-input
```

### 语义评分规则

```typescript
// 高分模式 (0.7-0.9)
/^(official|custom|primary|main)/i
/(-header|-footer|-sidebar|-modal|-form)/i

// 跳过模式
/^(input|box|item|wrapper|container)$/i
/^(el-|ant-|van-|v-|ng-)/i  // 框架前缀
/^(is-|has-|active|hover)/i  // 状态类
```

---

## 📍 策略 B: Scope + Anchor + Target

适用于**重复结构**（表格、列表、卡片）：

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SCOPE: 找到所有容器                                       │
│    selector: "tr" → [Row1, Row2, Row3, ...]                 │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ Row1: 张三 | 计算机学院 | [批准]                     │  │
│    │ Row2: 李四 | 艺术学院   | [批准] ← 2. ANCHOR 匹配    │  │
│    │ Row3: 王五 | 数学学院   | [批准]                     │  │
│    └─────────────────────────────────────────────────────┘  │
│                                ↓                            │
│                     3. TARGET: 点击 [批准]                  │
└─────────────────────────────────────────────────────────────┘
```

### 高熵值锚点选择 (Entropy-Aware Anchor Selection)

锚点必须能**区分不同行**，而不仅仅是"存在于当前行"。

**问题案例**：
```
Row1: Alice  | Pending | [Approve]
Row2: Bob    | Pending | [Approve]  ← 用户点击这里
Row3: 张三   | Pending | [Approve]
```

❌ **错误锚点**: `span.status` (text: "Pending") - 在所有行都存在  
✅ **正确锚点**: `td.student-name` (text: "Bob") - 仅在当前行唯一

**算法流程**：
```
1. 获取兄弟容器 (sibling TRs)
2. 对每个候选锚点:
   - 统计在兄弟行中的出现频率
   - 频率 = 0 → 唯一 → 置信度 +30%
   - 频率 > 0 → 重复 → 置信度 × (1 - ratio × 0.9)
3. 低熵词汇 (pending, edit, delete...) → 置信度 × 0.3
4. 按 isUnique > confidence 排序
```

**低熵词汇黑名单**：
```
pending, approved, rejected, edit, delete, save, cancel,
status, action, yes, no, true, false, n/a, ...
```

---

## 🔍 生成流程

```
用户点击元素
      ↓
analyzeElement() → ElementAnalysis
      ↓
determineStrategy() → 'path' | 'scope_anchor_target' | 'direct'
      ↓
┌─────────────────┬───────────────────────────┐
│ Path            │ Scope+Anchor+Target       │
├─────────────────┼───────────────────────────┤
│ buildPathData() │ buildStructureData()      │
└─────────────────┴───────────────────────────┘
      ↓
createUnifiedSelector() → UnifiedSelector
      ↓
(可选) AI 优化 → 更新 UnifiedSelector
```

---

## 🛠️ 核心函数

### analyzer.ts

| 函数 | 作用 |
|------|------|
| `analyzeElement(el)` | 分析元素，返回 `ElementAnalysis` |
| `collectAncestorPath(el)` | 收集祖先路径 + 语义评分 |
| `findRepeatingContainer(el)` | 找重复容器 (TR/LI/ARTICLE) |

| `findAnchorCandidates(container)` | **高熵值锚点选择** (跨行唯一性验证) |
| `getSiblingContainers(container)` | 获取兄弟容器用于唯一性验证 |
| `countSiblingMatches(...)` | 统计锚点值在兄弟行的出现频率 |
| `buildMinimalSelector(el)` | 生成最小化选择器 |

### generator.ts

| 函数 | 作用 |
|------|------|
| `createUnifiedSelector(analysis)` | 创建统一选择器 |
| `determineStrategy(analysis)` | 决定最佳策略 |
| `buildPathData(analysis)` | 构建路径数据 |
| `buildStructureData(analysis)` | 构建结构数据 |
| `convertPathSelectorToUnified()` | 旧格式转换 |
| `convertUnifiedToSelectorLogic()` | 转换为执行格式 |

### executor.ts

| 函数 | 作用 |
|------|------|
| `executeUnifiedSelector(selector)` | 执行统一选择器 |
| `executeTool(tool)` | 执行原子工具 |
| `resolveAnchor(scopes, anchor)` | **多候选遍历** - 搜索所有匹配元素 |
| `resolveAnchorInSplitTable(...)` | **Split Table 支持** - 虚拟复合作用域 |

---

## 🔧 执行引擎修复

### 多候选锚点遍历 (Multi-Match Anchor Traversal)

**问题**: 当 Cell 中有多个元素时，旧逻辑只检查第一个：
```html
<td><a>详情</a> | <a>安排教室</a></td>
```
查找 "安排教室" 时，`querySelector` 返回 "详情"，匹配失败。

**修复**: 使用 `querySelectorAll` 遍历所有候选：
```typescript
const anchorCandidates = querySelectorAll(anchor.selector, scopeEl);
for (const candidate of anchorCandidates) {
  if (matchText(candidate.textContent, anchor.value)) {
    return { element: scopeEl, index: i };  // ✓ 找到
  }
}
```

### Split Table 支持 (虚拟复合作用域)

**问题**: jqxGrid 等使用"双表拼接"实现列冻结，左右表的行共享 ID：
```
#pinnedtabledsh: [详情 | 安排教室]  ← 操作按钮
#tabledsh:        [张三 | 学院 | ...]  ← 数据列
                   ^
                   两个 TR 有相同 ID: row0dsh-index-table
```

当 Anchor 在右表 (text: "张三")，Target 在左表 ("安排教室") 时，传统的 `scope.contains(target)` 会失败。

**修复**: Virtual Composite Scope
```
1. 检测 Scope 中是否有重复 ID
2. 将同 ID 的元素合并为"逻辑行"
3. Anchor 可在任意表匹配
4. Target 跨所有同 ID 元素搜索
```

---

## 📊 选择器优先级

生成最小化选择器时的优先级：

```
1. 稳定 ID        → #submit-btn
2. data-testid   → [data-testid="search"]
3. name 属性     → input[name="username"]
4. 语义 class    → button.btn-primary
5. role/type     → button[type="submit"]
6. 结构位置      → button:nth-of-type(2)
```

### 避免的选择器

```typescript
// ❌ 不稳定
element.id.match(/\d{5,}|uuid|random|react|vue/i)  // 动态ID
element.classList.match(/active|hover|ng-|vue-/i)   // 状态类

// ❌ 非标准 CSS
button:contains("Search")  // jQuery 语法
```

---

### 单元格级别精确定位 (Cell-Level Targeting)

**问题**: 表格行内所有 TD 具有相同 class (`jqx-cell.jqx-grid-cell`)，导致目标选择器不精确：
```
targetSelector: td.jqx-cell.jqx-grid-cell span  ← 匹配行内所有 span
```

**修复**: `buildMinimalSelector` 现在会检查选择器唯一性：
```typescript
// 生成 class-based 选择器后，检查在父元素中是否唯一
const matches = parent.querySelectorAll(`:scope > ${baseSelector}`);
if (matches.length > 1) {
  // 不唯一 → 添加 nth-of-type 精确定位
  return `${baseSelector}:nth-of-type(${index})`;
}
```

**结果**:
```
旧: td.jqx-cell.jqx-grid-cell span     ← 匹配所有单元格
新: td.jqx-cell:nth-of-type(5) span    ← 只匹配第5列
```

### Grid/Flex 卡片布局支持 (Card Layout Fix)

**问题**: Tailwind Grid 布局中，`<a>` 元素作为卡片容器被错误跳过：
```html
<div class="grid grid-cols-1">
  <a class="block p-6...">        ← 被 SKIP_AS_CONTAINER 跳过
    <div class="flex">            ← 错误识别为容器
      <h2>我的AI伴侣</h2>
    </div>
  </a>
</div>
```

导致策略路由失败：
- `containerType: 'card'` 但 `determineStrategy` 只支持 `'table'` 和 `'list'`
- 回退到 `'path'` 策略 → 生成泛化选择器 `div.grid-cols-1 h2...`

**修复 1: 策略路由扩展**
```typescript
// determineStrategy 现在支持所有重复结构类型
const isStructuredContainer = 
  containerType === 'table' || 
  containerType === 'list' ||
  containerType === 'card' ||   // 新增
  containerType === 'grid';     // 新增
```

**修复 2: Grid/Flex Item 容器识别**
```typescript
// 如果父元素是 Grid/Flex，<a> 是有效的列表项容器
if (isGridOrFlexContainer(parent) && VALID_GRID_ITEMS.includes(current.tagName)) {
  return current;  // <a> 作为容器返回
}
```

**结果**:
```
旧: containerType: 'card', strategy: 'path' → div.grid-cols-1 h2... (匹配所有)
新: containerType: 'grid', strategy: 'scope_anchor_target' → 精确定位
```

---

## 📝 设计决策

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-01-31 | 跳过 TD/TH 作为容器 | TD 是单元格，TR 才是行 |
| 2026-01-31 | 添加语义容器识别 | 支持 `.search-bar button` 这类模式 |
| 2026-02-01 | 引入 UnifiedSelector | 统一 Path 和 Structure 两种策略 |
| 2026-02-01 | 添加 Quick Actions 双模式 | Path 模式也需要测试操作 |
| 2026-02-01 | **高熵值锚点优先** | 跨行唯一性验证，避免 "Pending" 这类重复值误匹配 |
| 2026-02-01 | **多候选锚点遍历** | 修复 Cell 内多元素场景 `<a>详情</a>\|<a>安排</a>` |
| 2026-02-01 | **Split Table 支持** | 支持 jqxGrid 等双表拼接布局 (Virtual Composite Scope) |
| 2026-02-01 | **单元格精确定位** | 检查选择器唯一性，不唯一时添加 `nth-of-type` |
| 2026-02-02 | **Grid/Flex Item 识别** | `<a>` 在 Grid 布局中是有效的列表项容器 |
| 2026-02-02 | **策略路由扩展** | `card`/`grid` 类型启用 Scope+Anchor 策略 |

---

## 🐛 问题案例：容器元素文本获取缺陷 (Container Text Extraction Issue)

### 问题描述

**案例 HTML 结构** (jqxWidget 下拉列表)：
```html
<div id="listBoxContentinnerListBoxjqxWidget...">
  <!-- 用户点击这个 div -->
  <div role="option" id="listitem2...">
    <!-- 文本在这个 span 里 -->
    <span class="jqx-listitem-state-normal jqx-item">团学活动</span>
  </div>
</div>
```

**问题现象**：
- 用户点击"团学活动"列表项
- `analyzeElement` 返回 `targetText: ""`
- `buildSelectorWithAnchor` 无法匹配锚点
- Fallback 只取 `anchorCandidates[0]` = "请选择"
- 生成错误的选择器

### 根本原因

**设计假设与现实不匹配：**

| 假设 | 现实 |
|------|------|
| 用户点击的元素包含文本 | 用户点击的是**容器**，文本在**子元素**里 |
| `target.textContent` 可用 | 容器元素（div）的 `textContent` 为空 |
| `getDirectTextContent` 足够 | 只获取元素**自己的**文本，删除所有子元素 |

**`getDirectTextContent` 的限制：**
```typescript
function getDirectTextContent(element: HTMLElement): string {
  const clone = element.cloneNode(true);
  Array.from(clone.children).forEach((child) => child.remove()); // ← 删除所有子元素
  return clone.textContent?.trim() || "";
}
```

对于 `<div><span>文本</span></div>`：
- 克隆 div
- 删除 span 子元素
- div 本身没有文本 → 返回 `""`

---

## 🔧 解决方案：多策略文本获取

### 1. 增强的 ElementAnalysis

**新增字段**：
```typescript
export interface ElementAnalysis {
  // ... 现有字段

  /** 子元素文本内容（当 targetText 为空时使用） */
  childText?: string;

  /** 元素在容器中的位置（用于位置推断） */
  positionInContainer?: number;
}
```

### 2. 新增 `getMeaningfulChildText` 函数

```typescript
/**
 * 获取元素的有意义子元素文本
 * 用于当元素本身没有文本时，从子元素中提取
 *
 * 优先级：
 * 1. 非 low-entropy 文本（不是 "edit", "delete" 等）
 * 2. 语义元素中的文本（span, label, a, button, option）
 * 3. 合理长度（2-100 chars）
 */
function getMeaningfulChildText(element: HTMLElement): string {
  for (const child of Array.from(element.children)) {
    const childEl = child as HTMLElement;
    const text = getDirectTextContent(childEl);

    if (!text || text.length < 2 || text.length > 100) continue;
    if (isLowEntropyText(text)) continue;

    // 优先语义元素
    if (["SPAN", "LABEL", "A", "BUTTON", "OPTION"].includes(childEl.tagName)) {
      return text;
    }
  }
  return "";
}
```

### 3. 在 `analyzeElement` 中收集完整信息

```typescript
export function analyzeElement(element: HTMLElement): ElementAnalysis {
  // ... 现有逻辑

  // 11. Get target text content
  const targetText = getDirectTextContent(element);

  // 12. Get child text content (fallback)
  const childText = getMeaningfulChildText(element);

  // 13. Get position in container (for fallback)
  const positionInContainer = container
    ? Array.from(container.children).indexOf(element)
    : -1;

  return {
    // ... 现有字段
    targetText,
    childText,           // ← 新增
    positionInContainer, // ← 新增
  };
}
```

---

## 🧠 智能锚点匹配逻辑

### 多策略文本获取流程

```
获取目标元素文本
    ↓
策略 1: targetText (元素自己的文本)
    ↓ 为空？
策略 2: childText (子元素文本) ← NEW!
    ↓ 仍然为空？
策略 3: 语义属性 (aria-label, title) ← 未来扩展
    ↓
匹配 anchorCandidates
```

### 智能锚点选择（buildStructureData 增强）

```typescript
export function buildStructureData(analysis: ElementAnalysis) {
  // ... 现有逻辑

  // 智能锚点选择（优先级顺序）：
  let topAnchor = analysis.anchorCandidates?.[0];

  // 优先级 1: 通过文本内容匹配
  const targetText = analysis.targetText || analysis.childText;
  if (targetText) {
    const matched = analysis.anchorCandidates.find(a => a.text === targetText);
    if (matched) topAnchor = matched;
  }

  // 优先级 2: 通过位置推断匹配
  else if (analysis.positionInContainer >= 0) {
    topAnchor = analysis.anchorCandidates[analysis.positionInContainer];
  }

  // Fallback: 使用第一个锚点
  // (这是最后的保底方案)
}
```

---

## 📊 改进后的完整流程

### 对于"团学活动"案例

```
用户点击 div[role="option"] #3 ("团学活动")
  ↓
analyzeElement(div)
  ├─ targetText = ""                    (div 直接文本为空)
  ├─ childText = "团学活动"            ← NEW! 从子元素 span 获取
  ├─ positionInContainer = 2           ← NEW! 第3个列表项
  └─ anchorCandidates = [
      { selector: 'span', text: "请选择" },
      { selector: 'span', text: "教师教学、补课" },
      { selector: 'span', text: "团学活动" },  ← 应该匹配这个
      { selector: 'span', text: "考试" },
      { selector: 'span', text: "讲座" }
    ]
  ↓
createUnifiedSelector()
  ├─ buildSelectorWithAnchor()
  │   ├─ targetText = "" → 跳过
  │   ├─ childText = "团学活动" ✓
  │   └─ 匹配 anchorCandidates[2] ✓
  │
  └─ 生成的 UnifiedSelector:
    {
      strategy: 'scope_anchor_target',
      structureData: {
        scope: { selector: 'div:nth-of-type(2)' },
        anchor: {
          selector: 'span.jqx-listitem-state-normal.jqx-item',
          value: '团学活动'  ← 正确的锚点！
        },
        target: { selector: 'div[role="option"]' }
      },
      confidence: 0.95
    }
```

---

## 📝 设计决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-03-26 | **多策略文本获取** | 容器元素的文本可能在子元素中，需要逐级降级获取 |
| 2026-03-26 | **childText 字段** | 当 targetText 为空时，使用子元素文本进行锚点匹配 |
| 2026-03-26 | **positionInContainer 字段** | 当文本无法匹配时，使用位置推断正确的锚点 |
| 2026-03-26 | **智能锚点选择优先级** | 文本匹配 → 位置推断 → 第一个锚点（保底） |
| 2026-03-26 | **getMeaningfulChildText 语义优先** | 优先获取 SPAN/LABEL/A/BUTTON 等语义元素的文本 |

---

## 🎯 关键要点

### Scope 设计理念（不变）

**Scope = 列表的容器**（不是单个列表项）
- 方便 Agent 遍历整个列表
- 支持列表级操作（统计、批量处理）
- 统一的处理逻辑

### 文本获取策略（增强）

```
目标元素文本获取优先级：
1. 元素自己的文本 (targetText)
2. 子元素的文本 (childText) ← NEW!
3. 语义属性 (aria-label, title) ← 未来
4. 位置推断 (positionInContainer) ← NEW!
```

### 锚点匹配策略（增强）

```
锚点选择优先级：
1. 文本匹配 (targetText || childText)
2. 位置推断 (positionInContainer)
3. 第一个锚点 (anchorCandidates[0]) ← 保底
```

---

## ✅ 验证效果

**改进前**：
```javascript
{
  targetText: "",
  anchorCandidates: ["请选择", "教师教学", "团学活动", ...],
  structureData: {
    anchor: { value: "请选择" }  // ❌ 错误
  }
}
```

**改进后**：
```javascript
{
  targetText: "",
  childText: "团学活动",        // ← 新增
  positionInContainer: 2,       // ← 新增
  anchorCandidates: ["请选择", "教师教学", "团学活动", ...],
  structureData: {
    anchor: { value: "团学活动" }  // ✅ 正确
  }
}
```

---

*📌 本文档记录 Homura 选择器系统的设计，供开发参考*
