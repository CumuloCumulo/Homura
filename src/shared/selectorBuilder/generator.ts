/**
 * =============================================================================
 * Homura - Selector Generator
 * =============================================================================
 * 
 * Generates Scope + Anchor + Target selector logic from element analysis
 * Also provides converters to/from UnifiedSelector
 */

import type { 
  SelectorLogic, 
  SelectorScope, 
  SelectorAnchor, 
  SelectorTarget, 
  PrimitiveAction,
  UnifiedSelector,
  SelectorStrategy,
  PathStrategyData,
  StructureStrategyData,
} from '@shared/types';
import { 
  generateSelectorId,
  buildFullSelectorFromPath,
  buildFullSelectorFromStructure,
} from '@shared/types';
import type { ElementAnalysis, SelectorDraft, AnchorCandidate, PathSelector } from './types';
import { buildMinimalSelector } from './analyzer';

/**
 * Generate a complete selector logic from element analysis
 */
export function generateSelectorLogic(
  analysis: ElementAnalysis,
  options: {
    action: PrimitiveAction;
    anchorValue?: string;
    preferredAnchor?: AnchorCandidate;
  }
): SelectorLogic {
  const { action, anchorValue, preferredAnchor } = options;
  
  // Check for container using serializable fields (works across Chrome messaging)
  const hasContainer = !!(analysis.container || analysis.containerSelector || analysis.containerTagName);
  
  // If no container found, return simple target-only logic
  if (!hasContainer) {
    return {
      target: {
        selector: analysis.minimalSelector,
        action,
      },
    };
  }
  
  // Build scope
  const scope = buildScope(analysis);
  
  // Build anchor (if we have candidates)
  const anchor = buildAnchor(analysis, preferredAnchor, anchorValue);
  
  // Build target
  const target = buildTarget(analysis, action);
  
  return {
    scope,
    anchor,
    target,
  };
}

/**
 * Build scope from container analysis
 * 
 * Note: This function may be called with analysis from Chrome messaging,
 * where container is not a real HTMLElement (DOM methods are lost).
 * We use containerSelector and containerTagName for serialized data.
 */
function buildScope(analysis: ElementAnalysis): SelectorScope {
  let selector = '';
  
  // Prefer using serialized container data (works across Chrome messaging)
  if (analysis.containerSelector) {
    selector = analysis.containerSelector;
  } else if (analysis.container && typeof analysis.container.tagName === 'string') {
    // Fallback: container is a real HTMLElement (same context)
    const container = analysis.container;
    const parent = container.parentElement;
    
    // Build selector for the container pattern
    if (analysis.containerType === 'table') {
      const table = container.closest('table') as HTMLElement | null;
      if (table) {
        const tableSelector = buildMinimalSelector(table);
        selector = `${tableSelector} tbody tr`;
      } else {
        selector = 'tr';
      }
    } else if (analysis.containerType === 'list') {
      const list = container.closest('ul, ol') as HTMLElement | null;
      if (list) {
        const listSelector = buildMinimalSelector(list);
        selector = `${listSelector} li`;
      } else {
        selector = 'li';
      }
    } else {
      selector = buildMinimalSelector(container);
      
      if (parent) {
        const parentSelector = buildMinimalSelector(parent as HTMLElement);
        if (parentSelector.includes('.') || parentSelector.includes('[')) {
          selector = `${parentSelector} > ${container.tagName.toLowerCase()}`;
        }
      }
    }
  } else if (analysis.containerTagName) {
    // Fallback: use serialized tag name
    if (analysis.containerType === 'table') {
      selector = 'tr';
    } else if (analysis.containerType === 'list') {
      selector = 'li';
    } else {
      selector = analysis.containerTagName;
    }
  } else {
    // Ultimate fallback
    selector = '*';
  }
  
  return {
    type: 'container_list',
    selector,
  };
}

/**
 * Build anchor from candidates
 */
function buildAnchor(
  analysis: ElementAnalysis,
  preferredAnchor?: AnchorCandidate,
  anchorValue?: string
): SelectorAnchor | undefined {
  // Use preferred anchor if provided
  const anchor = preferredAnchor || analysis.anchorCandidates[0];
  
  if (!anchor) return undefined;
  
  if (anchor.type === 'text_match') {
    return {
      type: 'text_match',
      selector: anchor.selector,
      value: anchorValue || anchor.text || '{{value}}',
      matchMode: 'contains',
    };
  } else {
    return {
      type: 'attribute_match',
      selector: anchor.selector,
      attribute: anchor.attribute?.name,
      value: anchorValue || anchor.attribute?.value || '{{value}}',
      matchMode: 'exact',
    };
  }
}

/**
 * Build target from analysis
 */
