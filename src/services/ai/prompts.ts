/**
 * =============================================================================
 * Homura - AI Prompt Templates
 * =============================================================================
 * 
 * System prompts and prompt builders for AI interactions
 */

import type { SelectorGenerationContext, RecordingTrace, SelfHealingContext } from './types';

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

export const SELECTOR_SYSTEM_PROMPT = `你是一个浏览器自动化选择器专家。你的任务是根据 DOM 结构生成稳健的选择器策略。

## 选择器模式：Scope + Anchor + Target

你必须使用三层选择器模式：
1. **Scope (作用域)**: 定义容器范围，如表格行、列表项
2. **Anchor (锚点)**: 在容器内定位特定项目，通常基于文本或属性匹配
3. **Target (目标)**: 实际要操作的元素

## 输出格式

返回 JSON 格式的选择器逻辑：
\`\`\`json
{
  "scope": {
    "type": "container_list",
    "selector": "CSS选择器"
  },
  "anchor": {
    "type": "text_match",
    "selector": "CSS选择器",
    "value": "{{参数名}}",
    "matchMode": "contains"
  },
  "target": {
    "selector": "CSS选择器",
    "action": "CLICK"
  }
}
\`\`\`

## 规则

1. 优先使用语义化选择器：data-testid, role, aria-label
2. 避免使用位置索引（:nth-child）除非必要
3. 选择器应该在页面结构变化时仍然健壮
4. 识别可变值并使用 {{变量名}} 语法
5. 只返回 JSON，不要额外解释`;

export const TOOL_BUILDER_SYSTEM_PROMPT = `你是一个 RPA 工具构建专家。你的任务是将用户的录制操作转换为标准的原子工具定义。

## 原子工具结构

\`\`\`json
{
  "tool_id": "唯一标识",
  "name": "工具名称",
  "description": "工具描述",
  "parameters": {
    "参数名": {
      "type": "string",
      "description": "参数描述",
      "required": true
    }
  },
  "selector_logic": {
    "scope": { ... },
    "anchor": { ... },
    "target": { ... }
  }
}
\`\`\`

## 规则

1. 识别用户输入的动态值（如名字、ID），将其参数化为 {{变量名}}
2. 使用 Scope + Anchor + Target 模式构建选择器
3. 工具名称应该描述业务意图，而非技术操作
4. 参数描述应该清晰，方便 AI 理解如何填写
5. 返回完整的 JSON，不要额外解释`;

export const SELF_HEALING_SYSTEM_PROMPT = `你是一个浏览器自动化修复专家。当选择器失效时，你需要分析新的 DOM 结构并生成替代选择器。

## 任务

给定：
1. 失败的选择器
2. 当前的 DOM 快照
3. 元素的描述或预期功能

生成新的选择器来定位相同功能的元素。

## 输出格式

\`\`\`json
{
  "newSelector": "新的CSS选择器",
  "confidence": 0.8,
  "explanation": "修复说明"
}
\`\`\`

## 规则

1. 根据功能/视觉特征（文字、颜色、位置）定位元素
2. 优先使用稳定的属性（id, data-*, role）
3. 提供置信度评估
4. 解释你的推理过程`;

// =============================================================================
// PROMPT BUILDERS
// =============================================================================

/**
 * Build selector generation prompt
 */
export function buildSelectorPrompt(context: SelectorGenerationContext): string {
  let prompt = `## 任务
分析以下 DOM 结构，生成 Scope + Anchor + Target 选择器。

## 用户意图
${context.intent}

## 目标元素
\`\`\`html
${context.targetHtml}
\`\`\`

## 容器上下文
\`\`\`html
${context.containerHtml}
\`\`\`
`;

  if (context.anchorValue) {
    prompt += `
## 锚点值
用于定位的动态值：${context.anchorValue}
`;
  }

  if (context.failedSelector) {
    prompt += `
## 失败的选择器
之前尝试的选择器失败了：${context.failedSelector}
请生成一个更健壮的替代方案。
`;
  }

  prompt += `
请返回 JSON 格式的选择器逻辑。`;

  return prompt;
}

/**
 * Build tool generation prompt
 */
export function buildToolPrompt(recording: RecordingTrace): string {
  const actionsDescription = recording.actions.map((action, index) => {
    let desc = `${index + 1}. ${action.type.toUpperCase()}`;
    if (action.value) {
      desc += ` - 输入值: "${action.value}"`;
    }
    desc += `\n   元素: ${action.targetHtml}`;
    return desc;
  }).join('\n\n');

  return `## 任务
将以下用户录制的操作序列转换为原子工具定义。

## 页面信息
- URL: ${recording.pageUrl}
- 标题: ${recording.pageTitle}

## 录制的操作
${actionsDescription}

## DOM 上下文
\`\`\`html
${recording.domSnapshot}
\`\`\`

请分析操作意图，识别参数，并生成标准的原子工具 JSON。`;
}

/**
 * Build self-healing prompt
 */
export function buildSelfHealingPrompt(context: SelfHealingContext): string {
  return `## 任务
修复失败的选择器。

## 失败的选择器
\`\`\`
${context.failedSelector}
\`\`\`

## 错误信息
${context.errorMessage}

## 元素描述
${context.elementDescription || '未提供'}

## 当前 DOM
\`\`\`html
${context.currentDom}
\`\`\`

请分析 DOM 并生成新的选择器来定位相同功能的元素。`;
}
