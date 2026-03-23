/**
 * =============================================================================
 * Toolkit Type Definitions
 * =============================================================================
 *
 * Toolkit is a collection of atomic tools in a specific order.
 * It represents a reusable operation sequence, serving as the middle layer
 * between Atomic Tools and Blueprints in the orchestration architecture.
 *
 * Layer 1: Atomic Tools (minimum operation units)
 *     ↓ combine
 * Layer 2: Toolkit (ordered tool sequences)
 *     ↓ configure
 * Layer 3: Blueprint (toolkits + Rule Books)
 */

import type { AtomicTool } from './execution.js';

/**
 * Toolkit - An ordered collection of atomic tools
 *
 * A toolkit represents a reusable operation sequence, such as:
 * - "Login flow" = [input username, input password, click login button]
 * - "Fill form" = [select option1, input field2, upload file3, click submit]
 */
export interface Toolkit {
  /** Unique identifier (UUID) */
  id: string;

  /** Toolkit name */
  name: string;

  /** Toolkit description (optional) */
  description?: string;

  /** Ordered list of tools (in execution order) */
  tools: AtomicTool[];

  /** Target URL pattern (where this toolkit applies) */
  targetUrl?: string;

  /** Creation time (ISO 8601) */
  createdAt: string;

  /** Last update time (ISO 8601) */
  updatedAt: string;

  /** Semantic version */
  version: string;

  /** Tags (for categorization and search) */
  tags?: string[];

  /** Author */
  author?: string;
}

/**
 * Toolkit metadata (lightweight version for listing)
 */
export interface ToolkitMeta {
  id: string;
  name: string;
  description?: string;
  toolCount: number;
  targetUrl?: string;
  updatedAt: string;
  version: string;
  tags?: string[];
}

/**
 * Toolkit import options
 */
export interface ToolkitImportOptions {
  /** Whether to overwrite existing toolkit */
  overwrite?: boolean;

  /** Whether to preserve original ID */
  preserveId?: boolean;

  /** ID mapping (for conflict resolution) */
  idMapping?: Record<string, string>;
}

/**
 * Toolkit export options
 */
export interface ToolkitExportOptions {
  /** Whether to include dependent tool definitions */
  includeTools?: boolean;

  /** Whether to minify output */
  minify?: boolean;

  /** Export format */
  format?: 'json' | 'yaml';
}

/**
 * Toolkit validation error
 */
export interface ToolkitValidationError {
  toolId: string;
  field: string;
  message: string;
}

/**
 * Toolkit validation result
 */
export interface ToolkitValidationResult {
  valid: boolean;
  errors: ToolkitValidationError[];
  warnings: string[];
}

/**
 * Toolkit operation types
 */
export type ToolkitOperation =
  | 'add_tool'
  | 'remove_tool'
  | 'move_tool'
  | 'update_tool'
  | 'clone'
  | 'merge';

/**
 * Toolkit operation result
 */
export interface ToolkitOperationResult {
  success: boolean;
  toolkit?: Toolkit;
  error?: string;
}