function buildTarget(analysis: ElementAnalysis, action: PrimitiveAction): SelectorTarget {
  return {
    selector: analysis.relativeSelector || analysis.minimalSelector,
    action,
  };
}

/**
 * Create a selector draft for preview/editing
 * 
 * Note: analysis may come from Chrome messaging where HTMLElement objects are lost.
 * We check for containerSelector/containerTagName as indicators of container presence.
 */
export function createSelectorDraft(
  analysis: ElementAnalysis,
  action: PrimitiveAction = 'CLICK'
): SelectorDraft {
  // Check for container using serializable fields (works across Chrome messaging)
  const hasContainer = !!(analysis.container || analysis.containerSelector || analysis.containerTagName);
  const topAnchor = analysis.anchorCandidates?.[0];
  
  // CRITICAL: Check if target IS the container (self-targeting)
  // When relativeSelector is empty and we have a container, target is the container itself
  const isSelfTarget = hasContainer && !analysis.relativeSelector;
  
  // Use targetSelector if available, otherwise fall back to relativeSelector or minimalSelector
  // BUT: if self-targeting, use empty string to signal "return scope element as target"
  const targetSelector = isSelfTarget 
    ? ''  // Empty string signals: use scope element as target
    : (analysis.targetSelector || analysis.relativeSelector || analysis.minimalSelector);
  
  const draft: SelectorDraft = {
    target: {
      selector: targetSelector,
      action,
    },
    confidence: hasContainer ? 0.8 : 0.5,
    validated: false,
  };
  
  if (hasContainer) {
    const scope = buildScope(analysis);
    draft.scope = {
      ...scope,
      matchCount: 0, // To be filled by validation
    };
    
    if (topAnchor) {
      draft.anchor = {
        selector: topAnchor.selector,
        type: topAnchor.type,
        value: topAnchor.text || topAnchor.attribute?.value || '',
        matchMode: 'contains',
      };
    }
  }
  
  return draft;
}

/**
 * Convert draft to final selector logic
 */
export function draftToSelectorLogic(draft: SelectorDraft): SelectorLogic {
  const logic: SelectorLogic = {
    target: {
      selector: draft.target.selector,
      action: draft.target.action as PrimitiveAction,
    },
  };
  
  if (draft.scope) {
    logic.scope = {
      type: draft.scope.type,
      selector: draft.scope.selector,
    };
  }
  
  if (draft.anchor) {
    logic.anchor = {
      type: draft.anchor.type,
      selector: draft.anchor.selector,
      value: draft.anchor.value,
      matchMode: draft.anchor.matchMode,
    };
  }
  
  return logic;
}

/**
 * Generate multiple selector strategies for comparison
 */
export function generateSelectorStrategies(
  analysis: ElementAnalysis,
  action: PrimitiveAction = 'CLICK'
): SelectorLogic[] {
  const strategies: SelectorLogic[] = [];
  
  // Check for container using serializable fields (works across Chrome messaging)
  const hasContainer = !!(analysis.container || analysis.containerSelector || analysis.containerTagName);
  
  // Strategy 1: Simple target (no scope/anchor)
  strategies.push({
    target: {
      selector: analysis.minimalSelector,
      action,
    },
  });
  
  // Strategy 2: With scope but no anchor
  if (hasContainer) {
    const scope = buildScope(analysis);
    // Check for self-targeting (target IS the container)
    const isSelfTarget = !analysis.relativeSelector;
    strategies.push({
      scope,
      target: {
        // Empty string signals: use scope element as target
        selector: isSelfTarget ? '' : (analysis.relativeSelector || analysis.targetSelector || analysis.minimalSelector),
        action,
      },
    });
  }
  
  // Strategy 3+: With different anchor candidates
  if (hasContainer && analysis.anchorCandidates?.length > 0) {
    for (const anchor of analysis.anchorCandidates.slice(0, 3)) {
      const logic = generateSelectorLogic(analysis, {
        action,
        preferredAnchor: anchor,
      });
      strategies.push(logic);
    }
  }
  
  return strategies;
}

// =============================================================================
// UNIFIED SELECTOR CONVERTERS
// =============================================================================

/**
 * Determine the best strategy for an element analysis
 * This uses the same logic as SmartRouter but is self-contained
 * 
 * Strategy Priority:
 * 1. scope_anchor_target: For repeating structures (table, list, card, grid) with anchors
 * 2. path: For single elements with semantic ancestor path
 * 3. direct: Fallback for simple elements
 */
