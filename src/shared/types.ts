/**
 * =============================================================================
 * Homura - Core Type Definitions (Compatibility Layer)
 * =============================================================================
 *
 * This file now re-exports types from @homura/sdk for backward compatibility.
 * New code should import directly from @homura/sdk/types.
 */

// Re-export all types from SDK
export * from "@homura/sdk/types";

// =============================================================================
// EXTENSION-SPECIFIC TYPES
// =============================================================================
//
// Types that are specific to the Chrome Extension and not part of the SDK.
// These should NOT be moved to the SDK.
// =============================================================================

// =============================================================================
// MESSAGING TYPES - Communication between Background and Content Script
// =============================================================================

/**
 * Message types for Background <-> Content Script communication
 */
export type MessageType =
  | "EXECUTE_TOOL" // Background -> Content: Execute a tool
  | "EXECUTION_RESULT" // Content -> Background: Return result
  | "HIGHLIGHT_ELEMENT" // Background -> Content: Highlight for debug
  | "CLEAR_HIGHLIGHTS" // Background -> Content: Clear debug highlights
  | "GET_PAGE_STATE" // Background -> Content: Get DOM summary
  | "PAGE_STATE"; // Content -> Background: DOM summary response

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
  "EXECUTE_TOOL",
  import("@homura/sdk/types").ExecuteToolRequest
>;
export type ExecutionResultMessage = Message<
  "EXECUTION_RESULT",
  import("@homura/sdk/types").ExecuteToolResult
>;
export type HighlightElementMessage = Message<
  "HIGHLIGHT_ELEMENT",
  { selector: string; color?: string }
>;
export type ClearHighlightsMessage = Message<"CLEAR_HIGHLIGHTS", undefined>;

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
  status: "idle" | "running" | "paused" | "completed" | "error";
}

/**
 * Execution log entry
 */
export interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  toolId?: string;
  data?: unknown;
}
