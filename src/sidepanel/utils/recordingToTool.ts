/**
 * ==============================================================================
 * Homura SidePanel - Recording to Tool Conversion
 * ==============================================================================
 *
 * Utility functions for converting recorded actions to atomic tools
 */

import type { RecordedAction } from '@shared/selectorBuilder/types';
import type { AtomicTool } from '@homura/sdk/types';

// =============================================================================
// STORAGE KEYS
// =============================================================================

/**
 * 存储键名常量
 */
const STORAGE_KEYS = {
  RECORDED_TOOLS: 'homura_recorded_tools',
} as const;

/**
 * 存储的工具集数据结构
 */
interface RecordedToolsData {
  tools: AtomicTool[];
  timestamp: string; // ISO 格式时间戳
  version: string; // 数据格式版本
}

// =============================================================================
// TOOL CONVERSION
// =============================================================================

/**
 * 将录制的动作转换为工具
 * @param action - 录制的动作
 * @returns AtomicTool
 *
 * 流程：
 * 1. 生成 tool_id (基于动作内容 hash)
 * 2. 生成工具名称（智能命名）
 * 3. 构建 selector_logic
 */
export function recordedActionToTool(action: RecordedAction): AtomicTool {
  const toolId = generateToolId(action);
  const name = generateToolName(action);

  // navigate 操作特殊处理：不需要 selector，只需要 URL
  if (action.type === 'navigate') {
    return {
      tool_id: toolId,
      name,
      description: `录制于 ${new Date(action.timestamp).toLocaleString('zh-CN')}`,
      parameters: {},
      selector_logic: {
        target: {
          selector: '',
          action: 'NAVIGATE',
          params: { url: action.url || '' },
        },
        strategy: 'direct',
      } as AtomicTool['selector_logic'],
      source: 'recorded',
      createdAt: new Date().toISOString(),
    };
  }

  // 构建 selector_logic (非 navigate 操作)
  const selectorLogic = {
    target: {
      selector:
        action.unifiedSelector?.fullSelector ||
        action.elementAnalysis?.minimalSelector ||
        '',
      action: convertActionType(action.type),
      params: action.value ? { value: action.value } : undefined,
    },
    strategy:
      action.unifiedSelector?.strategy === 'path'
        ? 'path_selector'
        : 'scope_anchor_target',
  };

  return {
    tool_id: toolId,
    name,
    description: `录制于 ${new Date(action.timestamp).toLocaleString('zh-CN')}`,
    parameters: {}, // Empty parameters for recorded tools
    selector_logic: selectorLogic as AtomicTool['selector_logic'],
    source: 'recorded', // 标记为录制工具
    createdAt: new Date().toISOString(),
  };
}

/**
 * 发送录制的工具到 Dashboard
 * @param tools - 工具数组
 * @returns Promise<void>
 */
export async function sendRecordedToolsToDashboard(
  tools: AtomicTool[],
): Promise<void> {
  const data: RecordedToolsData = {
    tools,
    timestamp: new Date().toISOString(),
    version: '2.0',
  };

  console.log('[recordingToTool] Sending tools to Dashboard:', tools);
  await chrome.storage.local.set({
    [STORAGE_KEYS.RECORDED_TOOLS]: data,
  });
  console.log(
    '[recordingToTool] Tools saved to storage:',
    STORAGE_KEYS.RECORDED_TOOLS,
  );
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * 根据动作内容生成工具名称
 */
function generateToolName(action: RecordedAction): string {
  // 使用用户定义的名称（如果有）
  if (action.name) {
    return action.name;
  }

  const analysis = action.elementAnalysis;

  // 格式: [动作] [元素描述]
  const actionNames: Record<string, string> = {
    click: '点击',
    input: '输入',
    select: '选择',
    scroll: '滚动',
    navigate: '导航',
  };

  const actionName = actionNames[action.type] || action.type;

  // 元素描述
  let elementDesc = '';

  if (action.type === 'navigate') {
    // 导航动作：使用 URL
    elementDesc = truncateUrl(action.url || '', 20);
  } else if (analysis) {
    // 从锚点候选中获取文本描述
    const firstAnchor = analysis.anchorCandidates?.[0];
    if (firstAnchor?.text) {
      elementDesc = `"${firstAnchor.text.slice(0, 15)}"`;
    } else if (firstAnchor?.attribute?.value) {
      elementDesc = `"${firstAnchor.attribute.value.slice(0, 15)}"`;
    } else if (analysis.containerType) {
      elementDesc = analysis.containerType;
    } else {
      elementDesc =
        analysis.targetSelector || analysis.minimalSelector || '元素';
    }
  }

  return `${actionName} ${elementDesc}`;
}

/**
 * 生成唯一 tool_id
 */
function generateToolId(action: RecordedAction): string {
  const content = JSON.stringify({
    selector:
      action.unifiedSelector?.fullSelector ||
      action.elementAnalysis?.minimalSelector ||
      '',
    action: action.type,
    value: action.value,
    url: action.url,
  });

  // 简单 hash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  return `tool_recorded_${Math.abs(hash)}`;
}

/**
 * 转换动作类型到 SDK action 类型
 */
function convertActionType(
  type: RecordedAction['type'],
): AtomicTool['selector_logic']['target']['action'] {
  const actionMap: Record<
    RecordedAction['type'],
    AtomicTool['selector_logic']['target']['action']
  > = {
    click: 'CLICK',
    input: 'INPUT',
    select: 'INPUT', // SELECT 映射到 INPUT（选择框输入）
    scroll: 'CLICK', // SCROLL 映射到 CLICK（滚动可以点击触发）
    navigate: 'NAVIGATE',
  };

  return actionMap[type] || 'CLICK';
}

/**
 * 截断 URL
 */
function truncateUrl(url: string, maxLength: number = 40): string {
  if (!url || url.length <= maxLength) return url;
  return url.slice(0, maxLength) + '...';
}

// =============================================================================
// EXPORT STORAGE KEYS
// =============================================================================

export { STORAGE_KEYS, type RecordedToolsData };