export function determineStrategy(analysis: ElementAnalysis): SelectorStrategy {
  const hasRepeatingStructure = analysis.containerType !== 'single';
  const hasAnchorCandidates = analysis.anchorCandidates && analysis.anchorCandidates.length > 0;
  
  // Rule: Use scope_anchor_target for ALL repeating structures with anchors
  // This includes: table, list, card, grid (Tailwind Grid/Flex layouts)
  const isStructuredContainer = 
    analysis.containerType === 'table' || 
    analysis.containerType === 'list' ||
    analysis.containerType === 'card' ||
    analysis.containerType === 'grid';
  
  if (hasRepeatingStructure && isStructuredContainer && hasAnchorCandidates) {
    return 'scope_anchor_target';
  }
  
  // Rule: Use path for single elements or elements with ancestor path
  if (analysis.ancestorPath && analysis.ancestorPath.length > 0) {
    return 'path';
  }
  
  // Fallback: direct selector
  return 'direct';
}

/**
 * Build PathStrategyData from ElementAnalysis
 */
export function buildPathData(analysis: ElementAnalysis): PathStrategyData | undefined {
  if (!analysis.ancestorPath || analysis.ancestorPath.length === 0) {
    return undefined;
  }
  
  // Find semantic root (highest score or isSemanticRoot)
  let rootIndex = analysis.ancestorPath.findIndex(a => a.isSemanticRoot);
  if (rootIndex === -1) {
    let maxScore = 0;
    analysis.ancestorPath.forEach((a, i) => {
      if (a.semanticScore > maxScore) {
        maxScore = a.semanticScore;
        rootIndex = i;
      }
    });
  }
  
  if (rootIndex === -1 || analysis.ancestorPath[rootIndex].semanticScore < 0.3) {
    return undefined;
  }
  
  const root = analysis.ancestorPath[rootIndex].selector;
  const intermediates: string[] = [];
  
  // Add intermediate nodes with decent semantic value
  for (let i = rootIndex - 1; i >= 0; i--) {
    const ancestor = analysis.ancestorPath[i];
    if (ancestor.semanticScore >= 0.5) {
      intermediates.push(ancestor.selector);
    }
  }
  
  const target = analysis.targetSelector || analysis.minimalSelector;
  
  return {
    root,
    intermediates,
    target,
  };
}

/**
 * Build StructureStrategyData from ElementAnalysis
 */
export function buildStructureData(analysis: ElementAnalysis): StructureStrategyData | undefined {
  const hasContainer = !!(analysis.container || analysis.containerSelector || analysis.containerTagName);
  
  if (!hasContainer) {
    return undefined;
  }
  
  const scopeData = buildScope(analysis);
  const topAnchor = analysis.anchorCandidates?.[0];
  
  // CRITICAL: Check if target IS the container (self-targeting)
  // When relativeSelector is empty, target is the container itself
  const isSelfTarget = !analysis.relativeSelector;
  
  const structureData: StructureStrategyData = {
    scope: {
      selector: scopeData.selector,
      type: scopeData.type,
    },
    target: {
      // Empty string signals: use scope element as target (self-targeting)
      selector: isSelfTarget ? '' : (analysis.relativeSelector || analysis.targetSelector || analysis.minimalSelector),
    },
  };
  
  if (topAnchor) {
    structureData.anchor = {
      selector: topAnchor.selector,
      type: topAnchor.type,
      value: topAnchor.text || topAnchor.attribute?.value || '',
      matchMode: 'contains',
    };
  }
  
  return structureData;
}

/**
 * Convert ElementAnalysis to UnifiedSelector
 * 
 * This is the primary converter that bridges DOM analysis with the unified data model.
 * It automatically determines the best strategy and populates the appropriate data fields.
 * 
 * @param analysis - The element analysis from analyzeElement()
 * @param action - The action to perform (default: CLICK)
 * @param forceStrategy - Optional: force a specific strategy instead of auto-detecting
 */
export function createUnifiedSelector(
  analysis: ElementAnalysis,
  action: PrimitiveAction = 'CLICK',
  forceStrategy?: SelectorStrategy
): UnifiedSelector {
  const strategy = forceStrategy || determineStrategy(analysis);
  
  let fullSelector: string;
  let pathData: PathStrategyData | undefined;
  let structureData: StructureStrategyData | undefined;
  let confidence = 0.5;
  
  switch (strategy) {
    case 'path':
      pathData = buildPathData(analysis);
      if (pathData) {
        fullSelector = buildFullSelectorFromPath(pathData);
        confidence = analysis.ancestorPath?.find(a => a.isSemanticRoot)?.semanticScore || 0.7;
      } else {
        // Fallback if path data couldn't be built
        fullSelector = analysis.pathSelector || analysis.scopedSelector || analysis.minimalSelector;
        confidence = 0.5;
      }
      break;
      
    case 'scope_anchor_target':
      structureData = buildStructureData(analysis);
      if (structureData) {
        fullSelector = buildFullSelectorFromStructure(structureData);
        confidence = structureData.anchor ? 0.85 : 0.7;
      } else {
        // Fallback if structure data couldn't be built
        fullSelector = analysis.scopedSelector || analysis.minimalSelector;
        confidence = 0.5;
      }
      break;
      
    case 'direct':
    default:
      fullSelector = analysis.scopedSelector || analysis.minimalSelector;
      confidence = 0.5;
      break;
  }
  
  return {
    id: generateSelectorId(),
    strategy,
    fullSelector,
    pathData,
    structureData,
    action: {
      type: action,
    },
    confidence,
    validated: false,
    metadata: {
      source: 'programmatic',
      createdAt: Date.now(),
    },
  };
}

