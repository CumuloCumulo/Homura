/**
 * =============================================================================
 * Homura Dashboard - Toolkit Operations
 * =============================================================================
 *
 * Utility functions for toolkit manipulation.
 * All operations are immutable and return new toolkit objects.
 */

import type {
  Toolkit,
  AtomicTool,
  ToolkitValidationError,
  ToolkitValidationResult,
} from '@homura/sdk/types';

// =============================================================================
// TOOLKIT OPERATIONS
// =============================================================================

/**
 * 向工具集添加工具
 * @param toolkit - 工具集对象
 * @param tool - 要添加的工具
 * @param index - 插入位置（默认添加到末尾）
 * @returns 更新后的工具集
 */
export function addToolToToolkit(
  toolkit: Toolkit,
  tool: AtomicTool,
  index?: number,
): Toolkit {
  const newTools = [...toolkit.tools];

  if (index !== undefined && index >= 0 && index <= newTools.length) {
    newTools.splice(index, 0, tool);
  } else {
    newTools.push(tool);
  }

  return updateToolkitMetadata(toolkit, newTools);
}

/**
 * 从工具集移除工具
 * @param toolkit - 工具集对象
 * @param toolId - 要移除的工具 ID
 * @returns 更新后的工具集
 */
export function removeToolFromToolkit(
  toolkit: Toolkit,
  toolId: string,
): Toolkit {
  const newTools = toolkit.tools.filter((t) => t.tool_id !== toolId);
  return updateToolkitMetadata(toolkit, newTools);
}

/**
 * 在工具集中移动工具
 * @param toolkit - 工具集对象
 * @param fromIndex - 原始位置
 * @param toIndex - 目标位置
 * @returns 更新后的工具集
 */
export function moveToolInToolkit(
  toolkit: Toolkit,
  fromIndex: number,
  toIndex: number,
): Toolkit {
  if (
    fromIndex < 0 ||
    fromIndex >= toolkit.tools.length ||
    toIndex < 0 ||
    toIndex >= toolkit.tools.length ||
    fromIndex === toIndex
  ) {
    return toolkit;
  }

  const newTools = [...toolkit.tools];
  const [removed] = newTools.splice(fromIndex, 1);
  newTools.splice(toIndex, 0, removed);

  return updateToolkitMetadata(toolkit, newTools);
}

/**
 * 更新工具集中的工具
 * @param toolkit - 工具集对象
 * @param toolId - 工具 ID
 * @param updates - 更新内容
 * @returns 更新后的工具集
 */
export function updateToolInToolkit(
  toolkit: Toolkit,
  toolId: string,
  updates: Partial<AtomicTool>,
): Toolkit {
  const newTools = toolkit.tools.map((t) =>
    t.tool_id === toolId ? { ...t, ...updates } : t,
  );

  return updateToolkitMetadata(toolkit, newTools);
}

/**
 * 批量更新工具集中的工具
 * @param toolkit - 工具集对象
 * @param updates - 工具 ID 到更新内容的映射
 * @returns 更新后的工具集
 */
export function updateToolsInToolkit(
  toolkit: Toolkit,
  updates: Map<string, Partial<AtomicTool>>,
): Toolkit {
  const newTools = toolkit.tools.map((t) => {
    const update = updates.get(t.tool_id);
    return update ? { ...t, ...update } : t;
  });

  return updateToolkitMetadata(toolkit, newTools);
}

/**
 * 克隆工具集
 * @param toolkit - 工具集对象
 * @param newName - 新名称
 * @returns 克隆的工具集
 */
