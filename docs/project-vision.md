项目架构设计文档：下一代 AI 浏览器自动化 Agent
1. 核心产品哲学 (Core Philosophy)
传统的 RPA 工具（如 Automa）是**命令式（Imperative）的，强依赖人工绘制的“过程连线”。
本项目旨在构建声明式（Declarative）**的自动化系统，核心思想如下：
● 去画布化 (No-Code Graph)：放弃复杂的节点连线图。用户不定义“路径”，只定义“能力（工具）”和“目标（规则）”。
● 大脑与肢体解耦 (Brain-Limb Decoupling)：
  ○ AI (大脑)：负责非确定性的决策（判断条件、选择策略、处理异常）。
  ○ 插件引擎 (肢体)：负责确定性的执行（高精度点击、数据提取、循环遍历）。
● 混合动力循环 (Hybrid Loop)：
  ○ 外层循环（如遍历列表）由代码控制，保证绝对稳定和速度。
  ○ 内层逻辑（如单条审核）由 AI 接管，保证灵活适应变化。
● 稳定性优先：在浏览器插件环境下，不依赖坐标，而是依赖“语义锚点”和“容器作用域”来定位元素。

2. 技术架构 (Technical Architecture)
本项目基于 Chrome Extension (Manifest V3) 开发，分为三层架构。
2.1 表现层 (Presentation Layer) - 用户交互
● Sidebar (录制与教学助手)：
  ○ 嵌入在目标网页右侧的 Shadow DOM 面板。
  ○ 功能：智能录制原子操作、语义元素高亮、实时测试选择器。
  ○ 交互：类似 Chrome DevTools 的 Inspect 模式，但在用户点击元素时，自动识别“父容器”和“关联文本”。
● Dashboard (编排与管理)：
  ○ 独立页面，用于管理“规则书”和“工具库”。
  ○ UI 形态：左侧工具卡片堆栈，右侧自然语言规则编辑器 (Markdown/Prompt)，底部运行日志。
2.2 智能层 (Intelligence Layer) - 决策中枢
● Tool Builder Agent (构建时)：
  ○ 输入：用户的录制动作流 + 页面快照。
  ○ 输出：标准化的 JSON 原子工具定义（自动参数化，如将“仙林”识别为 {{campus}} 变量）。
● Orchestrator Agent (运行时)：
  ○ 输入：当前页面数据的 JSON 摘要 + 用户规则书 (Rule Book)。
  ○ 输出：下一步要调用的工具名称及参数（例如 Call Tool: Search(campus="鼓楼")）。
● Self-Healing Agent (维护时)：
  ○ 触发：当 ElementNotFound 异常发生时。
  ○ 动作：对比新旧 DOM 快照，生成新的 CSS/XPath 选择器并自动热修复。
2.3 执行层 (Execution Layer) - 肢体与引擎
● Atomic Tool Engine (原子工具引擎)：
  ○ 不依赖 Puppeteer/Playwright，直接在 Content Script 中运行。
  ○ 核心能力：基于 Scope (作用域) + Anchor (锚点) 的选择器策略。
● State Monitor (状态监视器)：
  ○ 在 AI 决策前，先将 DOM 转换为轻量级 JSON（减少 Token 消耗）。
  ○ 等待机制：确保页面 Loading 结束或特定元素出现后再返回状态。

3. 核心数据结构与算法 (Key Data Structures)
放弃存储代码片段，转而存储结构化的工具定义。
3.1 原子工具 Schema (JSON)
这是系统中最基础的积木。
 code JSON
downloadcontent_copy
expand_less
{
  "id": "tool_audit_approve",
  "name": "审核通过按钮",
  "description": "点击指定学生所在行的通过按钮",
  "parameters": {
    "student_name": "string"
  },
  "selector_logic": {
    "scope": {
      "type": "container_list",
      "selector": "tr.audit-row" // 1. 找到所有行
    },
    "anchor": {
      "type": "text_match",
      "selector": ".student-name",
      "value": "{{student_name}}" // 2. 在所有行中，定位名字匹配的那一行
    },
    "target": {
      "selector": "button.btn-approve", // 3. 在该行内点击按钮
      "action": "click"
    }
  }
}
3.2 规则书 (Rule Book)
这是用户控制流程逻辑的地方（替代流程图）。
 code Markdown
