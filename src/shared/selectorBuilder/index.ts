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
