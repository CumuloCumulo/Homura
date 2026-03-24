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
  | 'PAGE_STATE' // Content -> Background: DOM summary response
  // Test-related messages (Dashboard <-> SidePanel)
  | 'TEST_TOOLKIT' // Dashboard -> SidePanel: Test a toolkit (deprecated, use SEND_TOOLKIT_TO_SIDEPANEL)
  | 'TEST_BLUEPRINT' // Dashboard -> SidePanel: Test a blueprint
  | 'TEST_PROGRESS' // SidePanel -> Dashboard: Test execution progress
  | 'TEST_RESULT' // SidePanel -> Dashboard: Test execution result
  | 'STOP_TEST' // Dashboard -> SidePanel: Stop running test
  | 'SEND_TOOLKIT_TO_SIDEPANEL'; // Dashboard -> SidePanel: Send toolkit for manual testing

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
  | ClearHighlightsMessage
  | TestToolkitMessage
  | TestBlueprintMessage
  | TestProgressMessage
  | TestResultMessage
  | StopTestMessage;

// =============================================================================
// TEST MESSAGE TYPES - Dashboard <-> SidePanel communication
// =============================================================================

/**
 * Test toolkit request message
 */
export interface TestToolkitMessage {
  type: 'TEST_TOOLKIT';
  payload: {
    toolkit: import('@homura/sdk/types').Toolkit;
    tabId: number;
    /** Runtime parameter substitution */
    params?: Record<string, unknown>;
    /** Execution options */
    options?: {
      /** Whether to pause execution */
      pause?: boolean;
      /** Execution interval (ms) */
      interval?: number;
      /** Timeout (ms) */
      timeout?: number;
    };
  };
  messageId?: string;
}

/**
 * Test blueprint request message
 */
export interface TestBlueprintMessage {
  type: 'TEST_BLUEPRINT';
  payload: {
    blueprint: import('@homura/sdk/types').Blueprint;
    tabId: number;
    /** Test target URL */
    testUrl?: string;
    /** Runtime parameter substitution */
    params?: Record<string, unknown>;
    /** Execution options */
    options?: {
      /** Whether to pause execution */
      pause?: boolean;
      /** Timeout (ms) */
      timeout?: number;
    };
  };
  messageId?: string;
}

/**
 * Test progress update message
 */
export interface TestProgressMessage {
  type: 'TEST_PROGRESS';
  payload: {
    testId: string;
    currentStep: number;
    totalSteps: number;
    currentToolName: string;
    currentToolId?: string;
    /** Current action description */
    action?: string;
  };
  messageId?: string;
  requestMessageId?: string;
}

/**
 * Tool execution result within a test
 */
export interface ToolExecutionResult {
  toolId: string;
  toolName: string;
  success: boolean;
  result: unknown;
  error?: string;
  timestamp: string;
  duration?: number;
}

/**
 * Test result message
 */
export interface TestResultMessage {
  type: 'TEST_RESULT';
  payload: {
    testId: string;
    success: boolean;
    results: ToolExecutionResult[];
    logs: LogEntry[];
    error?: string;
    totalTime: number;
    /** Test type (toolkit or blueprint) */
    testType: 'toolkit' | 'blueprint';
  };
  messageId?: string;
  requestMessageId?: string;
}

/**
 * Stop test message
 */
export interface StopTestMessage {
  type: 'STOP_TEST';
  payload: {
    testId: string;
  };
  messageId?: string;
}

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

// =============================================================================
// DASHBOARD ↔ SIDEPANEL BRIDGE TYPES
// =============================================================================

/**
 * Send toolkit to SidePanel message
 * Dashboard sends toolkit data to SidePanel for manual testing
 */
export interface SendToolkitToSidepanelMessage {
  type: 'SEND_TOOLKIT_TO_SIDEPANEL';
  payload: {
    toolkitId: string;
    toolkitName: string;
    tools: import('@homura/sdk/types').AtomicTool[];
  };
  messageId?: string;
}

/**
 * SidePanel test state (internal to SidePanel)
 */
export interface SidePanelTestState {
  toolkitId: string | null;
  toolkitName: string;
  tools: import('@homura/sdk/types').AtomicTool[];
  currentIndex: number; // Currently selected tool for single tool testing
}

/**
 * Tool test result (internal to SidePanel)
 */
export interface ToolTestResult {
  toolId: string;
  toolName: string;
  success: boolean;
  duration: number;
  data?: unknown;
  error?: string;
  timestamp: string;
}

// Add new message types to the union
export type ExtendedHomuraMessage =
  | HomuraMessage
  | SendToolkitToSidepanelMessage;