/**
 * Convert PathSelector (legacy AI result) to UnifiedSelector
 */
export function convertPathSelectorToUnified(
  pathSelector: PathSelector,
  action: PrimitiveAction = 'CLICK'
): UnifiedSelector {
  return {
    id: generateSelectorId(),
    strategy: 'path',
    fullSelector: pathSelector.fullSelector,
    pathData: {
      root: pathSelector.root,
      intermediates: pathSelector.path,
      target: pathSelector.target,
    },
    action: {
      type: action,
    },
    confidence: pathSelector.confidence,
    validated: false,
    reasoning: pathSelector.reasoning,
    metadata: {
      source: 'ai',
      createdAt: Date.now(),
    },
  };
}

/**
 * Convert SelectorLogic (legacy execution format) to UnifiedSelector
 */
export function convertSelectorLogicToUnified(
  logic: SelectorLogic,
  confidence = 0.7
): UnifiedSelector {
  const hasScope = !!logic.scope;
  const strategy: SelectorStrategy = hasScope ? 'scope_anchor_target' : 'direct';
  
  let fullSelector: string;
  let structureData: StructureStrategyData | undefined;
  
  if (hasScope && logic.scope) {
    structureData = {
      scope: {
        selector: logic.scope.selector,
        type: logic.scope.type,
      },
      target: {
        selector: logic.target.selector,
      },
    };
    
    if (logic.anchor) {
      structureData.anchor = {
        selector: logic.anchor.selector,
        type: logic.anchor.type === 'index' ? 'text_match' : logic.anchor.type,
        value: logic.anchor.value,
        matchMode: logic.anchor.matchMode || 'contains',
      };
    }
    
    fullSelector = `${logic.scope.selector} ${logic.target.selector}`;
  } else {
    fullSelector = logic.target.selector;
  }
  
  return {
    id: generateSelectorId(),
    strategy,
    fullSelector,
    structureData,
    action: {
      type: logic.target.action,
      params: logic.target.actionParams,
    },
    confidence,
    validated: false,
    metadata: {
      source: 'programmatic',
      createdAt: Date.now(),
    },
  };
}

/**
 * Convert UnifiedSelector back to SelectorLogic (for legacy executor compatibility)
 */
export function convertUnifiedToSelectorLogic(unified: UnifiedSelector): SelectorLogic {
  const logic: SelectorLogic = {
    target: {
      selector: unified.structureData?.target.selector || 
                unified.pathData?.target || 
                unified.fullSelector,
      action: unified.action.type,
      actionParams: unified.action.params,
    },
  };
  
  if (unified.strategy === 'scope_anchor_target' && unified.structureData) {
    logic.scope = {
      type: unified.structureData.scope.type,
      selector: unified.structureData.scope.selector,
    };
    
    if (unified.structureData.anchor) {
      logic.anchor = {
        type: unified.structureData.anchor.type,
        selector: unified.structureData.anchor.selector,
        value: unified.structureData.anchor.value,
        matchMode: unified.structureData.anchor.matchMode,
      };
    }
  }
  
  return logic;
}

/**
 * Convert UnifiedSelector to SelectorDraft (for legacy UI compatibility)
 * @deprecated Use UnifiedSelector directly in UI when possible
 */
export function convertUnifiedToSelectorDraft(unified: UnifiedSelector): SelectorDraft {
  const draft: SelectorDraft = {
    target: {
      selector: unified.fullSelector,
      action: unified.action.type,
    },
    confidence: unified.confidence,
    validated: unified.validated,
  };
  
  if (unified.strategy === 'scope_anchor_target' && unified.structureData) {
    draft.scope = {
      selector: unified.structureData.scope.selector,
      type: unified.structureData.scope.type,
      matchCount: 0,
    };
    
    if (unified.structureData.anchor) {
      draft.anchor = {
        selector: unified.structureData.anchor.selector,
        type: unified.structureData.anchor.type,
        value: unified.structureData.anchor.value,
        matchMode: unified.structureData.anchor.matchMode,
      };
    }
    
    // Use the relative target selector for structure mode
    draft.target.selector = unified.structureData.target.selector;
  }
  
  return draft;
}
