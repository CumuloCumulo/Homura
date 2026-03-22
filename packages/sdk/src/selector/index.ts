/**
 * =============================================================================
 * Homura SDK - Selector Module
 * =============================================================================
 *
 * Main export for the selector builder module.
 */

// Types
export * from "./types.js";

// Analyzer
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
  BROWSER_REQUIRED as SELECTOR_BROWSER_REQUIRED,
} from "./analyzer.js";

// Validator
export {
  validateSelectorDraft,
  validateSelectorLogic,
  isValidCssSelector,
  countMatches,
  findTargetElement,
  getScopePreview,
  BROWSER_REQUIRED as VALIDATOR_BROWSER_REQUIRED,
} from "./validator.js";

// Generator
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
} from "./generator.js";

// Helper functions from types (for selector building)
export {
  generateSelectorId,
  buildFullSelectorFromPath,
  buildFullSelectorFromStructure,
} from "../types/selector.js";
