在你的架构中，AI 不应该直接写代码（如 JS），也不应该凭空创造 JSON。AI 的角色应该更像是一个“装配工”，它拿着你预先定义好的“标准零件（Primitives）”，按照“说明书（Schema）”组装成一个“工具（Atomic Tool）”。
以下是基于 Chrome Extension 环境的原子化工具生成与编辑架构设计：

1. 核心思想：乐高积木模式 (The LEGO Pattern)
我们要建立两层抽象：
● 底层基元 (Primitives)：硬编码在插件源码中，绝对稳定，不可由 AI 修改（相当于乐高积木块）。
● 原子工具 (Atomic Tools)：由 AI 生成的 JSON 配置，描述如何组合基元（相当于用积木搭成的房子）。

2. 第一层：定义底层基元 (Primitives Registry)
这部分是由开发者（你）写死在 Content Script 或 Service Worker 中的。它们是 AI 的动作词汇表。
代码实现 (TypeScript 示例)
 code TypeScript
downloadcontent_copy
expand_less
// primitive_registry.ts

// 1. 定义基元动作类型
export type PrimitiveActionType = 
  | 'CLICK' 
  | 'INPUT' 
  | 'EXTRACT_TEXT' 
  | 'WAIT_FOR' 
  | 'NAVIGATE';

// 2. 定义基元接口
interface PrimitiveAction {
  type: PrimitiveActionType;
  params: Record<string, any>; // 参数定义
}

// 3. 硬编码的执行逻辑 (AI 不可改)
export const ActionExecutor = {
  async CLICK(selector: string) {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element not found: ${selector}`);
    (el as HTMLElement).click();
  },

  async INPUT(selector: string, value: string) {
    const el = document.querySelector(selector);
    // ...复杂的模拟输入逻辑，处理 React/Vue 的绑定...
    (el as HTMLInputElement).value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  },
  
  // ...更多基元
};

3. 第二层：设计原子工具 Schema (The Contract)
这是 AI 生成的目标格式。它必须包含输入参数定义和步骤序列。
JSON Schema 设计
 code JSON
downloadcontent_copy
expand_less
{
  "tool_id": "search_classroom",
  "name": "搜索教室",
  "description": "在教务系统搜索指定校区的空闲教室",
  
  // 1. 变量定义 (AI 需要识别出哪些是变量)
  "parameters": {
    "schema": {
      "type": "object",
      "properties": {
        "campus_name": { "type": "string", "description": "校区名称，如'仙林'或'鼓楼'" },
        "building_name": { "type": "string", "description": "教学楼名称" }
      },
      "required": ["campus_name"]
    }
  },

  // 2. 执行步骤 (组合 Primitives)
  "steps": [
    {
      "step_id": 1,
      "action": "CLICK",
      "params": { 
        "selector": "#campus-dropdown" 
      }
    },
    {
      "step_id": 2,
      "action": "INPUT", // 选择下拉框
      "params": { 
        "selector": "#campus-dropdown input",
        "value": "{{campus_name}}" // <--- 引用变量
      }
    },
    {
      "step_id": 3,
      "action": "CLICK",
      "params": { 
        "selector": "button.btn-search" 
      }
    },
    {
      "step_id": 4,
      "action": "WAIT_FOR",
      "params": {
        "selector": "table.result-list",
        "timeout": 5000
      }
    }
  ]
}

4. AI 介入流程：生成与编辑
如何让 AI 生成上面那个复杂的 JSON？你需要使用 LLM 的 Function Calling 或 Structured Output。
场景 A：从用户演示中生成 (Recording -> Tool)
● 用户操作：用户开启录制，点选下拉框，输入“仙林”，点击搜索。
● 插件记录：生成一份原始日志（Raw Trace）。
 code JSON
downloadcontent_copy
expand_less
[
  { "event": "click", "target": "#campus-dropdown" },
  { "event": "type", "target": "#campus-input", "value": "仙林" },
  { "event": "click", "target": "#btn-search" }
]
● AI 转换 (The Builder Agent)：
  ○ Prompt:
"你是一个 RPA 工具构建者。以下是用户的操作日志。请将其转换为标准的 Atomic Tool JSON。
这里的基元库包括：CLICK, INPUT, WAIT。
注意：用户输入的 '仙林' 看起来像是一个参数。请将其提取为变量 {{campus_name}}。"
● AI 输出：生成符合 Schema 的 JSON。
场景 B：用自然语言修改 (Editing)
● 用户指令："搜索完之后，还要帮我把结果里的所有教室名称提取出来。"
● AI 操作：
  ○ 读取现有的 JSON。
  ○ 识别意图：需要增加一个 EXTRACT_TEXT 步骤。
  ○ 输出 Diff：
 code JSON
downloadcontent_copy
expand_less
// AI 仅返回需要追加的步骤
{
  "op": "add_step",
  "step": {
    "action": "EXTRACT_TEXT",
    "params": {
      "selector": "td.classroom-name",
      "variable_name": "result_list"
    }
  }
}

5. 约束机制：如何防止 AI 乱来？
为了确保稳定性，必须在 AI 和 JSON 之间加一道**“编译器验证层”**。
● 类型检查 (Type Checking)：
当 AI 生成 JSON 后，后端（或 Service Worker）立即用 Zod 或 Ajv 校验。
  ○ 检查：action 是不是 CLICK/INPUT 之一？
  ○ 检查：selector 字段存在吗？
  ○ 检查：引用的 {{variable}} 在 parameters 里定义了吗？
  ○ 失败处理：如果校验失败，将错误信息回传给 AI 让它重写（Self-Correction）。
● 沙箱执行 (Sandbox)：
工具的执行不使用 eval()。而是写一个解释器：
 code TypeScript
downloadcontent_copy
expand_less
async function runTool(tool: AtomicTool, args: any) {
  for (const step of tool.steps) {
    // 1. 变量替换
    const actualParams = resolveVariables(step.params, args);
    
    // 2. 匹配基元 (Switch-Case)
    switch (step.action) {
      case 'CLICK': 
        await ActionExecutor.CLICK(actualParams.selector);
        break;
      case 'INPUT':
        await ActionExecutor.INPUT(actualParams.selector, actualParams.value);
        break;
      // ... 绝不执行未知的 step.action
    }
  }
}
6. 总结：你的 AI 应该怎么设计？
回答你的问题：“AI 生成原子化工具时就只要组合这些工具并填写参数即可？”
是的，完全正确。
你的架构应该是：
● UI/源码层 (硬约束)：
  ○ 你定义好 Click, Type, Scroll, Extract 等 10-20 个基础动作。
  ○ 这些动作的代码是死的，AI 只能看不能改。
● 中间层 (DSL/JSON)：
  ○ 这是 AI 的工作区。AI 的任务就是编排这些动作的顺序，并参数化具体的值。
● Prompt 设计 (软约束)：
  ○ 你的 System Prompt 应该是：“你只能使用以下 [Action List] 中的动作。请不要发明新的动作。所有具体的文本输入都应该被定义为 Parameter。”
对比 Automa 和 Refly：
● 像 Automa：你的 Primitives 就是 Automa 左侧边栏拖出来的那些 Block。
● 像 Refly：你的 AI Agent 就是那个把 Block 连成线、并填入具体参数的“设计师”。
这种方式既保留了 AI 的灵活性（可以随意组合、理解参数），又保证了运行时的稳定性（底层代码是经过严格测试的）。