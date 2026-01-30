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
  
  // If no container found, return simple target-only logic
  if (!analysis.container) {
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
 */
function buildScope(analysis: ElementAnalysis): SelectorScope {
  const container = analysis.container!;
  const parent = container.parentElement;
  
  let selector = '';
  
  // Build selector for the container pattern
  if (analysis.containerType === 'table') {
    // For table rows, find the table
    const table = container.closest('table') as HTMLElement | null;
    if (table) {
      const tableSelector = buildMinimalSelector(table);
      selector = `${tableSelector} tbody tr`;
    } else {
      selector = 'tr';
    }
  } else if (analysis.containerType === 'list') {
    // For list items, find the list
    const list = container.closest('ul, ol') as HTMLElement | null;
    if (list) {
      const listSelector = buildMinimalSelector(list);
      selector = `${listSelector} li`;
    } else {
      selector = 'li';
    }
  } else {
    // For other containers, use the container's selector
    selector = buildMinimalSelector(container);
    
    // If parent has a recognizable pattern, use it
    if (parent) {
      const parentSelector = buildMinimalSelector(parent as HTMLElement);
      if (parentSelector.includes('.') || parentSelector.includes('[')) {
        selector = `${parentSelector} > ${container.tagName.toLowerCase()}`;
      }
    }
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
 */
export function createSelectorDraft(
  analysis: ElementAnalysis,
  action: PrimitiveAction = 'CLICK'
): SelectorDraft {
  const hasContainer = !!analysis.container;
  const topAnchor = analysis.anchorCandidates[0];
  
  const draft: SelectorDraft = {
    target: {
      selector: analysis.relativeSelector || analysis.minimalSelector,
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
  
  // Strategy 1: Simple target (no scope/anchor)
  strategies.push({
    target: {
      selector: analysis.minimalSelector,
      action,
    },
  });
  
  // Strategy 2: With scope but no anchor
  if (analysis.container) {
    const scope = buildScope(analysis);
    strategies.push({
      scope,
      target: {
        selector: analysis.relativeSelector,
        action,
      },
    });
  }
  
  // Strategy 3+: With different anchor candidates
  if (analysis.container && analysis.anchorCandidates.length > 0) {
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
