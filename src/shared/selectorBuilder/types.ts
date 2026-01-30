/**
 * =============================================================================
 * Homura - Selector Builder Types
 * =============================================================================
 * 
 * Type definitions for the selector builder module
 */

import type { SelectorScope, SelectorAnchor } from '@shared/types';

// =============================================================================
// ELEMENT ANALYSIS
// =============================================================================

export interface ElementAnalysis {
  /** Target element */
  target: HTMLElement;
  /** Nearest repeating container */
  container: HTMLElement | null;
  /** Container type */
  containerType: ContainerType;
  /** Anchor candidates for dynamic matching */
  anchorCandidates: AnchorCandidate[];
  /** Target selector relative to container */
  relativeSelector: string;
  /** Minimal selector for target (fallback) */
  minimalSelector: string;
}

export type ContainerType = 
  | 'table'    // Table row (tr)
  | 'list'     // List item (li, ol, ul)
  | 'grid'     // Grid/flex item
  | 'card'     // Card container
  | 'single';  // No repeating container

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
  /** Confidence score (0-1) */
  confidence: number;
  /** Is this a unique identifier? */
  isUnique: boolean;
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

// =============================================================================
// RECORDING STATE
// =============================================================================

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
  analysis: ElementAnalysis | null;
  /** Draft selector being built */
  selectorDraft: SelectorDraft | null;
  /** Recorded actions */
  recordedActions: RecordedAction[];
}

export interface RecordedAction {
  /** Action type */
  type: 'click' | 'input' | 'select' | 'scroll';
  /** Timestamp */
  timestamp: number;
  /** Target element analysis */
  elementAnalysis: ElementAnalysis;
  /** Input value (for input actions) */
  value?: string;
  /** Screenshot data URL (optional) */
  screenshot?: string;
}
