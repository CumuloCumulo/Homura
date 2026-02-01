/**
 * Homura Engine - Public API
 */

export { 
  executeTool,
  executeUnifiedSelector,
  executeUnifiedSelectorDirect,
} from './executor';
export { 
  highlightElement, 
  removeHighlight, 
  clearAllHighlights,
  highlightScope,
  highlightAnchor,
  highlightTarget,
  flashElement,
} from './highlighter';
export {
  executeClick,
  executeInput,
  executeExtractText,
  executeWaitFor,
  executeNavigate,
} from './primitives';
