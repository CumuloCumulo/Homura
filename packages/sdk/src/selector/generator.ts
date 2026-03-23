/**
 * =============================================================================
 * Homura SDK - Selector Generator
 * =============================================================================
 *
 * Generates Scope + Anchor + Target selector logic from element analysis.
 * Also provides converters to/from UnifiedSelector.
 */

import {
  generateSelectorId,
  buildFullSelectorFromPath,
  buildFullSelectorFromStructure,
  type SelectorLogic,
  type SelectorScope,
  type SelectorAnchor,
  type SelectorTarget,
  type PrimitiveAction,
  type UnifiedSelector,
  type SelectorStrategy,
  type PathStrategyData,
  type StructureStrategyData,
} from '../types/index.js';
import type {
  ElementAnalysis,
  SelectorDraft,
  AnchorCandidate,
  PathSelector,
} from './types.js';
import { buildMinimalSelector } from './analyzer.js';

/**
 * Generate a complete selector logic from element analysis
 */
export function generateSelectorLogic(
  analysis: ElementAnalysis,
  options: {
    action: PrimitiveAction;
    anchorValue?: string;
    preferredAnchor?: AnchorCandidate;
  },
): SelectorLogic {
  const { action, anchorValue, preferredAnchor } = options;

  const hasContainer = !!(
    analysis.container ||
    analysis.containerSelector ||
    analysis.containerTagName
  );

  if (!hasContainer) {
    return {
      target: {
        selector: analysis.minimalSelector,
        action,
      },
    };
  }

  const scope = buildScope(analysis);
  const anchor = buildAnchor(analysis, preferredAnchor, anchorValue);
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
  let selector = '';

  if (analysis.containerSelector) {
    selector = analysis.containerSelector;
  } else if (
    analysis.container &&
    typeof analysis.container.tagName === 'string'
  ) {
    const container = analysis.container;
    const parent = container.parentElement;

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
    if (analysis.containerType === 'table') {
      selector = 'tr';
    } else if (analysis.containerType === 'list') {
      selector = 'li';
    } else {
      selector = analysis.containerTagName;
    }
  } else {
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
  anchorValue?: string,
): SelectorAnchor | undefined {
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
function buildTarget(
  analysis: ElementAnalysis,
  action: PrimitiveAction,
): SelectorTarget {
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
  action: PrimitiveAction = 'CLICK',
): SelectorDraft {
  const hasContainer = !!(
    analysis.container ||
    analysis.containerSelector ||
    analysis.containerTagName
  );
  const topAnchor = analysis.anchorCandidates?.[0];

  const isSelfTarget = hasContainer && !analysis.relativeSelector;

  const targetSelector = isSelfTarget
    ? ''
    : analysis.targetSelector ||
      analysis.relativeSelector ||
      analysis.minimalSelector;

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
      matchCount: 0,
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
  action: PrimitiveAction = 'CLICK',
): SelectorLogic[] {
  const strategies: SelectorLogic[] = [];

  const hasContainer = !!(
    analysis.container ||
    analysis.containerSelector ||
    analysis.containerTagName
  );

  strategies.push({
    target: {
      selector: analysis.minimalSelector,
      action,
    },
  });

  if (hasContainer) {
    const scope = buildScope(analysis);
    const isSelfTarget = !analysis.relativeSelector;
    strategies.push({
      scope,
      target: {
        selector: isSelfTarget
          ? ''
          : analysis.relativeSelector ||
            analysis.targetSelector ||
            analysis.minimalSelector,
        action,
      },
    });
  }

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
 */
export function determineStrategy(analysis: ElementAnalysis): SelectorStrategy {
  const hasRepeatingStructure = analysis.containerType !== 'single';
  const hasAnchorCandidates =
    analysis.anchorCandidates && analysis.anchorCandidates.length > 0;

  const isStructuredContainer =
    analysis.containerType === 'table' ||
    analysis.containerType === 'list' ||
    analysis.containerType === 'card' ||
    analysis.containerType === 'grid';

  if (hasRepeatingStructure && isStructuredContainer && hasAnchorCandidates) {
    return 'scope_anchor_target';
  }

  if (analysis.ancestorPath && analysis.ancestorPath.length > 0) {
    return 'path';
  }

  return 'direct';
}

/**
 * Build PathStrategyData from ElementAnalysis
 */
export function buildPathData(
  analysis: ElementAnalysis,
): PathStrategyData | undefined {
  if (!analysis.ancestorPath || analysis.ancestorPath.length === 0) {
    return undefined;
  }

  let rootIndex = analysis.ancestorPath.findIndex((a) => a.isSemanticRoot);
  if (rootIndex === -1) {
    let maxScore = 0;
    analysis.ancestorPath.forEach((a, i) => {
      if (a.semanticScore > maxScore) {
        maxScore = a.semanticScore;
        rootIndex = i;
      }
    });
  }

  if (
    rootIndex === -1 ||
    analysis.ancestorPath[rootIndex].semanticScore < 0.3
  ) {
    return undefined;
  }

  const root = analysis.ancestorPath[rootIndex].selector;
  const intermediates: string[] = [];

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
export function buildStructureData(
  analysis: ElementAnalysis,
): StructureStrategyData | undefined {
  const hasContainer = !!(
    analysis.container ||
    analysis.containerSelector ||
    analysis.containerTagName
  );

  if (!hasContainer) {
    return undefined;
  }

  const scopeData = buildScope(analysis);
  const topAnchor = analysis.anchorCandidates?.[0];

  const isSelfTarget = !analysis.relativeSelector;

  const structureData: StructureStrategyData = {
    scope: {
      selector: scopeData.selector,
      type: scopeData.type,
    },
    target: {
      selector: isSelfTarget
        ? ''
        : analysis.relativeSelector ||
          analysis.targetSelector ||
          analysis.minimalSelector,
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
 */
export function createUnifiedSelector(
  analysis: ElementAnalysis,
  action: PrimitiveAction = 'CLICK',
  forceStrategy?: SelectorStrategy,
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
        confidence =
          analysis.ancestorPath?.find((a) => a.isSemanticRoot)?.semanticScore ||
          0.7;
      } else {
        fullSelector =
          analysis.pathSelector ||
          analysis.scopedSelector ||
          analysis.minimalSelector;
        confidence = 0.5;
      }
      break;

    case 'scope_anchor_target':
      structureData = buildStructureData(analysis);
      if (structureData) {
        fullSelector = buildFullSelectorFromStructure(structureData);
        confidence = structureData.anchor ? 0.85 : 0.7;
      } else {
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
  action: PrimitiveAction = 'CLICK',
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
  confidence = 0.7,
): UnifiedSelector {
  const hasScope = !!logic.scope;
  const strategy: SelectorStrategy = hasScope
    ? 'scope_anchor_target'
    : 'direct';

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
 * Convert UnifiedSelector back to SelectorLogic
 */
export function convertUnifiedToSelectorLogic(
  unified: UnifiedSelector,
): SelectorLogic {
  const logic: SelectorLogic = {
    target: {
      selector:
        unified.structureData?.target.selector ||
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
 * Convert UnifiedSelector to SelectorDraft
 * @deprecated Use UnifiedSelector directly in UI when possible
 */
export function convertUnifiedToSelectorDraft(
  unified: UnifiedSelector,
): SelectorDraft {
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

    draft.target.selector = unified.structureData.target.selector;
  }

  return draft;
}