export function cloneToolkitData(toolkit: Toolkit, newName?: string): Toolkit {
  const now = new Date().toISOString();

  // 生成新 ID
  const newId = `tk_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // 深拷贝工具列表
  const newTools = toolkit.tools.map((tool) => ({
    ...tool,
    tool_id: `${tool.tool_id}_clone`,
  }));

  return {
    ...toolkit,
    id: newId,
    name: newName || `${toolkit.name} (副本)`,
    tools: newTools,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 合并多个工具集
 * @param toolkits - 工具集列表
 * @param name - 合并后的名称
 * @param description - 合并后的描述
 * @returns 合并后的工具集
 */
export function mergeToolkits(
  toolkits: Toolkit[],
  name: string,
  description?: string,
): Toolkit {
  const now = new Date().toISOString();
  const newId = `tk_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // 合并所有工具（去重可能需要后续实现）
  const allTools = toolkits.flatMap((tk) => tk.tools);

  return {
    id: newId,
    name,
    description,
    tools: allTools,
    targetUrl: toolkits[0]?.targetUrl,
    createdAt: now,
    updatedAt: now,
    version: '1.0.0',
    tags: toolkits.flatMap((tk) => tk.tags || []),
    author: toolkits[0]?.author,
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * 验证工具集
 * @param toolkit - 工具集对象
 * @returns 验证结果
 */
export function validateToolkit(toolkit: Toolkit): ToolkitValidationResult {
  const errors: ToolkitValidationError[] = [];
  const warnings: string[] = [];

  // 检查必需字段
  if (!toolkit.id || toolkit.id.trim() === '') {
    errors.push({
      toolId: toolkit.id,
      field: 'id',
      message: '工具集 ID 不能为空',
    });
  }

  if (!toolkit.name || toolkit.name.trim() === '') {
    errors.push({
      toolId: toolkit.id,
      field: 'name',
      message: '工具集名称不能为空',
    });
  }

  if (!Array.isArray(toolkit.tools)) {
    errors.push({
      toolId: toolkit.id,
      field: 'tools',
      message: 'tools 必须是数组',
    });
  } else if (toolkit.tools.length === 0) {
    warnings.push('工具集没有包含任何工具');
  }

  // 检查每个工具
  toolkit.tools.forEach((tool, index) => {
    if (!tool.tool_id) {
      errors.push({
        toolId: tool.tool_id || `tool_${index}`,
        field: 'tool_id',
        message: `工具 ${index} 缺少 tool_id`,
      });
    }

    if (!tool.name) {
      warnings.push(`工具 ${index} 缺少名称`);
    }

    if (!tool.selector_logic?.target) {
      errors.push({
        toolId: tool.tool_id || `tool_${index}`,
        field: 'selector_logic',
        message: `工具 ${index} 缺少 selector_logic.target`,
      });
    }
  });

  // 检查版本格式
  if (!toolkit.version || !/^\d+\.\d+\.\d+$/.test(toolkit.version)) {
    warnings.push('版本号格式不正确，建议使用语义化版本 (如 1.0.0)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 验证单个工具
 * @param tool - 工具对象
 * @returns 验证结果
 */
export function validateTool(tool: AtomicTool): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!tool.tool_id) {
    errors.push('缺少 tool_id');
  }

  if (!tool.name) {
    errors.push('缺少 name');
  }

  if (!tool.selector_logic?.target?.selector) {
    errors.push('缺少 selector_logic.target.selector');
  }

  if (!tool.selector_logic?.target?.action) {
    errors.push('缺少 selector_logic.target.action');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * 更新工具集元数据
 * @param toolkit - 原工具集
 * @param newTools - 新的工具列表
 * @returns 更新后的工具集
 */
function updateToolkitMetadata(
  toolkit: Toolkit,
  newTools: AtomicTool[],
): Toolkit {
  return {
    ...toolkit,
    tools: newTools,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 获取工具集元数据（轻量级版本）
 * @param toolkit - 工具集对象
 * @returns 工具集元数据
 */
export function getToolkitMeta(toolkit: Toolkit): {
  id: string;
  name: string;
  description?: string;
  toolCount: number;
  targetUrl?: string;
  updatedAt: string;
  version: string;
  tags?: string[];
} {
  return {
    id: toolkit.id,
    name: toolkit.name,
    description: toolkit.description,
    toolCount: toolkit.tools.length,
    targetUrl: toolkit.targetUrl,
    updatedAt: toolkit.updatedAt,
    version: toolkit.version,
    tags: toolkit.tags,
  };
}

/**
 * 根据标签过滤工具集
 * @param toolkits - 工具集列表
 * @param tag - 标签
 * @returns 过滤后的工具集列表
 */
export function filterToolkitsByTag(
  toolkits: Toolkit[],
  tag: string,
): Toolkit[] {
  return toolkits.filter((tk) => tk.tags?.includes(tag));
}

/**
 * 搜索工具集
 * @param toolkits - 工具集列表
 * @param query - 搜索关键词
 * @returns 匹配的工具集列表
 */
export function searchToolkits(toolkits: Toolkit[], query: string): Toolkit[] {
  const lowerQuery = query.toLowerCase();

  return toolkits.filter(
    (tk) =>
      tk.name.toLowerCase().includes(lowerQuery) ||
      tk.description?.toLowerCase().includes(lowerQuery) ||
      tk.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)),
  );
}

/**
 * 获取所有使用的标签
 * @param toolkits - 工具集列表
 * @returns 标签列表
 */
export function getAllTags(toolkits: Toolkit[]): string[] {
  const tagSet = new Set<string>();

  for (const tk of toolkits) {
    if (tk.tags) {
      for (const tag of tk.tags) {
        tagSet.add(tag);
      }
    }
  }

  return Array.from(tagSet).sort();
}

// =============================================================================
// DASHBOARD ↔ SIDEPANEL BRIDGE
// =============================================================================

/**
 * 存储键名常量
 */
const STORAGE_KEYS = {
  CURRENT_TOOLKIT: 'homura_current_toolkit',
} as const;

/**
 * 存储的工具集数据结构
 */
interface StoredToolkitData {
  toolkitId: string;
  toolkitName: string;
  tools: AtomicTool[];
  timestamp: string;
  version: string;
}

/**
 * 发送工具集到 SidePanel（通过共享存储）
 *
 * 方案3：混合方案（存储 + 事件通知）
 * 1. 将 toolkit 数据写入 chrome.storage.local
 * 2. SidePanel 通过 onChanged 事件自动接收
 * 3. 如果 SidePanel 未打开，数据持久保存，打开时自动加载
 *
 * @param toolkit - 工具集对象
 * @returns Promise<void>
 * @throws Error 当发送失败时
 */
export async function sendToolkitToSidePanel(toolkit: Toolkit): Promise<void> {
  // 检查工具集是否有工具
  if (!toolkit.tools || toolkit.tools.length === 0) {
    throw new Error('工具集没有包含任何工具');
  }

  // 构建存储数据
  const data: StoredToolkitData = {
    toolkitId: toolkit.id,
    toolkitName: toolkit.name,
    tools: toolkit.tools,
    timestamp: new Date().toISOString(),
    version: '1.0',
  };

  try {
    // 写入 chrome.storage.local
    // 这会触发 onChanged 事件，SidePanel 监听该事件自动接收
    await chrome.storage.local.set({
      [STORAGE_KEYS.CURRENT_TOOLKIT]: data,
    });
  } catch (error) {
    throw new Error(
      `发送工具集失败: ${error instanceof Error ? error.message : '未知错误'}`,
    );
  }
}

/**
 * 请求打开 SidePanel
 * @returns Promise<void>
 */
export async function openSidePanel(): Promise<void> {
  try {
    // 尝试通过 runtime 发送消息来打开 SidePanel
    await chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
  } catch (error) {
    console.error('打开 SidePanel 失败:', error);
  }
}
