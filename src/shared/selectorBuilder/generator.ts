/**
 * =============================================================================
 * Homura - Selector Generator
 * =============================================================================
 * 
 * Generates Scope + Anchor + Target selector logic from element analysis
 */

import type { SelectorLogic, SelectorScope, SelectorAnchor, SelectorTarget, PrimitiveAction } from '@shared/types';
import type { ElementAnalysis, SelectorDraft, AnchorCandidate } from './types';
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
  
  // Use targetSelector if available, otherwise fall back to relativeSelector or minimalSelector
  const targetSelector = analysis.targetSelector || analysis.relativeSelector || analysis.minimalSelector;
  
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
    strategies.push({
      scope,
      target: {
        selector: analysis.relativeSelector || analysis.targetSelector || analysis.minimalSelector,
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