downloadcontent_copy
expand_less
# 教室分配规则

1. **初始化**：对于获取到的每一个【待审核请求】，执行以下检查。
2. **校区选择**：
   - 如果学院是“艺术学院”，优先搜索【仙林校区】。
   - 其他情况，优先搜索【鼓楼校区】。
3. **教室匹配**：
   - 使用【搜索教室】工具获取列表。
   - 选择容量 > 申请人数的第一个教室。
   - 如果没有合适教室，尝试切换校区重试。
4. **异常**：如果两个校区都没教室，调用【人工介入】工具。

4. 关键功能实现流程
4.1 智能录制 (Smart Recording)
目标：把用户的点击变成通用的函数。
● 用户开启 Sidebar，点击网页上的“搜索”按钮。
● 插件记录 DOM 路径，并抓取周围文本。
● 插件询问 AI：“用户刚才的操作意图是什么？有哪些潜在参数？”
● AI 返回：“意图是搜索，参数可能是下拉框里的值。”
● 插件生成 JSON Schema，保存到工具库。
4.2 运行时混合循环 (Runtime Hybrid Loop)
目标：处理批量任务，兼顾速度与智能。
● Phase 1: 确定性外循环 (Code)
  ○ 引擎直接运行 get_pending_list()，拿到 100 个 ID。
  ○ 开启 for (id of ids) 循环。
  ○ 进入详情页，抓取当前页面的 Key-Value 数据。
● Phase 2: AI 决策内循环 (AI)
  ○ 将 Page Data + Rule Book 发送给 LLM。
  ○ LLM 思考后返回指令：Action: Search(campus="A")。
  ○ 引擎执行 Search 工具（毫秒级 DOM 操作）。
  ○ 引擎将新页面结果返回给 LLM。
  ○ LLM 再次判断：Action: Allocate(classroom="101")。
● Phase 3: 结束
  ○ 引擎提交表单，进入下一个 ID。
4.3 自动修复 (Self-Healing)
● 引擎执行 click(selector) 失败。
● 暂停流程，截取当前 HTML 片段。
● 调用 AI：“在旧版本里这个按钮是 #btn-ok，现在找不到了。请在新的 HTML 里找到功能相同的按钮（通常是绿色、写着‘确定’）。”
● AI 返回新选择器 .submit-v2。
● 引擎使用新选择器重试，并更新数据库。

5. UI/UX 形态总结
● 做加法：在“智能”上做加法。提供 AI 辅助录制、AI 自动修复、AI 语义理解。
● 做减法：在“操作”上做减法。完全移除 画布（Canvas）、连线（Lines）、复杂的 If/Else 节点配置。
● 用户侧重点：
  ○ 小白用户：只看“规则书”，用自然语言写业务逻辑。
  ○ 进阶用户：用“Sidebar”录制新操作，扩充工具库。
6. 开发路线建议 (Roadmap)
● MVP 阶段：
  ○ 实现 Chrome 插件基础框架（Content Script 注入）。
  ○ 实现“原子工具执行引擎”（支持 Scope+Anchor 选择器）。
  ○ 硬编码一个简单的 Rule Book，跑通“抓取 -> AI 决策 -> 点击”的闭环。
● v1.0 阶段：
  ○ 开发 Sidebar 录制界面，接入 LLM 实现自动生成工具 JSON。
  ○ 开发 Dashboard，允许用户编辑 Markdown 规则。
● v2.0 阶段：
  ○ 引入 Self-Healing 机制。
  ○ 支持更复杂的上下文记忆（Memory）。

这份文档可以作为你的项目白皮书。它清晰地界定了 AI（大脑） 和 传统自动化（肢体） 的边界，完美解决了你担心的“流程编辑困难”、“DOM 操作不稳定”和“逻辑死板”的问题。