# Homura 命名规范

> **统一术语，清晰概念**

---

## 核心概念

### Blueprint（蓝图）- 唯一的自动化单元

**定义**：一个完整的自动化包，包含 Meta、Skills 集合、Rule Book 和 Agent 配置。

**使用场景**：
- 用户在 Dashboard 中创建和编辑 Blueprint
- 用户可以从 Blueprint Library 选择 Blueprint 运行
- Blueprint 可以导出/导入（JSON 文件）
- Blueprint 可以在社区分享

**术语示例**：
- ✅ "创建一个教室分配 Blueprint"
- ✅ "这个 Blueprint 包含 5 个 Skills"
- ✅ "运行 Blueprint 并查看决策流"
- ❌ "创建一个 Mission"（不要使用 Mission）

---

## 核心组件命名

### 1. AtomicTool / Skill（原子工具/技能）

**定义**：最小的可执行单元，表示一个原子操作（点击、输入、提取等）。

**术语示例**：
- ✅ "录制一个新的 Skill"
- ✅ "这个 Skill 需要 3 个参数"
- ✅ "Skill 集合包含 8 个原子工具"

**注意**：
- `AtomicTool` 是技术术语（代码中）
- `Skill` 是用户界面术语（Dashboard 中）
- 两者可以互换使用

### 2. Rule Book（规则书）

**定义**：用自然语言编写的业务规则，指导 AI Agent 如何使用 Skills。

**术语示例**：
- ✅ "编辑 Rule Book 来定义业务逻辑"
- ✅ "AI Agent 根据 Rule Book 决策"
- ✅ "Rule Book 使用 Markdown 格式"

### 3. Agent / AI Agent（代理）

**定义**：执行引擎，理解 Rule Book 并动态调用 Skills。

**术语示例**：
- ✅ "AI Agent 正在运行"
- ✅ "Agent 完成了 15 次迭代"
- ✅ "Agent 决策调用搜索 Skill"

---

## 状态命名

### Blueprint 状态

| 状态 | 含义 | 术语 |
|------|------|------|
| 编辑中 | Blueprint 正在被修改 | "Editing" |
| 已保存 | Blueprint 已保存到库 | "Saved" |
| 运行中 | Agent 正在执行 Blueprint | "Running" |
| 已完成 | Blueprint 执行完成 | "Completed" |
| 已停止 | Blueprint 被用户停止 | "Stopped" |
| 错误 | Blueprint 执行出错 | "Error" |

**术语示例**：
- ✅ "Blueprint 状态：Running（iteration 5/20）"
- ✅ "Blueprint 执行完成，共处理 15 条记录"
- ❌ "Mission Started"（不要使用 Mission）

---

## UI 界面命名

### Dashboard 界面

| 组件 | 命名 | 说明 |
|------|------|------|
| Blueprint 列表 | Blueprint Library | 展示所有已保存的 Blueprint |
| Blueprint 编辑器 | Blueprint Editor | 编辑 Blueprint 的 Skills 和 Rule Book |
| 执行监控面板 | Monitor Panel | 显示 Agent 决策流和当前状态 |
| Skills 集合 | Skills Collection | Blueprint 中的所有 Skills |
| Skills 编排 | Skills Orchestration | 手动排序、分组 Skills |

### SidePanel 界面

| 组件 | 命名 | 说明 |
|------|------|------|
| 录制模式 | Recording Mode | 录制用户操作 |
| 检查模式 | Inspect Mode | 检查元素结构 |
| 快速操作 | Quick Action | 单独测试 Skills |

---

## 数据结构命名

### Blueprint Schema

