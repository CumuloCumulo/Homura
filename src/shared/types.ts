/**
 * =============================================================================
 * Homura - Extension-Specific Type Definitions
 * =============================================================================
 *
 * This file contains types that are specific to the Chrome Extension and NOT part of the SDK.
 * For SDK types, import directly from @homura/sdk/types.
 *
 * Types previously here have been moved to the SDK:
 * - AtomicTool, ExecuteToolRequest, ExecuteToolResult -> @homura/sdk/types
 * - Selector types -> @homura/sdk/selector
 * - Primitive types -> @homura/sdk/primitives
 * =============================================================================
 */

// =============================================================================
// MESSAGING TYPES - Communication between Background and Content Script
// =============================================================================

/**
 * Message types for Background <-> Content Script communication
 */
export type MessageType =
  | 'EXECUTE_TOOL' // Background -> Content: Execute a tool
  | 'EXECUTION_RESULT' // Content -> Background: Return result
  | 'HIGHLIGHT_ELEMENT' // Background -> Content: Highlight for debug
  | 'CLEAR_HIGHLIGHTS' // Background -> Content: Clear debug highlights
  | 'GET_PAGE_STATE' // Background -> Content: Get DOM summary
  | 'PAGE_STATE'; // Content -> Background: DOM summary response

/**
 * Base message structure
 */
export interface Message<T extends MessageType, P = unknown> {
  type: T;
  payload: P;
  /** Unique message ID for request-response matching */
  messageId?: string;
}

// Specific message types
export type ExecuteToolMessage = Message<
  'EXECUTE_TOOL',
  import('@homura/sdk/types').ExecuteToolRequest
>;
export type ExecutionResultMessage = Message<
  'EXECUTION_RESULT',
  import('@homura/sdk/types').ExecuteToolResult
>;
export type HighlightElementMessage = Message<
  'HIGHLIGHT_ELEMENT',
  { selector: string; color?: string }
>;
export type ClearHighlightsMessage = Message<'CLEAR_HIGHLIGHTS', undefined>;

// Union of all message types
export type HomuraMessage =
  | ExecuteToolMessage
  | ExecutionResultMessage
  | HighlightElementMessage
  | ClearHighlightsMessage;

// =============================================================================
// MISSION & RULE BOOK TYPES (for future AI integration)
// =============================================================================

/**
 * A Mission represents a complete automation task
 */
export interface Mission {
  id: string;
  name: string;
  description?: string;
  /** Rule book in markdown format */
  ruleBook: string;
  /** Tools available for this mission */
  toolIds: string[];
  /** Current status */
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
}

/**
 * Execution log entry
 */
export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  toolId?: string;
  data?: unknown;
}
