/**
 * Homura Shared Module - Public API
 *
 * This file provides a unified export point for both SDK types/functions
 * (re-exported from @homura/sdk) and extension-specific types/functions.
 */

// =============================================================================
// SDK TYPES - Re-exported from @homura/sdk for convenience
// =============================================================================

export type {
  // Primitives
  PrimitiveAction,
  ClickParams,
  InputParams,
  ExtractTextParams,
  WaitForParams,
  NavigateParams,

  // Selector
  SelectorScope,
  SelectorAnchor,
  SelectorTarget,
  SelectorLogic,
  UnifiedSelector,
  SelectorStrategy,
  PathStrategyData,
  StructureStrategyData,

  // Atomic Tool
  ToolParameter,
  AtomicTool,

  // Toolkit
  Toolkit,
  ToolkitMeta,
  ToolkitImportOptions,
  ToolkitExportOptions,
  ToolkitValidationError,
  ToolkitValidationResult,
  ToolkitOperation,
  ToolkitOperationResult,

  // Execution
  ExecuteToolRequest,
  ExecuteToolResult,
  ExecutionError,
} from '@homura/sdk/types';

// =============================================================================
// SDK CONSTANTS - Re-exported from @homura/sdk
// =============================================================================

export { HIGHLIGHT_COLORS, TIMEOUTS, CSS_CLASSES } from '@homura/sdk/constants';

// =============================================================================
// SDK UTILITIES - Re-exported from @homura/sdk
// =============================================================================

export {
  generateMessageId,
  sleep,
  substituteVariables,
  matchText,
  truncate,
  getDOMSnapshot,
  safeQuerySelector,
  safeQuerySelectorAll,
} from '@homura/sdk/utils';

// =============================================================================
// EXTENSION-SPECIFIC TYPES
// =============================================================================

export type {
  // Messaging types (Chrome extension specific)
  MessageType,
  Message,
  ExecuteToolMessage,
  ExecutionResultMessage,
  HighlightElementMessage,
  ClearHighlightsMessage,
  HomuraMessage,

  // Mission types (extension orchestration)
  Mission,
  LogEntry,
} from './types';

// =============================================================================
// SHARED UI COMPONENTS
// =============================================================================

export { ActionIcon } from './components';

// =============================================================================
// EXTENSION-SPECIFIC UTILITIES
// =============================================================================

export { sendMessageToContent, getActiveTab } from './utils';

// =============================================================================
// EXTENSION-SPECIFIC CONSTANTS
// =============================================================================

export { STORAGE_KEYS, EXTENSION_IDS } from './constants';

// =============================================================================
// EXTENSION-SPECIFIC SELECTOR BUILDER
// =============================================================================

export type { RecordingState, RecordedAction } from './selectorBuilder';

// =============================================================================
// EXTENSION-SPECIFIC STORAGE
// =============================================================================

export type {
  RecordingData,
  SerializableRecordedAction,
  SerializableElementAnalysis,
  AnchorCandidateSerializable,
} from './storage/recordingStorage';

export {
  saveRecordingToStorage,
  getRecordingsFromStorage,
  getRecordingById,
  deleteRecordingFromStorage,
  markRecordingAsImported,
  clearAllRecordings,
  getUnimportedCount,
  generateRecordingId,
  createRecordingData,
} from './storage/recordingStorage';

// Toolkit Storage
export {
  saveToolkitToStorage,
  saveToolkitsToStorage,
  getToolkitsFromStorage,
  getToolkitById,
  deleteToolkitFromStorage,
  deleteToolkitsFromStorage,
  toolkitExists,
  getToolkitCount,
  clearAllToolkits,
  generateToolkitId,
  createToolkit,
  cloneToolkit,
} from './storage/toolkitStorage';