\`\`\`typescript
interface Blueprint {
  meta: BlueprintMeta;        // Meta 信息
  skills: AtomicTool[];       // Skills 集合
  rules: string;              // Rule Book (Markdown)
  agentConfig?: AgentConfig;  // Agent 配置
  maintenance?: MaintenanceInfo; // 维护信息
}
\`\`\`

**命名规范**：
- ✅ \`skills\` - 复数形式，表示集合
- ✅ \`rules\` - 复数形式，表示整体规则
- ✅ \`agentConfig\` - 驼峰命名
- ❌ \`mission\` - 不要使用

---

## 术语对照表

| 旧术语（不要使用） | 新术语（推荐） | 说明 |
|------------------|---------------|------|
| Mission | Blueprint | 统一使用 Blueprint |
| Workflow | Blueprint | 强调声明式，非流程 |
| Task | Blueprint Execution | Task 可能引起歧义 |
| Job | Blueprint Run | Job 过于技术化 |
| Script | Rule Book | Script 是命令式，Rule Book 是声明式 |
| Tool | Skill | UI 中使用 Skill，代码中使用 AtomicTool |
| Action | Skill Execution | Action 太通用 |

---

## 文件命名

### Blueprint 导出文件

**格式**：\`{name}-v{version}.blueprint.json\`

**示例**：
- \`classroom-allocation-v1.2.0.blueprint.json\`
- \`audit-workflow-v2.0.1.blueprint.json\`

**规则**：
- 使用小写字母和连字符
- 包含名称和版本号
- 使用 \`.blueprint.json\` 扩展名

### Blueprint 文档

**格式**：\`{name}.md\`

**示例**：
- \`classroom-allocation.md\`
- \`audit-workflow.md\`

---

## API 命名

### Blueprint 相关 API

\`\`\`
GET    /api/blueprints           # 获取 Blueprint 列表
GET    /api/blueprints/:id       # 获取单个 Blueprint
POST   /api/blueprints           # 创建 Blueprint
PUT    /api/blueprints/:id       # 更新 Blueprint
DELETE /api/blueprints/:id       # 删除 Blueprint
POST   /api/blueprints/:id/run   # 运行 Blueprint
GET    /api/blueprints/:id/logs  # 获取执行日志
\`\`\`

### Skill 相关 API

\`\`\`
GET    /api/skills               # 获取 Skills 列表
GET    /api/skills/:id           # 获取单个 Skill
POST   /api/skills               # 创建 Skill
PUT    /api/skills/:id           # 更新 Skill
DELETE /api/skills/:id           # 删除 Skill
POST   /api/skills/:id/test      # 测试 Skill
\`\`\`

---

## 代码命名

### 类型命名

\`\`\`typescript
// Blueprint 相关
interface Blueprint { }
interface BlueprintMeta { }
interface AgentConfig { }

// Skill 相关
interface AtomicTool { }
interface SkillParameters { }
interface ExecuteToolResult { }

// Agent 相关
interface AgentState { }
interface DecisionContext { }
interface DecisionResult { }
\`\`\`

### 函数命名

\`\`\`typescript
// Blueprint 操作
async function createBlueprint(data: CreateBlueprintDto): Promise<Blueprint>
async function updateBlueprint(id: string, data: UpdateBlueprintDto): Promise<Blueprint>
async function deleteBlueprint(id: string): Promise<void>
async function runBlueprint(id: string, params?: Record<string, unknown>): Promise<void>

// Skill 操作
async function createSkill(data: CreateSkillDto): Promise<AtomicTool>
async function updateSkillOrder(blueprintId: string, order: string[]): Promise<void>
async function testSkill(skill: AtomicTool, params: Record<string, unknown>): Promise<ExecuteToolResult>

// Agent 操作
async function startAgent(blueprint: Blueprint): Promise<void>
async function stopAgent(agentId: string): Promise<void>
async function getAgentState(agentId: string): Promise<AgentState>
\`\`\`

---

## 用户界面文案

### Blueprint Library

\`\`\`
标题：Blueprint Library
搜索：Search Blueprints...
新建按钮：+ New Blueprint
卡片信息：
- 教室分配 Blueprint
- 5 Skills
- v1.2.0
- Last run: 2 hours ago
\`\`\`

### Blueprint Editor

\`\`\`
标题：Blueprint Editor
Meta 信息：
- Name
- Description
- Version
- Author

Skills 部分：
- Skills Collection
- Reorder Skills (↑↓)
- Add Skill (+)
- Create Group (📁)

Rule Book 部分：
- Rule Book (Markdown)
- AI Optimize Rules
- Load Template
\`\`\`

### Monitor Panel

\`\`\`
标题：Monitor
Status Overview：
- Status: Running
- Iteration: 5/20
- Duration: 00:02:34
- Success: 3 / Error: 1

AI Decision Flow：
- [观察] 页面状态
- [思考] 决策逻辑
- [执行] Skill 调用

Current Context：
- Page: 教室分配页面
- Variables: campus, capacity, student_name
- Available Skills: ✓✓✓✗
\`\`\`

---

## 总结

**核心原则**：
1. **统一术语**：所有地方使用 Blueprint，不要混用 Mission/Workflow
2. **清晰区分**：Skill（UI）vs AtomicTool（代码），可互换使用
3. **强调声明式**：Rule Book 而非 Script，Agent 决策而非固定流程
4. **版本化管理**：Blueprint 文件包含版本号，便于追踪

**避免使用的术语**：
- ❌ Mission（使用 Blueprint）
- ❌ Workflow（使用 Blueprint）
- ❌ Script（使用 Rule Book）
- ❌ Job/Task（使用 Blueprint Run/Execution）

**推荐使用的术语**：
- ✅ Blueprint（蓝图）
- ✅ Skill / AtomicTool（技能/原子工具）
- ✅ Rule Book（规则书）
- ✅ AI Agent（AI 代理）
- ✅ Decision Flow（决策流）
- ✅ Iteration（迭代）

---

*保持术语一致性，降低用户认知负荷*
