# 🔑 关键开发考虑事项

> 开发过程中的核心设计决策和实现要点

---

## 📋 选择器设计

### 已实现 ✅

| 功能 | 实现位置 | 说明 |
|------|----------|------|
| **DOM 结构分析** | `selectorBuilder/analyzer.ts` | 自动识别容器、锚点候选 |
| **Scope+Anchor+Target 生成** | `selectorBuilder/generator.ts` | 三层选择器模式 |
| **选择器实时验证** | `selectorBuilder/validator.ts` | 验证匹配数量和正确性 |
| **检查模式** | `InspectMode.tsx` | 点击元素分析结构 |
| **选择器构建 UI** | `SelectorBuilder.tsx` | 可视化编辑选择器 |

### 核心原则

1. **单一 vs 并列元素**
   - 分析器会检测元素是否在重复结构中（如表格行、列表项）
   - 如果有重复结构 → 使用 Scope + Anchor + Target
   - 如果是单一元素 → 仅使用 Target

2. **锚点候选识别**
   - 优先使用唯一属性：`id`, `data-testid`, `data-id`
   - 次选文本内容：具有唯一性的文本节点
   - 最后使用语义属性：`role`, `aria-label`

3. **选择器健壮性**
   - 避免使用 `:nth-child` 等位置索引
   - 优先使用语义化选择器
   - 支持变量替换 `{{variable}}`

---

## 🎬 录制流程

### 已实现 ✅

| 功能 | 实现位置 | 说明 |
|------|----------|------|
| **录制模式** | `RecordingPanel.tsx` | 开始/停止录制 |
| **点击记录** | `messageHandler.ts` | 监听 click 事件 |
| **输入记录** | `messageHandler.ts` | 监听 input 事件 |

### 录制数据结构

```typescript
interface RecordedAction {
  type: 'click' | 'input' | 'select' | 'scroll';
  timestamp: number;
  elementAnalysis: ElementAnalysis;  // 包含容器、锚点等分析
  value?: string;  // 输入值
}
```

### 待完善 🚧

- [ ] AI 自动参数化（识别动态值如姓名、ID）
- [ ] 录制时的操作预览和编辑
- [ ] 录制合并（多个点击合并为一个工具）

---

## ⚡ 核心操作（五大基元）

### 已实现 ✅

| 基元 | 文件位置 | 特性 |
|------|----------|------|
| `CLICK` | `primitives.ts` | 支持 debugMode |
| `INPUT` | `primitives.ts` | 支持 clearFirst、typeDelay |
| `EXTRACT_TEXT` | `primitives.ts` | 支持 multiple、attribute |
| `WAIT_FOR` | `primitives.ts` | 支持 timeout、visible |
| `NAVIGATE` | `primitives.ts` | 支持 waitForLoad |

### 执行反馈

每个操作返回统一的结果结构：

```typescript
interface ExecuteToolResult {
  success: boolean;
  data?: string | string[];  // EXTRACT_TEXT 的结果
  error?: ExecutionError;
  metadata?: {
    duration: number;
    scopeMatchCount?: number;
    anchorMatchIndex?: number;
  };
}
```

---

## 🤖 AI 集成

### 已实现 ✅

| 功能 | 实现位置 |
|------|----------|
| **通义 API 客户端** | `services/ai/client.ts` |
| **选择器生成 Prompt** | `services/ai/prompts.ts` |
| **工具生成 Prompt** | `services/ai/prompts.ts` |
| **自修复 Prompt** | `services/ai/prompts.ts` |

### AI 调用时机

1. **选择器优化**：用户点击"AI 优化"按钮
2. **工具生成**：录制完成后点击"AI 生成工具"
3. **自修复**：执行失败时（待实现）

### 工具生成流程

```
用户录制操作
    ↓
生成 RecordingTrace
    ↓
AI 分析意图
    ↓
识别参数（将 "张三" → {{student_name}}）
    ↓
生成 AtomicTool JSON
    ↓
用户确认保存
```

---

## 🔄 原子化工具执行

### 执行流程

```
1. 接收 AtomicTool + 参数
    ↓
2. 变量替换：{{variable}} → 实际值
    ↓
3. Scope 解析：找到所有容器
    ↓
4. Anchor 匹配：定位目标容器
    ↓
5. Target 执行：在容器内操作
    ↓
6. 返回结果 + 元数据
```

### 参数填充策略

原子化工具是"缺参"的模板，运行时需要：

1. **用户手动填写**：在 ToolCard 中输入参数
2. **AI 动态填写**：根据页面数据 + Rule Book 决定
3. **从上下文获取**：前一步操作的输出

---

## 📝 待开发功能

### v1.0 目标

- [ ] AI 完整工具生成（录制 → JSON）
- [ ] 工具库持久化同步
- [ ] 参数自动提取

### v1.5 目标

- [ ] Rule Book 解析器
- [ ] Orchestrator 循环执行
- [ ] 页面状态摘要

### v2.0 目标

- [ ] Self-Healing 自动修复
- [ ] 选择器置信度评估
- [ ] 失败恢复策略

---

*🔥 持续更新中*
