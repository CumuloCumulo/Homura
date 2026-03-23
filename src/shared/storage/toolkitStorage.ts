/**
 * =============================================================================
 * Homura - Toolkit Storage Management
 * =============================================================================
 *
 * Chrome Storage wrapper for toolkit data persistence.
 * Toolkits are stored in chrome.storage.local and synchronized
 * between Dashboard components.
 */

import type { Toolkit, AtomicTool } from '@homura/sdk/types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Storage key for toolkits */
const STORAGE_KEY = 'homura_toolkits';

/** Default toolkit version */
const DEFAULT_VERSION = '1.0.0';

// =============================================================================
// STORAGE FUNCTIONS
// =============================================================================

/**
 * 保存工具集到 Chrome Storage
 * @param toolkit - 工具集对象
 * @returns 工具集 ID
 */
export async function saveToolkitToStorage(toolkit: Toolkit): Promise<string> {
  const existing = await getAllToolkits();
  const index = existing.findIndex((t) => t.id === toolkit.id);

  if (index >= 0) {
    // Update existing toolkit
    existing[index] = toolkit;
  } else {
    // Add new toolkit
    existing.push(toolkit);
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: existing });
  return toolkit.id;
}

/**
 * 批量保存工具集
 * @param toolkits - 工具集列表
 */
export async function saveToolkitsToStorage(
  toolkits: Toolkit[],
): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: toolkits });
}

/**
 * 获取所有工具集
 * @returns 工具集列表
 */
export async function getToolkitsFromStorage(): Promise<Toolkit[]> {
  return getAllToolkits();
}

/**
 * 根据 ID 获取工具集
 * @param id - 工具集 ID
 * @returns 工具集对象，如果不存在则返回 null
 */
export async function getToolkitById(id: string): Promise<Toolkit | null> {
  const toolkits = await getAllToolkits();
  return toolkits.find((t) => t.id === id) || null;
}

/**
 * 删除工具集
 * @param id - 工具集 ID
 */
export async function deleteToolkitFromStorage(id: string): Promise<void> {
  const existing = await getAllToolkits();
  const updated = existing.filter((t) => t.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
}

/**
 * 批量删除工具集
 * @param ids - 工具集 ID 列表
 */
export async function deleteToolkitsFromStorage(ids: string[]): Promise<void> {
  const existing = await getAllToolkits();
  const idSet = new Set(ids);
  const updated = existing.filter((t) => !idSet.has(t.id));
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
}

/**
 * 检查工具集 ID 是否存在
 * @param id - 工具集 ID
 */
export async function toolkitExists(id: string): Promise<boolean> {
  const toolkits = await getAllToolkits();
  return toolkits.some((t) => t.id === id);
}

/**
 * 获取工具集数量
 */
export async function getToolkitCount(): Promise<number> {
  const toolkits = await getAllToolkits();
  return toolkits.length;
}

/**
 * 清除所有工具集
 */
export async function clearAllToolkits(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: [] });
}

// =============================================================================
// TOOLKIT CREATION
// =============================================================================

/**
 * 生成工具集 ID
 * @returns UUID 格式的 ID
 */
export function generateToolkitId(): string {
  return `tk_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 创建工具集数据对象
 * @param tools - 工具列表
 * @param name - 名称
 * @param description - 描述
 * @returns 工具集对象
 */
export function createToolkit(
  tools: AtomicTool[],
  name: string,
  description?: string,
): Toolkit {
  const now = new Date().toISOString();
  return {
    id: generateToolkitId(),
    name,
    description,
    tools: [...tools],
    targetUrl: undefined,
    createdAt: now,
    updatedAt: now,
    version: DEFAULT_VERSION,
    tags: [],
    author: undefined,
  };
}

/**
 * 克隆工具集
 * @param toolkit - 原工具集
 * @param newName - 新名称
 * @returns 克隆的工具集
 */
export function cloneToolkit(toolkit: Toolkit, newName?: string): Toolkit {
  const now = new Date().toISOString();
  return {
    ...toolkit,
    id: generateToolkitId(),
    name: newName || `${toolkit.name} (副本)`,
    tools: toolkit.tools.map((tool) => ({ ...tool })),
    createdAt: now,
    updatedAt: now,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * 从 Storage 获取所有工具集
 */
async function getAllToolkits(): Promise<Toolkit[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}
