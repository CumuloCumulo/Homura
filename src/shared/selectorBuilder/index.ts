/**
 * =============================================================================
 * Homura - Selector Builder Module (Compatibility Layer)
 * =============================================================================
 *
 * This file now re-exports selector functionality from @homura/sdk for backward compatibility.
 * New code should import directly from @homura/sdk/selector.
 */

// Re-export all selector types from SDK
export type * from "@homura/sdk/selector";

// =============================================================================
// EXTENSION-SPECIFIC SELECTOR TYPES
// =============================================================================
//
// Types that are specific to the Chrome Extension recording functionality
// and not part of the core SDK.
// =============================================================================

/**
 * Recording state for the sidepanel inspector
 */
export interface RecordingState {
  /** Is recording active? */
  isRecording: boolean;
  /** Is inspect mode active? */
  isInspecting: boolean;
  /** Currently hovered element */
  hoveredElement: HTMLElement | null;
  /** Selected element for building */
  selectedElement: HTMLElement | null;
  /** Current element analysis */
  analysis: import("@homura/sdk/selector").ElementAnalysis | null;
  /** Draft selector being built */
  selectorDraft: import("@homura/sdk/selector").SelectorDraft | null;
  /** Recorded actions */
  recordedActions: RecordedAction[];
}

/**
 * Action recorded during user interaction
 */
export interface RecordedAction {
  /** Unique identifier */
  id: string;
  /** User-defined name for this action */
  name?: string;
  /** Action type */
  type: "click" | "input" | "select" | "scroll";
  /** Timestamp */
  timestamp: number;
  /** Target element analysis */
  elementAnalysis: import("@homura/sdk/selector").ElementAnalysis;
  /** Input value (for input actions) */
  value?: string;
  /** Screenshot data URL (optional) */
  screenshot?: string;
  /** User-edited selector draft @deprecated Use unifiedSelector instead */
  selectorDraft?: import("@homura/sdk/selector").SelectorDraft;
  /**
   * Unified selector - automatically generated during recording
   * Contains both Path and Structure strategy data for execution
   */
  unifiedSelector?: import("@homura/sdk/types").UnifiedSelector;
}

// =============================================================================
// Re-export SDK functions for backward compatibility
// =============================================================================

export {
  analyzeElement,
  collectAncestorPath,
  buildPathSelector,
  buildMinimalSelector,
  buildRelativeSelector,
  findRepeatingContainer,
  findSemanticContainer,
  findAnchorCandidates,
  getElementHtml,
  getContainerContext,
} from "@homura/sdk/selector";

export {
  validateSelectorDraft,
  validateSelectorLogic,
  isValidCssSelector,
  countMatches,
  findTargetElement,
  getScopePreview,
} from "@homura/sdk/selector";

export {
  generateSelectorLogic,
  createSelectorDraft,
  draftToSelectorLogic,
  generateSelectorStrategies,
  determineStrategy,
  buildPathData,
  buildStructureData,
  createUnifiedSelector,
  convertPathSelectorToUnified,
  convertSelectorLogicToUnified,
  convertUnifiedToSelectorLogic,
  convertUnifiedToSelectorDraft,
} from "@homura/sdk/selector";
