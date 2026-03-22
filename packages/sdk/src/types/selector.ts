/**
 * =============================================================================
 * Selector Type Definitions
 * =============================================================================
 *
 * The Scope + Anchor + Target pattern for robust element selection.
 */

import type { PrimitiveAction, ClickParams, InputParams, ExtractTextParams, WaitForParams, NavigateParams } from './primitives.js';

/**
 * Scope: Defines the container/list to search within
 * Example: Find all table rows (tr.audit-row)
 */
export interface SelectorScope {
  /** Type of scope */
  type: 'container_list' | 'single_container';
  /** CSS selector for the scope */
  selector: string;
}

/**
 * Anchor: Defines how to locate a specific item within the scope
 * Example: Find the row where .student-name contains "张三"
 */
export interface SelectorAnchor {
  /** Type of anchor matching */
  type: 'text_match' | 'attribute_match' | 'index';
  /** CSS selector within the scope to check */
  selector: string;
  /** Value to match against (supports {{variable}} syntax) */
  value: string;
  /** For attribute_match: which attribute to check */
  attribute?: string;
  /** Match mode: exact, contains, startsWith, endsWith */
  matchMode?: 'exact' | 'contains' | 'startsWith' | 'endsWith';
}

/**
 * Target: The actual element to operate on
 * Example: Click the button.btn-approve within the matched row
 */
export interface SelectorTarget {
  /** CSS selector for the target element (relative to scope/anchor) */
  selector: string;
  /** Action to perform */
  action: PrimitiveAction;
  /** Action-specific parameters */
  actionParams?: ClickParams | InputParams | ExtractTextParams | WaitForParams | NavigateParams;
}

/**
 * Complete selector logic combining Scope + Anchor + Target
 *
 * Flow:
 * 1. If scope is defined: Find all matching container elements
 * 2. If anchor is defined: Filter containers to find the matching one
 * 3. Within the matched container (or document if no scope): Find and operate on target
 */
export interface SelectorLogic {
  /** Optional: Container scope to search within */
  scope?: SelectorScope;
  /** Optional: Anchor to locate specific container within scope */
  anchor?: SelectorAnchor;
  /** Required: Target element and action */
  target: SelectorTarget;
}

// =============================================================================
// UNIFIED SELECTOR - The single source of truth for selector data
// =============================================================================

/**
 * Strategy type for selector generation
 * - 'path': Path-based selector using semantic ancestry (for single elements)
 * - 'scope_anchor_target': Structure-based selector (for repeating structures)
 * - 'direct': Simple direct selector without strategy (fallback)
 */
export type SelectorStrategy = 'path' | 'scope_anchor_target' | 'direct';

/**
 * Path strategy data - stores the structured path from semantic root to target
 * This preserves the full structure instead of collapsing to a single string
 */
export interface PathStrategyData {
  /** Semantic root selector (e.g., ".official-header") */
  root: string;
  /** Intermediate path selectors (e.g., [".section"]) */
  intermediates: string[];
  /** Target element selector (e.g., "input.input-inner") */
  target: string;
}

/**
 * Structure strategy data - Scope + Anchor + Target pattern
 * For repeating structures like tables and lists
 */
export interface StructureStrategyData {
  /** Scope: Container selector for the repeating structure */
  scope: {
    selector: string;
    type: 'container_list' | 'single_container';
  };
  /** Anchor: Optional matcher to locate specific container instance */
  anchor?: {
    selector: string;
    type: 'text_match' | 'attribute_match';
    value: string;
    matchMode: 'exact' | 'contains' | 'startsWith' | 'endsWith';
  };
  /** Target: Relative selector within the matched container */
  target: {
    selector: string;
  };
}

/**
 * Action configuration for the selector
 */
export interface SelectorAction {
  /** Action type to perform */
  type: PrimitiveAction;
  /** Action-specific parameters */
  params?: ClickParams | InputParams | ExtractTextParams | WaitForParams | NavigateParams;
}

/**
 * UnifiedSelector - The single source of truth for all selector data
 *
 * This type unifies Path and Structure strategies with a structure that:
 * 1. Can represent both Path and Structure strategies
 * 2. Preserves structured data (not just flattened strings)
 * 3. Includes action configuration for execution
 * 4. Is fully serializable
 *
 * @example Path Strategy
 * ```typescript
 * {
 *   id: "sel_abc123",
 *   strategy: "path",
 *   fullSelector: ".official-header .section input.input-inner",
 *   pathData: {
 *     root: ".official-header",
 *     intermediates: [".section"],
 *     target: "input.input-inner"
 *   },
 *   action: { type: "CLICK" },
 *   confidence: 0.85,
 *   validated: true
 * }
 * ```
 *
 * @example Structure Strategy
 * ```typescript
 * {
 *   id: "sel_def456",
 *   strategy: "scope_anchor_target",
 *   fullSelector: "#audit-table tr .btn-approve",
 *   structureData: {
 *     scope: { selector: "#audit-table tr", type: "container_list" },
 *     anchor: { selector: ".student-name", type: "text_match", value: "张三", matchMode: "contains" },
 *     target: { selector: ".btn-approve" }
 *   },
 *   action: { type: "CLICK" },
 *   confidence: 0.9,
 *   validated: true
 * }
 * ```
 */
export interface UnifiedSelector {
  /** Unique identifier (UUID format: sel_xxx) */
  id: string;

  /** Strategy type: determines how the selector is parsed and executed */
  strategy: SelectorStrategy;

  /**
   * Full CSS selector string - used for quick execution or fallback
   * This is always populated regardless of strategy
   */
  fullSelector: string;

  /**
   * Path strategy data - populated when strategy is 'path'
   * Preserves the structured path from semantic root to target
   */
  pathData?: PathStrategyData;

  /**
   * Structure strategy data - populated when strategy is 'scope_anchor_target'
   * Contains Scope + Anchor + Target configuration
   */
  structureData?: StructureStrategyData;

  /** Action configuration: what to do with the selected element */
  action: SelectorAction;

  /** Confidence score (0-1) */
  confidence: number;

  /** Whether the selector has been validated against current DOM */
  validated: boolean;

  /** Optional reasoning from AI or algorithm */
  reasoning?: string;

  /** Metadata for debugging and tracking */
  metadata?: {
    /** Source of this selector: 'ai', 'programmatic', 'user_edit' */
    source?: 'ai' | 'programmatic' | 'user_edit';
    /** Timestamp when created */
    createdAt?: number;
    /** Number of times validated successfully */
    validationCount?: number;
  };
}

/**
 * Generate a unique selector ID
 */
export function generateSelectorId(): string {
  return `sel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Build fullSelector string from PathStrategyData
 */
export function buildFullSelectorFromPath(pathData: PathStrategyData): string {
  const parts = [pathData.root, ...pathData.intermediates, pathData.target];
  return parts.filter(Boolean).join(' ');
}

/**
 * Build fullSelector string from StructureStrategyData
 * Note: This is a simplified version for display; actual execution uses the structured data
 */
export function buildFullSelectorFromStructure(structureData: StructureStrategyData): string {
  return `${structureData.scope.selector} ${structureData.target.selector}`;
}
