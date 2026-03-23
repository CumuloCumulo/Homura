/**
 * =============================================================================
 * Homura Dashboard - Recording to Tool Converter
 * =============================================================================
 *
 * Converts RecordedAction[] to AtomicTool[] for importing into tool library
 */

import type {
  AtomicTool,
  SelectorLogic,
  PrimitiveAction,
  ToolParameter,
} from '@homura/sdk/types';
import type { SerializableRecordedAction } from '@shared/storage/recordingStorage';

// =============================================================================
// TYPES
// =============================================================================

/**
 * 转换选项
 */
export interface ConversionOptions {
  /** 工具 ID 前缀 */
  idPrefix?: string;
  /** 是否合并相似操作 */
  mergeSimilar?: boolean;
  /** 是否自动生成描述 */
  generateDescription?: boolean;
  /** 参数命名策略 */
  parameterNaming?: 'smart' | 'generic';
}

/**
 * 转换警告
 */
export interface ConversionWarning {
  actionIndex: number;
  actionId: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

/**
 * 转换统计
 */
export interface ConversionStats {
  totalActions: number;
  convertedTools: number;
  skippedActions: number;
  parametersDetected: number;
}

/**
 * 转换结果
 */
export interface ConversionResult {
  /** 转换后的工具列表 */
  tools: AtomicTool[];
  /** 转换警告 */
  warnings: ConversionWarning[];
  /** 转换统计 */
  stats: ConversionStats;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** 默认工具名称前缀 */
const DEFAULT_ID_PREFIX = 'recorded_';

/** 操作类型到基元类型的映射 */
const ACTION_TYPE_TO_PRIMITIVE: Record<string, PrimitiveAction> = {
  click: 'CLICK',
  input: 'INPUT',
  select: 'CLICK', // select 下拉框实际是点击操作
  scroll: 'WAIT_FOR', // 滚动转换为等待
  navigate: 'NAVIGATE',
};

// =============================================================================
// MAIN CONVERSION FUNCTION
// =============================================================================

/**
 * 将录制操作转换为工具列表
 * @param actions - 录制操作列表
 * @param options - 转换选项
 * @returns 转换结果
 */
export function convertRecordingToTools(
  actions: SerializableRecordedAction[],
  options: ConversionOptions = {},
): ConversionResult {
  const warnings: ConversionWarning[] = [];
  const tools: AtomicTool[] = [];
  let skippedCount = 0;
  let parametersDetected = 0;

  actions.forEach((action, index) => {
    const tool = convertActionToTool(action, index, options);
    if (tool) {
      tools.push(tool);
      // 统计参数数量
      parametersDetected += Object.keys(tool.parameters).length;
    } else {
      skippedCount++;
      warnings.push({
        actionIndex: index,
        actionId: action.id,
        message: `无法转换操作类型: ${action.type}`,
        severity: 'warning',
      });
    }
  });

  return {
    tools,
    warnings,
    stats: {
      totalActions: actions.length,
      convertedTools: tools.length,
      skippedActions: skippedCount,
      parametersDetected,
    },
  };
}

// =============================================================================
// SINGLE ACTION CONVERSION
// =============================================================================

/**
 * 将单个录制操作转换为工具
 * @param action - 录制操作
 * @param index - 操作索引
 * @param options - 转换选项
 * @returns 转换后的工具，如果无法转换则返回 null
 */
export function convertActionToTool(
  action: SerializableRecordedAction,
  index: number,
  options: ConversionOptions = {},
): AtomicTool | null {
  // 导航操作特殊处理
  if (action.type === 'navigate') {
    return convertNavigateAction(action, index, options);
  }

  // 需要 unifiedSelector 的操作
  if (!action.unifiedSelector) {
    return null;
  }

  const primitiveAction = ACTION_TYPE_TO_PRIMITIVE[action.type];
  if (!primitiveAction) {
    return null;
  }

  const parameters = detectParameters(action, options);
  const selectorLogic = buildSelectorLogic(action, primitiveAction);

  const tool: AtomicTool = {
    tool_id: `${options.idPrefix || DEFAULT_ID_PREFIX}${action.id}`,
    name: generateToolName(action, index),
    description: options.generateDescription
      ? generateToolDescription(action)
      : undefined,
    parameters,
    selector_logic: selectorLogic,
  };

  return tool;
}

/**
 * 转换导航操作为工具
 */
function convertNavigateAction(
  action: SerializableRecordedAction,
  index: number,
  options: ConversionOptions,
): AtomicTool | null {
  if (!action.url) {
    return null;
  }

  const tool: AtomicTool = {
    tool_id: `${options.idPrefix || DEFAULT_ID_PREFIX}${action.id}`,
    name: action.name || generateToolName(action, index),
    description: `导航到 ${action.url}`,
    parameters: {},
    selector_logic: {
      target: {
        selector: action.url,
        action: 'NAVIGATE',
      },
    },
  };

  return tool;
}

// =============================================================================
// SELECTOR LOGIC BUILDING
// =============================================================================

/**
 * 根据 UnifiedSelector 构建 SelectorLogic
 */
function buildSelectorLogic(
  action: SerializableRecordedAction,
  primitiveAction: PrimitiveAction,
): SelectorLogic {
  const { unifiedSelector } = action;

  if (!unifiedSelector) {
    // 降级：直接选择器
    return {
      target: {
        selector: action.elementAnalysis?.minimalSelector || 'body',
        action: primitiveAction,
      },
    };
  }

  // 根据 UnifiedSelector 的策略构建 SelectorLogic
  if (unifiedSelector.strategy === 'path') {
    // 路径策略：使用完整选择器
    return {
      target: {
        selector: unifiedSelector.fullSelector,
        action: primitiveAction,
      },
    };
  }

  if (unifiedSelector.strategy === 'scope_anchor_target') {
    const { structureData } = unifiedSelector;
    if (!structureData) {
      return {
        target: {
          selector: unifiedSelector.fullSelector,
          action: primitiveAction,
        },
      };
    }

    // 构建 Scope + Anchor + Target
    const logic: SelectorLogic = {
      target: {
        selector: structureData.target.selector,
        action: primitiveAction,
      },
    };

    // 添加 Scope（如果存在）
    if (structureData.scope) {
      logic.scope = {
        type: structureData.scope.type,
        selector: structureData.scope.selector,
      };
    }

    // 添加 Anchor（如果存在）
    if (structureData.anchor) {
      logic.anchor = {
        type: structureData.anchor.type,
        selector: structureData.anchor.selector,
        value: structureData.anchor.value,
        matchMode: structureData.anchor.matchMode,
      };
    }

    return logic;
  }

  // 降级：直接选择器
  return {
    target: {
      selector: unifiedSelector.fullSelector,
      action: primitiveAction,
    },
  };
}

// =============================================================================
// PARAMETER DETECTION
// =============================================================================

/**
 * 智能检测工具参数
 * @param action - 录制操作
 * @param options - 转换选项
 * @returns 参数定义对象
 */
export function detectParameters(
  action: SerializableRecordedAction,
  options: ConversionOptions = {},
): Record<string, ToolParameter> {
  const parameters: Record<string, ToolParameter> = {};
  const { unifiedSelector } = action;

  // INPUT 操作：添加输入值参数
  if (action.type === 'input' && action.value) {
    const paramName =
      options.parameterNaming === 'smart'
        ? guessParameterName(action.value, 'input_value')
        : 'input_value';
    parameters[paramName] = {
      type: 'string',
      description: `输入值（示例：${action.value}）`,
      required: true,
    };
  }

  // SELECT 操作：添加选项值参数
  if (action.type === 'select' && action.value) {
    const paramName =
      options.parameterNaming === 'smart'
        ? guessParameterName(action.value, 'option_value')
        : 'option_value';
    parameters[paramName] = {
      type: 'string',
      description: `选择的选项（示例：${action.value}）`,
      required: true,
    };
  }

  // ANCHOR 匹配：检测锚点参数
  if (unifiedSelector?.strategy === 'scope_anchor_target') {
    const anchor = unifiedSelector.structureData?.anchor;
    if (anchor?.value) {
      const paramName =
        options.parameterNaming === 'smart'
          ? guessParameterName(anchor.value, 'anchor_text')
          : 'anchor_text';
      parameters[paramName] = {
        type: 'string',
        description: `锚点文本（示例：${anchor.value}）`,
        required: true,
      };
    }
  }

  return parameters;
}

/**
 * 猜测参数名称（基于值的语义）
 */
function guessParameterName(value: string, fallback: string): string {
  const lowerValue = value.toLowerCase();

  // 常见模式识别
  if (/^\w+@\w+\.\w+$/.test(value)) return 'email';
  if (/^\d{11}$/.test(value)) return 'phone';
  if (/^https?:\/\//.test(value)) return 'url';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';

  // 中文模式
  if (lowerValue.includes('姓名') || lowerValue.includes('名字')) return 'name';
  if (lowerValue.includes('学生')) return 'student_name';
  if (lowerValue.includes('教室')) return 'classroom';
  if (lowerValue.includes('课程')) return 'course';

  return fallback;
}

// =============================================================================
// NAME & DESCRIPTION GENERATION
// =============================================================================

/**
 * 生成工具名称
 */
export function generateToolName(
  action: SerializableRecordedAction,
  index: number,
): string {
  // 如果用户已命名，使用用户名称
  if (action.name) {
    return action.name;
  }

  // 根据操作类型生成默认名称
  const typeNames: Record<string, string> = {
    click: '点击',
    input: '输入',
    select: '选择',
    scroll: '滚动',
    navigate: '导航',
  };

  const baseName = typeNames[action.type] || '操作';

  // 尝试从元素分析中获取语义信息
  const elementInfo = extractElementSemantic(action);
  if (elementInfo) {
    return `${baseName}${elementInfo}`;
  }

  return `${baseName} ${index + 1}`;
}

/**
 * 提取元素语义信息用于命名
 */
function extractElementSemantic(
  action: SerializableRecordedAction,
): string | null {
  const { elementAnalysis } = action;
  if (!elementAnalysis) return null;

  // 从锚点候选中提取语义
  for (const anchor of elementAnalysis.anchorCandidates.slice(0, 3)) {
    if (anchor.text && anchor.text.length < 20) {
      return ` - ${anchor.text}`;
    }
  }

  // 从选择器中提取
  const selector = elementAnalysis.minimalSelector || '';
  const classMatch = selector.match(/\.([a-z][a-z0-9_-]+)/gi);
  if (classMatch) {
    const className = classMatch[0].substring(1);
    // 移除常见的前缀
    const cleanName = className.replace(/^(btn|button|input|field)-/, '');
    if (cleanName.length < 15) {
      return ` - ${cleanName}`;
    }
  }

  return null;
}

/**
 * 生成工具描述
 */
export function generateToolDescription(
  action: SerializableRecordedAction,
): string {
  const typeDescriptions: Record<string, string> = {
    click: '点击',
    input: '在',
    select: '选择',
    scroll: '滚动到',
    navigate: '导航到',
  };

  const baseDesc = typeDescriptions[action.type] || '操作';

  if (action.type === 'navigate') {
    return `${baseDesc} ${action.url || '目标页面'}`;
  }

  if (action.type === 'input' && action.value) {
    return `在输入框中输入: "${action.value}"`;
  }

  const elementInfo = extractElementSemantic(action);
  if (elementInfo) {
    return `${baseDesc}${elementInfo}`;
  }

  return `${baseDesc}页面元素`;
}
