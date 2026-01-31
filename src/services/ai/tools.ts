/**
 * =============================================================================
 * Homura - AI Tool Definitions
 * =============================================================================
 * 
 * Tool schemas for AI function calling (OpenAI-compatible format)
 */

// =============================================================================
// PATH SELECTOR GENERATION TOOL
// =============================================================================

/**
 * Tool for generating path-based CSS selectors
 * 
 * This tool allows the AI to return structured selector data that can be
 * directly used by the execution engine.
 */
export const PATH_SELECTOR_TOOL = {
  type: 'function' as const,
  function: {
    name: 'generate_path_selector',
    description: '基于元素祖先路径生成稳定的 CSS 选择器。分析祖先的语义强度，选择最佳的语义根节点，构建从根到目标的选择器路径。',
    parameters: {
      type: 'object',
      properties: {
        root: {
          type: 'string',
          description: '语义根选择器。选择 semanticScore >= 0.7 的祖先，如 ".official-header" 或 "#sidebar"',
        },
        path: {
          type: 'array',
          items: { type: 'string' },
          description: '中间路径选择器数组。只包含增加精确性的层，如 [".section", ".form-group"]',
        },
        target: {
          type: 'string',
          description: '目标元素选择器，如 "input.input-inner" 或 "[data-testid=\\"search-btn\\"]"',
        },
        fullSelector: {
          type: 'string',
          description: '完整的 CSS 选择器，将 root + path + target 用空格连接',
        },
        confidence: {
          type: 'number',
          description: '置信度 (0-1)。基于语义强度和选择器唯一性评估',
        },
        reasoning: {
          type: 'string',
          description: '选择理由。说明为什么选择这个根节点，为什么跳过某些层',
        },
      },
      required: ['root', 'target', 'fullSelector', 'confidence'],
    },
  },
};

// =============================================================================
// SCOPE ANCHOR TARGET TOOL
// =============================================================================

/**
 * Tool for generating Scope + Anchor + Target selector logic
 * 
 * Used for more complex scenarios with repeating elements (tables, lists)
 */
export const SCOPE_ANCHOR_TARGET_TOOL = {
  type: 'function' as const,
  function: {
    name: 'generate_selector_logic',
    description: '生成 Scope + Anchor + Target 三层选择器逻辑。适用于表格行、列表项等重复元素的精确定位。',
    parameters: {
      type: 'object',
      properties: {
        scope: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['container_list', 'single'],
              description: '作用域类型',
            },
            selector: {
              type: 'string',
              description: '容器选择器，如 "#audit-table tr" 或 ".card-list .card"',
            },
          },
          required: ['type', 'selector'],
          description: '作用域配置 - 定义所有可能的容器',
        },
        anchor: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['text_match', 'attribute_match'],
              description: '锚点类型',
            },
            selector: {
              type: 'string',
              description: '锚点元素选择器，如 ".student-name"',
            },
            value: {
              type: 'string',
              description: '匹配值，可使用 {{变量名}} 语法，如 "{{student_name}}"',
            },
            matchMode: {
              type: 'string',
              enum: ['exact', 'contains', 'startsWith', 'endsWith'],
              description: '匹配模式',
            },
          },
          required: ['type', 'selector', 'value', 'matchMode'],
          description: '锚点配置 - 用于在容器中定位特定项',
        },
        target: {
          type: 'object',
          properties: {
            selector: {
              type: 'string',
              description: '目标元素选择器（相对于容器）',
            },
            action: {
              type: 'string',
              enum: ['CLICK', 'INPUT', 'EXTRACT_TEXT', 'WAIT_FOR'],
              description: '要执行的操作',
            },
          },
          required: ['selector', 'action'],
          description: '目标配置 - 实际操作的元素',
        },
        confidence: {
          type: 'number',
          description: '置信度 (0-1)',
        },
        reasoning: {
          type: 'string',
          description: '生成理由',
        },
      },
      required: ['target', 'confidence'],
    },
  },
};

// =============================================================================
// ALL TOOLS
// =============================================================================

/**
 * All available tools for AI function calling
 */
export const AI_TOOLS = [
  PATH_SELECTOR_TOOL,
  SCOPE_ANCHOR_TARGET_TOOL,
];

/**
 * Tool type definitions for TypeScript
 */
export type PathSelectorToolResult = {
  root: string;
  path?: string[];
  target: string;
  fullSelector: string;
  confidence: number;
  reasoning?: string;
};

export type ScopeAnchorTargetToolResult = {
  scope?: {
    type: 'container_list' | 'single';
    selector: string;
  };
  anchor?: {
    type: 'text_match' | 'attribute_match';
    selector: string;
    value: string;
    matchMode: 'exact' | 'contains' | 'startsWith' | 'endsWith';
  };
  target: {
    selector: string;
    action: 'CLICK' | 'INPUT' | 'EXTRACT_TEXT' | 'WAIT_FOR';
  };
  confidence: number;
  reasoning?: string;
};
