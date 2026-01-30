/**
 * Homura Shared Module - Public API
 */

// Types
export type {
  // Primitives
  PrimitiveAction,
  ClickParams,
  InputParams,
  ExtractTextParams,
  WaitForParams,
  NavigateParams,
  
  // Selector Logic
  SelectorScope,
  SelectorAnchor,
  SelectorTarget,
  SelectorLogic,
  
  // Atomic Tool
  ToolParameter,
  AtomicTool,
  
  // Execution
  ExecuteToolRequest,
  ExecuteToolResult,
  ExecutionError,
  
  // Messaging
  MessageType,
  Message,
  ExecuteToolMessage,
  ExecutionResultMessage,
  HighlightElementMessage,
  ClearHighlightsMessage,
  HomuraMessage,
  
  // Mission
  Mission,
  LogEntry,
} from './types';

// Constants
export { HIGHLIGHT_COLORS, TIMEOUTS, CSS_CLASSES } from './constants';

// Utilities
export {
  generateMessageId,
  sleep,
  substituteVariables,
  matchText,
  truncate,
  getDOMSnapshot,
  safeQuerySelector,
  safeQuerySelectorAll,
} from './utils';
