/**
 * =============================================================================
 * Homura - Recording Storage Management
 * =============================================================================
 *
 * Chrome Storage wrapper for recording data synchronization
 * between SidePanel and Dashboard
 */

import type {
  RecordedAction,
  ElementAnalysis,
} from '@shared/selectorBuilder/types';
import type { UnifiedSelector } from '@homura/sdk/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * 录制数据（用于存储）
 * 可序列化，不包含 HTMLElement 等无法序列化的对象
 */
export interface RecordingData {
  /** 唯一标识 */
  id: string;
  /** 录制名称（用户可编辑） */
  name: string;
  /** 录制的操作列表 */
  actions: SerializableRecordedAction[];
  /** 创建时间 */
  createdAt: string;
  /** 起始 URL（用于上下文） */
  url?: string;
  /** 是否已导入到 Dashboard */
  imported?: boolean;
}

/**
 * 可序列化的录制操作
 * 移除 ElementAnalysis 中的 HTMLElement，保留可序列化字段
 */
export interface SerializableRecordedAction {
  id: string;
  name?: string;
  type: 'click' | 'input' | 'select' | 'scroll' | 'navigate';
  timestamp: number;
  /** 可序列化的元素分析数据 */
  elementAnalysis?: SerializableElementAnalysis;
  value?: string;
  unifiedSelector?: UnifiedSelector;
  url?: string;
  navigationType?: 'link' | 'form' | 'direct' | 'reload' | 'typed';
}

/**
 * 可序列化的元素分析
 * 仅保留可序列化的字段（移除 HTMLElement 引用）
 */
export interface SerializableElementAnalysis {
  containerType: 'table' | 'list' | 'grid' | 'card' | 'single';
  anchorCandidates: AnchorCandidateSerializable[];
  relativeSelector: string;
  minimalSelector: string;
  targetSelector?: string;
  scopedSelector?: string;
  containerSelector?: string;
  containerTagName?: string;
}

/**
 * 可序列化的锚点候选
 */
export interface AnchorCandidateSerializable {
  selector: string;
  type: 'text_match' | 'attribute_match';
  text?: string;
  attribute?: {
    name: string;
    value: string;
  };
  confidence: number;
  isUnique: boolean;
  siblingFrequency?: number;
  isLowEntropy?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Storage key for recordings */
const STORAGE_KEY = 'homura_recordings';

// =============================================================================
// STORAGE FUNCTIONS
// =============================================================================

/**
 * 保存录制到 Chrome Storage
 * @param recording - 录制数据
 * @returns 保存的录制 ID
 */
export async function saveRecordingToStorage(
  recording: RecordingData,
): Promise<string> {
  const existing = await getAllRecordings();
  const updated = [...existing, recording];
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
  return recording.id;
}

/**
 * 获取所有录制的列表
 * @returns 录制数据列表
 */
export async function getRecordingsFromStorage(): Promise<RecordingData[]> {
  return getAllRecordings();
}

/**
 * 获取单个录制详情
 * @param id - 录制 ID
 * @returns 录制数据或 null
 */
export async function getRecordingById(
  id: string,
): Promise<RecordingData | null> {
  const recordings = await getAllRecordings();
  return recordings.find((r) => r.id === id) || null;
}

/**
 * 删除录制
 * @param id - 录制 ID
 */
export async function deleteRecordingFromStorage(id: string): Promise<void> {
  const existing = await getAllRecordings();
  const updated = existing.filter((r) => r.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
}

/**
 * 标记录制为已导入
 * @param id - 录制 ID
 */
export async function markRecordingAsImported(id: string): Promise<void> {
  const recordings = await getAllRecordings();
  const updated = recordings.map((r) =>
    r.id === id ? { ...r, imported: true } : r,
  );
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
}

/**
 * 清除所有录制数据
 */
export async function clearAllRecordings(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: [] });
}

/**
 * 获取未导入的录制数量
 */
export async function getUnimportedCount(): Promise<number> {
  const recordings = await getAllRecordings();
  return recordings.filter((r) => !r.imported).length;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * 从 Storage 获取所有录制
 */
async function getAllRecordings(): Promise<RecordingData[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

/**
 * 生成唯一录制 ID
 */
export function generateRecordingId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 将 RecordedAction 转换为可序列化格式
 */
export function serializeRecordedAction(
  action: RecordedAction,
): SerializableRecordedAction {
  return {
    id: action.id,
    name: action.name,
    type: action.type,
    timestamp: action.timestamp,
    elementAnalysis: action.elementAnalysis
      ? serializeElementAnalysis(action.elementAnalysis)
      : undefined,
    value: action.value,
    unifiedSelector: action.unifiedSelector,
    url: action.url,
    navigationType: action.navigationType,
  };
}

/**
 * 将 ElementAnalysis 转换为可序列化格式
 */
function serializeElementAnalysis(
  analysis: ElementAnalysis,
): SerializableElementAnalysis {
  return {
    containerType: analysis.containerType,
    anchorCandidates: analysis.anchorCandidates.map((anchor) => ({
      selector: anchor.selector,
      type: anchor.type,
      text: anchor.text,
      attribute: anchor.attribute,
      confidence: anchor.confidence,
      isUnique: anchor.isUnique,
      siblingFrequency: anchor.siblingFrequency,
      isLowEntropy: anchor.isLowEntropy,
    })),
    relativeSelector: analysis.relativeSelector,
    minimalSelector: analysis.minimalSelector,
    targetSelector: analysis.targetSelector,
    scopedSelector: analysis.scopedSelector,
    containerSelector: analysis.containerSelector,
    containerTagName: analysis.containerTagName,
  };
}

/**
 * 创建录制数据对象
 */
export function createRecordingData(
  actions: RecordedAction[],
  name?: string,
  url?: string,
): RecordingData {
  return {
    id: generateRecordingId(),
    name: name || generateRecordingName(actions),
    actions: actions.map(serializeRecordedAction),
    createdAt: new Date().toISOString(),
    url,
    imported: false,
  };
}

/**
 * 生成录制名称
 */
function generateRecordingName(actions: RecordedAction[]): string {
  const timestamp = new Date().toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `录制 ${timestamp} (${actions.length} 操作)`;
}
