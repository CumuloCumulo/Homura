/**
 * =============================================================================
 * Homura - AI Service Types
 * =============================================================================
 * 
 * Type definitions for AI service integration (通义 API)
 */

import type { AtomicTool, SelectorLogic } from '@shared/types';
import type { AncestorInfo, AnchorCandidate, ContainerType, PathSelector } from '@shared/selectorBuilder';

// =============================================================================
// AI CLIENT TYPES
// =============================================================================

export interface AIClientConfig {
  /** API Key */
  apiKey: string;
  /** Model name (default: qwen-plus) */
  model?: string;
  /** Base URL (default: dashscope) */
  baseUrl?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// =============================================================================
// SELECTOR GENERATION TYPES
// =============================================================================

export interface SelectorGenerationContext {
  /** User's intent description */
  intent: string;
  /** Target element HTML */
  targetHtml: string;
  /** Container HTML (surrounding context) */
  containerHtml: string;
  /** Optional: anchor value for dynamic matching */
  anchorValue?: string;
  /** Optional: failed selector for self-healing */
  failedSelector?: string;
}

export interface SelectorSuggestion {
  /** Generated selector logic */
  selectorLogic: SelectorLogic;
  /** Confidence score (0-1) */
  confidence: number;
  /** Explanation of the strategy */
  explanation: string;
}

// =============================================================================
// PATH-BASED SELECTOR TYPES
// =============================================================================

/**
 * Context for path-based selector generation
 * Note: Uses AncestorInfo from @shared/selectorBuilder
 */
export interface PathSelectorContext {
  /** Target element selector */
  targetSelector: string;
  /** Target element HTML */
  targetHtml: string;
  /** Ancestor path from target upward */
  ancestorPath: AncestorInfo[];
  /** User's intent description */
  intent?: string;
}

// Re-export PathSelector as PathSelectorResult for backward compatibility
export type PathSelectorResult = PathSelector;

// =============================================================================
// SMART SELECTOR TYPES (Unified Entry Point)
// =============================================================================

/**
 * Context for smart selector generation
 * Contains all information needed for both Path Selector and Scope+Anchor+Target strategies
 */
export interface SmartSelectorContext {
  /** User's intent description */
  intent: string;
  /** Target element selector */
  targetSelector: string;
  /** Target element HTML */
  targetHtml: string;
  /** Ancestor path from target upward (for Path Selector strategy) */
  ancestorPath: AncestorInfo[];
  /** Structure information for strategy routing */
  structureInfo: {
    /** Container type detected by analyzer */
    containerType: ContainerType;
    /** Whether the element is in a repeating structure */
    hasRepeatingStructure: boolean;
    /** Container selector (for Scope+Anchor+Target strategy) */
    containerSelector?: string;
    /** Anchor candidates found in container */
    anchorCandidates: AnchorCandidate[];
  };
}

/**
 * Result from smart selector generation
 * Can contain either PathSelector or SelectorLogic depending on strategy used
 */
export interface SmartSelectorResult {
  /** Strategy used for generation */
  strategy: 'path_selector' | 'scope_anchor_target';
  /** Path selector result (if strategy is 'path_selector') */
  pathSelector?: PathSelector;
  /** Selector logic result (if strategy is 'scope_anchor_target') */
  selectorLogic?: SelectorLogic;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reasoning for the selection */
  reasoning: string;
}

// =============================================================================
// TOOL GENERATION TYPES
// =============================================================================

export interface RecordingAction {
  /** Action type */
  type: 'click' | 'input' | 'navigate' | 'scroll';
  /** Target element selector */
  selector: string;
  /** Target element HTML */
  targetHtml: string;
  /** Input value (for input actions) */
  value?: string;
  /** Timestamp */
  timestamp: number;
}

export interface RecordingTrace {
  /** Recorded actions */
  actions: RecordingAction[];
  /** Page URL */
  pageUrl: string;
  /** Page title */
  pageTitle: string;
  /** DOM snapshot of the relevant area */
  domSnapshot: string;
}

export interface ToolGenerationResult {
  /** Generated atomic tool */
  tool: AtomicTool;
  /** Identified parameters */
  parameters: {
    name: string;
    value: string;
    description: string;
  }[];
  /** Explanation */
  explanation: string;
}

// =============================================================================
// SELF-HEALING TYPES
// =============================================================================

export interface SelfHealingContext {
  /** Original selector that failed */
  failedSelector: string;
  /** Error message */
  errorMessage: string;
  /** Current DOM snapshot */
  currentDom: string;
  /** Original element description */
  elementDescription?: string;
}

export interface SelfHealingResult {
  /** New suggested selector */
  newSelector: string;
  /** Confidence score */
  confidence: number;
  /** Explanation of the fix */
  explanation: string;
}
