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

## 🤖 AI Agent 决策循环（声明式执行）

### 执行流程

```
┌─────────────────────────────────────────────────────────────┐
│  AI Agent 决策循环（声明式）                                 │
└─────────────────────────────────────────────────────────────┘

1. 初始化
   ├─ 加载 Blueprint
   ├─ 解析 Rule Book
   └─ 初始化 Agent 状态

2. 迭代循环（直到目标达成或达到最大迭代次数）
   │
   ├─ [观察] 获取当前页面状态
   │  ├─ DOM → JSON 转换
   │  ├─ 提取关键信息
   │  └─ 更新上下文变量
   │
   ├─ [思考] AI 决策
   │  ├─ 理解 Rule Book 规则
   │  ├─ 分析当前页面状态
   │  ├─ 选择下一步行动
   │  └─ 决定调用哪个 Skill
   │
   ├─ [执行] 调用 Skill
   │  ├─ 填充 Skill 参数
   │  ├─ 执行 Scope → Anchor → Target
   │  └─ 返回执行结果
   │
   ├─ [观察] 检查执行结果
   │  ├─ 成功？继续下一步
   │  ├─ 失败？尝试恢复
   │  └─ 达成目标？退出循环
   │
   └─ 重复迭代

3. 完成
   ├─ 返回最终结果
   ├─ 记录执行日志
   └─ 保存决策历史
```

### 关键特点

**1. 无固定步骤**
- 不预定义执行顺序
- AI 根据页面状态动态决策
- 每次执行的路径可能不同

**2. 迭代而非步骤**
- 显示"迭代 5/20"而非"步骤 3/10"
- 迭代次数 = AI 决策次数
- 同一个 Skill 可能被调用多次

**3. 推理透明**
- 记录每次决策的观察、思考、执行过程
- 用户可以查看 AI 的决策流
- 便于调试和优化 Rule Book

**4. 异常自恢复**
- 执行失败时，AI 自动分析原因
- 尝试替代策略或重试
- 记录失败和恢复过程

### 示例：教室分配 Blueprint

```
迭代 1:
[观察] 页面状态: 教室列表页面，列表项数: 15
[思考] Rule: 容量 > 50，首选仙林校区
[执行] Skill: 搜索教室 (campus: "仙林", capacity: 50)
[观察] 结果: 找到 3 个教室

迭代 2:
[观察] 页面状态: 搜索结果页，选中 A101
[思考] Rule: 选择容量最大的教室
[执行] Skill: 选择教室 (name: "A101")
[观察] 结果: 成功，弹出确认对话框

迭代 3:
[观察] 页面状态: 确认对话框
[思考] Rule: 自动确认
[执行] Skill: 确认提交
[观察] 结果: 成功，返回列表页

迭代 4:
[观察] 页面状态: 返回列表页
[思考] Rule: 继续处理下一个学生
[执行] Skill: 获取下一条记录
[观察] 结果: 获取到学生"张三"

...（继续迭代直到所有学生处理完成）
```

### Skills 编排的作用

虽然 AI Agent 是声明式执行，但 Skills 的合理排序可以帮助 AI：

1. **快速理解常用路径**
   - 常用的 Skills 放在前面
   - AI 可以快速找到合适的 Skill

2. **减少不必要的尝试**
   - 按照使用频率排序
   - 减少 AI 的试错次数

3. **提高首次决策准确率**
   - 相关 Skills 分组
   - AI 更容易理解上下文

**注意**：Skills 排序是"建议"，不是"强制"。AI 仍然可以根据情况选择任何 Skill。

### 与传统工作流的区别

| 维度 | 传统工作流 | AI Agent 声明式 |
|------|-----------|----------------|
| 执行顺序 | 预定义步骤 | AI 动态决策 |
| 条件分支 | If/Else 节点 | AI 根据状态判断 |
| 异常处理 | 预定义错误分支 | AI 自动推理恢复 |
| 循环逻辑 | For/While 节点 | AI 自主决定何时结束 |
| 用户心智 | "我要画流程" | "我要写规则" |

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
