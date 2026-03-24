/**
 * =============================================================================
 * Execution Type Definitions
 * =============================================================================
 *
 * Types for tool execution requests, responses, and errors.
 */

import type { SelectorLogic } from './selector.js';

/**
 * Parameter definition for an atomic tool
 */
export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  required?: boolean;
  default?: string | number | boolean;
}

/**
 * Tool source type - indicates how the tool was created
 */
export type ToolSource = 'recorded' | 'manual' | 'imported';

/**
 * Atomic Tool: A complete, reusable automation action
 *
 * This is what AI generates from user recordings or natural language.
 * It combines primitives according to the selector logic.
 */
export interface AtomicTool {
  /** Unique identifier */
  tool_id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this tool does */
  description?: string;
  /** Parameter definitions (for variable substitution) */
  parameters: Record<string, ToolParameter>;
  /** The selection and action logic */
  selector_logic: SelectorLogic;
  /** Tool source - indicates how this tool was created */
  source?: ToolSource;
  /** Creation timestamp (ISO 8601) */
  createdAt?: string;
}

/**
 * Request to execute an atomic tool
 */
export interface ExecuteToolRequest {
  /** The tool definition */
  tool: AtomicTool;
  /** Parameter values to substitute */
  params: Record<string, string | number | boolean>;
  /** Enable debug mode (show highlights, slow execution) */
  debug?: boolean;
}

/**
 * Result of tool execution
 */
export interface ExecuteToolResult {
  /** Whether execution was successful */
  success: boolean;
  /** Extracted data (for EXTRACT_TEXT action) */
  data?: string | string[];
  /** Error message if failed */
  error?: ExecutionError;
  /** Execution metadata */
  metadata?: {
    /** Time taken in milliseconds */
    duration: number;
    /** Number of elements matched by scope */
    scopeMatchCount?: number;
    /** Index of anchor-matched element */
    anchorMatchIndex?: number;
  };
}

/**
 * Structured error for self-healing agent
 */
export interface ExecutionError {
  /** Error code for programmatic handling */
  code:
    | 'SCOPE_NOT_FOUND' // Scope selector matched 0 elements
    | 'ANCHOR_NOT_FOUND' // No element in scope matched anchor
    | 'TARGET_NOT_FOUND' // Target selector not found in context
    | 'ACTION_FAILED' // Action execution failed
    | 'TIMEOUT' // Wait timeout exceeded
    | 'INVALID_SELECTOR' // CSS selector syntax error
    | 'UNKNOWN'; // Unexpected error
  /** Human-readable message */
  message: string;
  /** The selector that failed (for self-healing) */
  failedSelector?: string;
  /** Snapshot of nearby DOM for AI analysis */
  domSnapshot?: string;
}

/**
 * Options for executor behavior
 */
export interface ExecutorOptions {
  /** Enable debug mode with highlights and delays */
  debug?: boolean;
  /** Delay between debug steps (ms) */
  debugDelay?: number;
  /** Callback for debug step notifications */
  onDebugStep?: (step: DebugStep) => void;
}

/**
 * Debug step information for callback
 */
export interface DebugStep {
  type: 'scope' | 'anchor' | 'target' | 'action';
  selector?: string;
  matchCount?: number;
  element?: Element;
}
