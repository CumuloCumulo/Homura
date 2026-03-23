/**
 * =============================================================================
 * Homura Dashboard - Toolkit Import/Export
 * =============================================================================
 *
 * Utilities for importing and exporting toolkits
 */

import type {
  Toolkit,
  ToolkitImportOptions,
  ToolkitExportOptions,
} from '@homura/sdk/types';
import { generateToolkitId } from '@shared/storage/toolkitStorage';

// =============================================================================
// EXPORT FUNCTIONS
// =============================================================================

/**
 * 导出工具集
 * @param toolkit - 工具集对象
 * @param options - 导出选项
 * @returns 导出数据（JSON 字符串）
 */
export async function exportToolkitData(
  toolkit: Toolkit,
  options?: ToolkitExportOptions,
): Promise<string> {
  const data = serializeToolkit(toolkit, options);

  if (options?.format === 'yaml') {
    // For YAML support, we'd need a YAML library
    // For now, just return JSON
    console.warn('YAML format not yet supported, falling back to JSON');
  }

  const json = JSON.stringify(data, null, options?.minify ? undefined : 2);

  // Trigger download
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${toolkit.name.replace(/\s+/g, '-')}-${toolkit.version}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return json;
}

/**
 * 导出多个工具集
 * @param toolkits - 工具集列表
 * @param options - 导出选项
 * @returns 导出数据（JSON 字符串）
 */
export async function exportMultipleToolkits(
  toolkits: Toolkit[],
  options?: ToolkitExportOptions,
): Promise<string> {
  const data = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    count: toolkits.length,
    toolkits: toolkits.map((tk) => serializeToolkit(tk, options)),
  };

  const json = JSON.stringify(data, null, options?.minify ? undefined : 2);

  // Trigger download
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `homura-toolkits-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return json;
}

/**
 * 复制工具集到剪贴板
 * @param toolkit - 工具集对象
 * @returns 是否成功
 */
export async function copyToolkitToClipboard(
  toolkit: Toolkit,
): Promise<boolean> {
  try {
    const json = JSON.stringify(serializeToolkit(toolkit), null, 2);
    await navigator.clipboard.writeText(json);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// IMPORT FUNCTIONS
// =============================================================================

/**
 * 导入工具集
 * @param data - 导入数据（JSON 字符串或对象）
 * @param options - 导入选项
 * @returns 导入的工具集列表
 */
export async function importToolkitData(
  data: string | unknown,
  options?: ToolkitImportOptions,
): Promise<Toolkit[]> {
  let parsed: unknown;

  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch (error) {
      throw new Error('Invalid JSON data');
    }
  } else {
    parsed = data;
  }

  // Check if it's a multi-toolkit export
  if (isMultiToolkitExport(parsed)) {
    const toolkits: Toolkit[] = [];

    for (const tkData of parsed.toolkits) {
      const toolkit = deserializeToolkit(tkData, options);
      toolkits.push(toolkit);
    }

    return toolkits;
  }

  // Single toolkit
  const toolkit = deserializeToolkit(parsed, options);
  return [toolkit];
}

/**
 * 从剪贴板导入工具集
 * @returns 导入的工具集列表
 */
export async function importToolkitFromClipboard(
  options?: ToolkitImportOptions,
): Promise<Toolkit[]> {
  const text = await navigator.clipboard.readText();
  return importToolkitData(text, options);
}

/**
 * 从文件导入工具集
 * @param file - 文件对象
 * @param options - 导入选项
 * @returns 导入的工具集列表
 */
export async function importToolkitFromFile(
  file: File,
  options?: ToolkitImportOptions,
): Promise<Toolkit[]> {
  const text = await file.text();
  return importToolkitData(text, options);
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * 验证工具集格式
 * @param data - 待验证数据
 * @returns 验证结果
 */
export function validateToolkitData(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['数据必须是对象'] };
  }

  const obj = data as Record<string, unknown>;

  if (!obj.id || typeof obj.id !== 'string') {
    errors.push('缺少或无效的 id 字段');
  }

  if (!obj.name || typeof obj.name !== 'string') {
    errors.push('缺少或无效的 name 字段');
  }

  if (!Array.isArray(obj.tools)) {
    errors.push('tools 必须是数组');
  }

  if (!obj.version || typeof obj.version !== 'string') {
    errors.push('缺少或无效的 version 字段');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// SERIALIZATION HELPERS
// =============================================================================

/**
 * 序列化工具集（移除不可序列化的数据）
 */
function serializeToolkit(
  toolkit: Toolkit,
  _options?: ToolkitExportOptions,
): Record<string, unknown> {
  return {
    id: toolkit.id,
    name: toolkit.name,
    description: toolkit.description,
    tools: toolkit.tools,
    targetUrl: toolkit.targetUrl,
    createdAt: toolkit.createdAt,
    updatedAt: toolkit.updatedAt,
    version: toolkit.version,
    tags: toolkit.tags,
    author: toolkit.author,
  };
}

/**
 * 反序列化工具集
 */
function deserializeToolkit(
  data: unknown,
  options?: ToolkitImportOptions,
): Toolkit {
  // Validate
  const validation = validateToolkitData(data);
  if (!validation.valid) {
    throw new Error(`Invalid toolkit data: ${validation.errors.join(', ')}`);
  }

  const obj = data as Toolkit;

  // Generate new ID if not preserving
  const id = options?.preserveId ? obj.id : generateToolkitId();

  return {
    ...obj,
    id,
    tools: obj.tools.map((tool) => ({ ...tool })),
    // Update timestamps
    createdAt: options?.preserveId ? obj.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 检查是否为多工具集导出格式
 */
function isMultiToolkitExport(data: unknown): data is {
  version: string;
  exportDate: string;
  count: number;
  toolkits: unknown[];
} {
  return (
    typeof data === 'object' &&
    data !== null &&
    'version' in data &&
    'exportDate' in data &&
    'count' in data &&
    'toolkits' in data &&
    Array.isArray((data as { toolkits: unknown[] }).toolkits)
  );
}
