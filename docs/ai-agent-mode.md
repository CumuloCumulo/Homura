# AI Agent 模式设计文档

> 🎯 **核心理念**：Skills + Rules → AI Agent 自主执行，而非预定义 Workflow

---

## 🔄 模式对比

### ❌ Workflow 模式（传统 RPA）
```json
{
  "workflow": {
    "steps": [
      { "action": "click", "selector": "#btn1" },
      { "action": "input", "selector": "#input1", "value": "test" },
      { "action": "click", "selector": "#btn2" }
    ]
  }
}
```

**问题**：
- 线性执行，无法处理异常
- 预定义路径，无法动态调整
- 需要提前规划所有可能分支

### ✅ AI Agent 模式（Homura）
```json
{
  "skills": [
    { "tool_id": "search_student", ... },
    { "tool_id": "click_approve", ... }
  ],
  "rules": "# 审批规则\n根据学院自动审批..."
}
```

**优势**：
- AI 根据规则动态决策
- 可以循环、跳过、重试
- 自主处理异常情况

---

## 📐 数据结构

### Blueprint（插件蓝图）

```typescript
interface Blueprint {
  meta: {
    name: string;              // 蓝图名称
    version: string;           // 版本号
    description?: string;      // 描述
    author?: string;           // 作者
    targetUrl: string;         // 目标网址模式
    skillsHash: string;        // Skills 的哈希，用于检测变化
  };
  
  // Skill 库（原子工具）
  skills: AtomicTool[];
  
  // Rule Book（执行规则 - Markdown 格式）
  rules: string;
  
  // 可选：Agent 配置
  agentConfig?: {
    maxIterations: number;     // 最大迭代次数
    timeout: number;           // 超时时间（ms）
    llmProvider: 'tongyi' | 'openai' | 'claude';
    apiKey?: string;           // 可选的 API Key
  };
}
```

### Rule Book 示例

```markdown
# 学生审批自动化规则

## 目标
批量审批待审核的学生申请

## 执行流程

1. **初始化**：打开审批列表页面

2. **遍历申请**：对于列表中的每个申请：
   - 提取学生姓名和学院信息
   - 根据学院判断审批结果：
     * 艺术学院 → 自动通过
     * 其他学院 → 需要人工审核（标记为待处理）
   
3. **执行审批**：
   - 如果是"通过"：点击"通过"按钮
   - 如果是"拒绝"：输入拒绝原因，点击"拒绝"按钮
   - 等待操作完成

4. **错误处理**：
   - 如果页面加载超时，重试 3 次
   - 如果找不到学生，记录日志并跳过
   - 如果按钮不可点击，截图并通知人工介入

## 可用技能
- search_student: 搜索学生
- click_approve: 点击通过按钮
- click_reject: 点击拒绝按钮
- extract_info: 提取学生信息
```

---

## 🤖 AI Agent 执行流程

### 核心循环

```typescript
class AIAgent {
  async execute(userParams: Record<string, any>) {
    const context: ExecutionContext = {
      variables: userParams,
      history: [],
      currentPage: await this.getCurrentPageState()
    };
    
    let iterations = 0;
    const maxIterations = this.agentConfig?.maxIterations || 50;
    
    while (iterations < maxIterations) {
      iterations++;
      
      // 1. 获取当前页面状态
      const pageState = await this.getCurrentPageState();
      
      // 2. 让 AI 决策下一步
      const decision = await this.llm.chat([
        {
          role: 'system',
          content: this.buildPrompt(pageState, context)
        }
      ]);
      
      // 3. 执行决策
      if (decision.action === 'complete') {
        break; // 任务完成
      }
      
      if (decision.action === 'call_skill') {
        const skill = this.skills.get(decision.skillId);
        const result = await this.executeSkill(skill, decision.params);
        
        // 更新上下文
        context.history.push({ skillId: decision.skillId, result });
        if (result.data) {
          context.variables = { ...context.variables, ...result.data };
        }
      }
      
      if (decision.action === 'ask_user') {
        // 需要用户介入
        const userResponse = await this.promptUser(decision.reasoning);
        context.variables = { ...context.variables, ...userResponse };
      }
    }
    
    return { success: iterations < maxIterations, iterations, finalState: context };
  }
}
```

### Prompt 构建

```typescript
buildPrompt(pageState: PageState, context: ExecutionContext): string {
  return `你是一个浏览器自动化 Agent。

可用技能：
${this.formatSkills()}

执行规则：
${this.rules}

