/**
 * =============================================================================
 * Homura - Selector Builder Module
 * =============================================================================
 * 
 * Unified export for selector building functionality
 */

// Types
export type {
  ElementAnalysis,
  ContainerType,
  AnchorCandidate,
  SelectorDraft,
  ValidationResult,
  RecordingState,
  RecordedAction,
  // Path-based selector types (new)
  AncestorInfo,
  PathSelector,
} from './types';

// Analyzer
export {
  analyzeElement,
  findRepeatingContainer,
  findAnchorCandidates,
  buildMinimalSelector,
  buildRelativeSelector,
  getElementHtml,
  getContainerContext,
  // Path-based selector functions (new)
  collectAncestorPath,
  buildPathSelector,
} from './analyzer';

// Generator
export {
  generateSelectorLogic,
  createSelectorDraft,
  draftToSelectorLogic,
  generateSelectorStrategies,
} from './generator';

// Validator
export {
  validateSelectorDraft,
  validateSelectorLogic,
  isValidCssSelector,
  countMatches,
  findTargetElement,
  getScopePreview,
} from './validator';
