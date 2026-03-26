/**
 * =============================================================================
 * Homura SDK - Selector Builder Types
 * =============================================================================
 *
 * Type definitions for the selector builder module.
 * These types are environment-agnostic and can be used in any context.
 */

import type { SelectorScope, SelectorAnchor } from '../types/index.js';

// =============================================================================
// ELEMENT ANALYSIS
// =============================================================================

export interface ElementAnalysis {
  /** Target element (not serializable through Chrome messaging) */
  target?: HTMLElement;
  /** Nearest repeating container (not serializable through Chrome messaging) */
  container?: HTMLElement | null;
  /** Semantic container found by findSemanticContainer (not serializable) */
  semanticContainer?: HTMLElement | null;
  /** Container type */
  containerType: ContainerType;
  /** Anchor candidates for dynamic matching */
  anchorCandidates: AnchorCandidate[];
  /** Target selector relative to container */
  relativeSelector: string;
  /**
   * Minimal selector for target (now includes container prefix when available)
   * @example ".search-bar button" instead of just "button"
   */
  minimalSelector: string;
  /**
   * Target-only selector (without container prefix)
   * @example "button"
   */
  targetSelector?: string;
  /**
   * Full scoped selector: "container target"
   * This is the recommended selector for execution
   * @example ".search-bar button"
   */
  scopedSelector?: string;
  /** Container selector (serializable) */
  containerSelector?: string;
  /** Container tag name (serializable) */
  containerTagName?: string;
  /**
   * Target element's text content (serializable)
   * Used for matching the correct anchor candidate
   */
  targetText?: string;
  /**
   * Child element's text content (serializable)
   * Used as fallback when targetText is empty (e.g., container divs with text in span)
   */
  childText?: string;
  /**
   * Position of target element within its container (0-indexed)
   * Used for position-based anchor inference when text matching fails
   */
  positionInContainer?: number;

  // =========================================================================
  // PATH-BASED SELECTOR (New)
  // =========================================================================

  /**
   * Ancestor path from target element upward to semantic root
   * Used for AI-assisted selector generation
   */
  ancestorPath?: AncestorInfo[];

  /**
   * Path-based selector generated from ancestor analysis
   * @example ".official-header .section input.input-inner"
   */
  pathSelector?: string;
}

// =============================================================================
// ANCESTOR PATH INFO (for path-based selector generation)
// =============================================================================

/**
 * Information about an ancestor element in the path
 * Used for both programmatic and AI-assisted selector generation
 */
export interface AncestorInfo {
  /** Tag name (lowercase) */
  tagName: string;
  /** Element ID (if exists and stable) */
  id?: string;
  /** All class names */
  classes: string[];
  /** Semantic score of the class names (0-1) */
  semanticScore: number;
  /** Best selector for this element */
  selector: string;
  /** Truncated outerHTML for AI analysis (first 200 chars) */
  outerHTML: string;
  /** Depth from target (0 = parent, 1 = grandparent, etc.) */
  depth: number;
  /** Whether this element is a good semantic root */
  isSemanticRoot: boolean;
}

export type ContainerType =
  | 'table' // Table row (tr)
  | 'list' // List item (li, ol, ul)
  | 'grid' // Grid/flex item
  | 'card' // Card container
  | 'single'; // No repeating container

export interface AnchorCandidate {
  /** CSS selector within container */
  selector: string;
  /** Anchor type */
  type: 'text_match' | 'attribute_match';
  /** Text content (for text_match) */
  text?: string;
  /** Attribute info (for attribute_match) */
  attribute?: {
    name: string;
    value: string;
  };
  /**
   * Confidence score (0-1)
   * Adjusted by entropy analysis: unique values get boosted, repeated values get penalized
   */
  confidence: number;
  /**
   * Is this anchor unique across all sibling containers?
   * true = appears only in current row (HIGH entropy, BEST anchor)
   * false = appears in multiple rows (LOW entropy, POOR anchor)
   */
  isUnique: boolean;
  /**
   * How many sibling containers have the same anchor value (optional metadata)
   * 0 = unique, >0 = repeated in that many siblings
   */
  siblingFrequency?: number;
  /**
   * Whether this is a low-entropy word (status, action, etc.)
   * Low-entropy words are penalized even if unique in current context
   */
  isLowEntropy?: boolean;
}

// =============================================================================
// PATH SELECTOR (AI-generated)
// =============================================================================

/**
 * Path-based selector schema
 * Generated by AI or programmatically from ancestor path
 */
export interface PathSelector {
  /** Semantic root selector (e.g., ".official-header") */
  root: string;
  /** Intermediate path selectors (e.g., [".section"]) */
  path: string[];
  /** Target element selector (e.g., "input.input-inner") */
  target: string;
  /** Full combined selector */
  fullSelector: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reasoning for the selection (AI explanation) */
  reasoning?: string;
}

// =============================================================================
// SELECTOR DRAFT
// =============================================================================

export interface SelectorDraft {
  /** Scope configuration */
  scope?: {
    selector: string;
    type: SelectorScope['type'];
    matchCount: number;
  };
  /** Anchor configuration */
  anchor?: {
    selector: string;
    type: SelectorAnchor['type'];
    value: string;
    matchMode: SelectorAnchor['matchMode'];
  };
  /** Target configuration */
  target: {
    selector: string;
    action: string;
  };
  /** Overall confidence */
  confidence: number;
  /** Whether the selector was validated */
  validated: boolean;
}

// =============================================================================
// VALIDATION
// =============================================================================

export interface ValidationResult {
  /** Is the selector valid? */
  valid: boolean;
  /** Number of elements matched by scope */
  scopeMatches: number;
  /** Index of anchor-matched element (-1 if not found) */
  anchorMatchIndex: number;
  /** Was target found within context? */
  targetFound: boolean;
  /** Error message if invalid */
  error?: string;
}