当前上下文：
- 页面状态：${JSON.stringify(pageState, null, 2)}
- 变量：${JSON.stringify(context.variables)}
- 历史记录：${context.history.length} 步

请决定下一步操作。返回 JSON 格式：
{
  "action": "call_skill" | "complete" | "ask_user",
  "skillId": "技能名称",
  "params": { 参数 },
  "reasoning": "决策理由"
}`;
}
```

---

## 🎯 决策类型

### 1. call_skill - 调用技能
```json
{
  "action": "call_skill",
  "skillId": "click_approve",
  "params": { "student_name": "张三" },
  "reasoning": "学生来自艺术学院，规则要求自动通过"
}
```

### 2. complete - 任务完成
```json
{
  "action": "complete",
  "reasoning": "所有申请已处理完成"
}
```

### 3. ask_user - 请求用户介入
```json
{
  "action": "ask_user",
  "reasoning": "遇到无法处理的情况：学生信息不完整",
  "requiredParams": ["student_name"]
}
```

---

## 📊 执行上下文

```typescript
interface ExecutionContext {
  // 用户提供的初始参数 + 运行时产生的变量
  variables: Record<string, any>;
  
  // 执行历史
  history: Array<{
    skillId: string;
    params: Record<string, any>;
    result: any;
    reasoning?: string;
    timestamp: number;
  }>;
  
  // 当前页面状态
  currentPage: PageState;
  
  // Agent 内部状态
  state: {
    iterations: number;
    startTime: number;
    lastSkillCall?: number;
  };
}

interface PageState {
  url: string;
  title: string;
  // DOM 摘要（关键文本、链接、表单等）
  summary: {
    text: string[];
    links: Array<{ text: string; href: string }>;
    forms: Array<{ id: string; fields: string[] }>;
  };
}
```

---

## 🛡️ 安全约束

### 1. Skill 白名单
AI 只能调用 `Blueprint.skills` 中定义的技能：
```typescript
const skill = this.skills.get(decision.skillId);
if (!skill) {
  throw new Error(`技能不存在: ${decision.skillId}`);
}
```

### 2. 参数验证
调用 Skill 前验证参数：
```typescript
const validation = this.validateParams(skill, decision.params);
if (!validation.valid) {
  throw new Error(`参数验证失败: ${validation.errors.join(', ')}`);
}
```

### 3. 迭代限制
防止无限循环：
```typescript
if (iterations >= maxIterations) {
  throw new Error('超过最大迭代次数');
}
```

### 4. 超时保护
```typescript
const timeout = this.agentConfig?.timeout || 300000; // 5分钟
if (Date.now() - context.state.startTime > timeout) {
  throw new Error('执行超时');
}
```

---

## 🧪 使用示例

> ⚠️ **当前状态**：AI Agent 模式设计完成，**待实现**
>
> SDK v1.0 已完成核心引擎抽离（types, selector, primitives, executor）。
> AI Agent 计划在 v1.5 版本实现。

### 计划中的 API（未来版本）

```javascript
// v1.5 计划实现
import { AIAgent } from '@homura/sdk/agent';
import blueprint from './blueprint.json';

// 初始化 Agent
const agent = new AIAgent(blueprint);

// 执行
const result = await agent.execute({
  autoApproveColleges: ['艺术学院']
});
```

### 当前可用：直接执行 AtomicTool

```javascript
// v1.0 当前可用
import { executeTool } from '@homura/sdk/executor';

// 直接执行工具
const tool = {
  tool_id: 'click_approve',
  name: '点击审批按钮',
  parameters: { student_name: { type: 'string', required: true } },
  selector_logic: {
    scope: { type: 'container_list', selector: 'tr' },
    anchor: { type: 'text_match', selector: '.name', value: '{{student_name}}' },
    target: { selector: '.btn-approve', action: 'CLICK' }
  }
};

const result = await executeTool(tool, { student_name: '张三' });
```

### 监听执行进度

```javascript
const agent = new AIAgent(blueprint, {
  onStep: (step) => {
    console.log(`执行步骤: ${step.skillId}`, step.reasoning);
    showProgressToUI(step);
  },
  
  onError: (error) => {
    console.error('执行出错', error);
    showErrorToUI(error);
  }
});
```

---

## 📚 相关文档

- [Blueprint Schema](./blueprint-schema.md) - Blueprint 数据结构定义
- [SDK 架构](./sdk-architecture.md) - SDK 模块划分
- [插件维护机制](./plugin-maintenance.md) - 维护和自愈策略

---

*本文档记录 AI Agent 的执行模式，是 Homura 的核心创新*
