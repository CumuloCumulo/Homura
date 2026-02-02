/**
 * =============================================================================
 * Homura - Atomic Tool Executor
 * =============================================================================
 * 
 * The core execution engine that parses and runs Atomic Tools.
 * 
 * Execution Flow:
 * 1. Scope Resolution: Find container elements (if defined)
 * 2. Anchor Matching: Locate specific container based on anchor criteria
 * 3. Target Selection: Find target element within context
 * 4. Action Execution: Run the primitive action
 * 
 * This module is STATELESS - it receives a tool definition and returns a result.
 */

import type {
  AtomicTool,
  SelectorLogic,
  SelectorScope,
  SelectorAnchor,
  SelectorTarget,
  ExecuteToolResult,
  ExecutionError,
  InputParams,
  ExtractTextParams,
  WaitForParams,
  NavigateParams,
  ClickParams,
  UnifiedSelector,
} from '@shared/types';
import { substituteVariables, matchText, getDOMSnapshot, safeQuerySelectorAll, safeQuerySelector, sleep } from '@shared/utils';
import { convertUnifiedToSelectorLogic } from '@shared/selectorBuilder';

// Import primitive executors
import { 
  executeClick, 
  executeInput, 
  executeExtractText, 
  executeWaitFor,
  executeNavigate 
} from './primitives';

// Import debug highlighter
import { 
  highlightScope, 
  highlightAnchor, 
  highlightTarget, 
  flashElement,
  clearAllHighlights 
} from './highlighter';

interface ExecutorOptions {
  /** Enable debug mode with visual highlights */
  debug?: boolean;
  /** Delay between steps in debug mode (ms) */
  debugDelay?: number;
}

/**
 * Execute an Atomic Tool
 * 
 * @param tool - The atomic tool definition
 * @param params - Parameter values for variable substitution
 * @param options - Executor options
 */
export async function executeTool(
  tool: AtomicTool,
  params: Record<string, string | number | boolean>,
  options: ExecutorOptions = {}
): Promise<ExecuteToolResult> {
  const startTime = performance.now();
  const { debug = false, debugDelay = 500 } = options;

  console.log(`[Homura] Executing tool: ${tool.name}`, { params, debug });

  // Clear any existing highlights
  if (debug) {
    clearAllHighlights();
  }

  try {
    // Substitute variables in selector logic
    const resolvedLogic = resolveVariables(tool.selector_logic, params);
    
    // Execute the selector logic
    const result = await executeSelectionLogic(resolvedLogic, { debug, debugDelay });
    
    const duration = Math.round(performance.now() - startTime);
    
    return {
      success: true,
      data: result.data,
      metadata: {
        duration,
        scopeMatchCount: result.scopeMatchCount,
        anchorMatchIndex: result.anchorMatchIndex,
      },
    };
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    
    if (isExecutionError(error)) {
      console.error(`[Homura] Execution error:`, error);
      return {
        success: false,
        error,
        metadata: { duration },
      };
    }
    
    // Wrap unexpected errors
    const executionError: ExecutionError = {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : String(error),
    };
    
    console.error(`[Homura] Unexpected error:`, error);
    return {
      success: false,
      error: executionError,
      metadata: { duration },
    };
  }
}

/**
 * Execute the selection logic: Scope -> Anchor -> Target
 * 
 * ENHANCED: Supports "Virtual Composite Scope" for split table layouts (e.g., jqxGrid).
 * When multiple scope elements share the same ID (split table rows), they are treated
 * as a single logical row:
 * - Anchor can match in ANY of the scope elements with that ID
 * - Target is searched across ALL scope elements with the same ID
 */
async function executeSelectionLogic(
  logic: SelectorLogic,
  options: ExecutorOptions
): Promise<{ data?: string | string[]; scopeMatchCount?: number; anchorMatchIndex?: number }> {
  const { debug = false, debugDelay = 500 } = options;
  
  let context: Element | Document = document;
  let compositeScope: Element[] | null = null; // For split table support
  let scopeMatchCount: number | undefined;
  let anchorMatchIndex: number | undefined;

  // ==========================================================================
  // Step 1: Resolve Scope (if defined)
  // ==========================================================================
  if (logic.scope) {
    const scopeElements = resolveScopeElements(logic.scope);
    scopeMatchCount = scopeElements.length;
    
    if (scopeElements.length === 0) {
      throw createError(
        'SCOPE_NOT_FOUND',
        `No elements found for scope selector: ${logic.scope.selector}`,
        logic.scope.selector,
        document.body
      );
    }
    
    // Detect split table layout (multiple elements with same ID)
    const splitTableGroups = detectSplitTableGroups(scopeElements);
    const hasSplitTable = splitTableGroups !== null;
    
    console.log(`[Homura] Scope matched ${scopeElements.length} elements${hasSplitTable ? ' (split table detected)' : ''}`);
    
    if (debug) {
      highlightScope(scopeElements);
      await sleep(debugDelay);
    }

    // ==========================================================================
    // Step 2: Resolve Anchor (if defined)
    // ==========================================================================
    if (logic.anchor) {
      let matchedContext: { element: Element; index: number; compositeScope?: Element[] } | null = null;
      
      if (hasSplitTable) {
        // Split table mode: search across composite groups
        matchedContext = resolveAnchorInSplitTable(splitTableGroups!, logic.anchor);
      } else {
        // Normal mode: standard anchor resolution
        matchedContext = resolveAnchor(scopeElements, logic.anchor);
      }
      
      if (!matchedContext) {
        throw createError(
          'ANCHOR_NOT_FOUND',
          `No element matched anchor criteria: ${logic.anchor.value}`,
          logic.anchor.selector,
          scopeElements[0]
        );
      }
      
      context = matchedContext.element;
      anchorMatchIndex = matchedContext.index;
      
      // For split tables, save composite scope for target search
      if (matchedContext.compositeScope) {
        compositeScope = matchedContext.compositeScope;
        console.log(`[Homura] Using composite scope with ${compositeScope.length} elements for target search`);
      }
      
      console.log(`[Homura] Anchor matched at index ${anchorMatchIndex}`);
      
      if (debug) {
        highlightAnchor(context, anchorMatchIndex);
        await sleep(debugDelay);
      }
    } else {
      // No anchor defined - use first scope element as context
      context = scopeElements[0];
    }
  }

  // ==========================================================================
  // Step 3: Find and Execute Target
  // ==========================================================================
  const { target } = logic;
  let targetElement: HTMLElement | null = null;
  
  // CRITICAL: Handle self-targeting (empty target selector means scope IS the target)
  if (!target.selector || target.selector === '') {
    console.log('[Homura] Self-targeting: using context element as target');
    if (context instanceof Document) {
      throw createError(
        'TARGET_NOT_FOUND',
        'Self-targeting requires a scope context, not document',
        '',
        document.body
      );
    }
    targetElement = context as HTMLElement;
  } else if (compositeScope) {
    // For split tables, search across composite scope (all elements with same ID)
    targetElement = findTargetInCompositeScope(target.selector, compositeScope);
  } else {
    targetElement = findTarget(target.selector, context);
    
    // Fallback: if not found as descendant, check if context itself matches
    if (!targetElement && !(context instanceof Document)) {
      try {
        if ((context as Element).matches(target.selector)) {
          console.log('[Homura] Target selector matches context itself');
          targetElement = context as HTMLElement;
        }
      } catch {
        // Invalid selector, ignore
      }
    }
  }
  
  if (!targetElement) {
    throw createError(
      'TARGET_NOT_FOUND',
      `Target element not found: ${target.selector}`,
      target.selector,
      context instanceof Document ? document.body : context
    );
  }

  console.log(`[Homura] Target found, executing action: ${target.action}`);

  if (debug) {
    highlightTarget(targetElement);
    await sleep(debugDelay);
  }

  // Execute the action
  const result = await executeAction(targetElement, target);

  if (debug) {
    flashElement(targetElement, true);
  }

  return {
    data: result,
    scopeMatchCount,
    anchorMatchIndex,
  };
}

/**
 * Resolve scope selector to elements
 */
function resolveScopeElements(scope: SelectorScope): Element[] {
  const elements = safeQuerySelectorAll(scope.selector);
  return elements;
}

/**
 * Find the anchor-matched element within scope elements
 * 
 * FIXED: Now uses querySelectorAll to check ALL matching elements within each scope,
 * not just the first one. This fixes the issue where "安排教室" couldn't be found
 * when it's the second <a> element in a cell: <a>详情</a> | <a>安排教室</a>
 * 
 * @param scopeElements - Array of scope containers to search
 * @param anchor - Anchor configuration
 * @returns Matched element and its index, or null if not found
 */
function resolveAnchor(
  scopeElements: Element[],
  anchor: SelectorAnchor
): { element: Element; index: number } | null {
  for (let i = 0; i < scopeElements.length; i++) {
    const scopeEl = scopeElements[i];
    
    if (anchor.type === 'index') {
      // Index-based anchor
      const targetIndex = parseInt(anchor.value, 10);
      if (i === targetIndex) {
        return { element: scopeEl, index: i };
      }
    } else if (anchor.type === 'text_match') {
      // Text-based anchor - check ALL matching elements, not just the first
      // This fixes the bug where "安排教室" couldn't be found when preceded by "详情"
      const anchorCandidates = safeQuerySelectorAll(anchor.selector, scopeEl);
      
      for (const candidate of anchorCandidates) {
        const text = candidate.textContent || '';
        if (matchText(text, anchor.value, anchor.matchMode)) {
          console.log(`[Homura] Anchor matched: "${anchor.value}" in scope[${i}] (checked ${anchorCandidates.length} candidates)`);
          return { element: scopeEl, index: i };
        }
      }
    } else if (anchor.type === 'attribute_match') {
      // Attribute-based anchor - check ALL matching elements
      const anchorCandidates = safeQuerySelectorAll(anchor.selector, scopeEl);
      
      for (const candidate of anchorCandidates) {
        if (anchor.attribute) {
          const attrValue = candidate.getAttribute(anchor.attribute) || '';
          if (matchText(attrValue, anchor.value, anchor.matchMode)) {
            console.log(`[Homura] Anchor matched: [${anchor.attribute}="${anchor.value}"] in scope[${i}]`);
            return { element: scopeEl, index: i };
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Find target element within context
 */
function findTarget(selector: string, context: Element | Document): HTMLElement | null {
  if (context instanceof Document) {
    return safeQuerySelector<HTMLElement>(selector);
  }
  return safeQuerySelector<HTMLElement>(selector, context);
}

/**
 * Execute the primitive action on target element
 */
async function executeAction(
  element: HTMLElement,
  target: SelectorTarget
): Promise<string | string[] | undefined> {
  const { action, actionParams } = target;

  switch (action) {
    case 'CLICK':
      await executeClick(element, actionParams as ClickParams);
      return undefined;

    case 'INPUT':
      await executeInput(element, actionParams as InputParams);
      return undefined;

    case 'EXTRACT_TEXT':
      return executeExtractText(element, actionParams as ExtractTextParams);

    case 'WAIT_FOR':
      await executeWaitFor(target.selector, actionParams as WaitForParams);
      return undefined;

    case 'NAVIGATE':
      await executeNavigate(actionParams as NavigateParams);
      return undefined;

    default:
      throw createError('ACTION_FAILED', `Unknown action: ${action}`);
  }
}

/**
 * Substitute variables in selector logic
 */
function resolveVariables(
  logic: SelectorLogic,
  params: Record<string, string | number | boolean>
): SelectorLogic {
  const resolved: SelectorLogic = {
    target: {
      selector: substituteVariables(logic.target.selector, params),
      action: logic.target.action,
      actionParams: logic.target.actionParams,
    },
  };

  if (logic.scope) {
    resolved.scope = {
      type: logic.scope.type,
      selector: substituteVariables(logic.scope.selector, params),
    };
  }

  if (logic.anchor) {
    resolved.anchor = {
      type: logic.anchor.type,
      selector: substituteVariables(logic.anchor.selector, params),
      value: substituteVariables(logic.anchor.value, params),
      matchMode: logic.anchor.matchMode,
      attribute: logic.anchor.attribute,
    };
  }

  // Handle INPUT action value substitution
  if (logic.target.action === 'INPUT' && logic.target.actionParams) {
    const inputParams = logic.target.actionParams as InputParams;
    resolved.target.actionParams = {
      ...inputParams,
      value: substituteVariables(inputParams.value, params),
    };
  }

  return resolved;
}

/**
 * Create execution error with DOM snapshot
 */
function createError(
  code: ExecutionError['code'],
  message: string,
  failedSelector?: string,
  contextElement?: Element
): ExecutionError {
  return {
    code,
    message,
    failedSelector,
    domSnapshot: contextElement ? getDOMSnapshot(contextElement) : undefined,
  };
}

/**
 * Type guard for ExecutionError
 */
function isExecutionError(error: unknown): error is ExecutionError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

// =============================================================================
// UNIFIED SELECTOR EXECUTION
// =============================================================================

/**
 * Execute a UnifiedSelector
 * 
 * This is the new entry point for executing selectors that supports the unified
 * data model. It converts the UnifiedSelector to SelectorLogic and executes it.
 * 
 * @param selector - The unified selector to execute
 * @param params - Parameter values for variable substitution
 * @param options - Executor options
 */
export async function executeUnifiedSelector(
  selector: UnifiedSelector,
  params: Record<string, string | number | boolean> = {},
  options: ExecutorOptions = {}
): Promise<ExecuteToolResult> {
  const startTime = performance.now();
  const { debug = false, debugDelay = 500 } = options;

  console.log(`[Homura] Executing UnifiedSelector: ${selector.id}`, { 
    strategy: selector.strategy,
    fullSelector: selector.fullSelector,
    debug 
  });

  // Clear any existing highlights
  if (debug) {
    clearAllHighlights();
  }

  try {
    // Convert UnifiedSelector to SelectorLogic
    const selectorLogic = convertUnifiedToSelectorLogic(selector);
    
    // Substitute variables
    const resolvedLogic = resolveVariables(selectorLogic, params);
    
    // Execute the selector logic
    const result = await executeSelectionLogic(resolvedLogic, { debug, debugDelay });
    
    const duration = Math.round(performance.now() - startTime);
    
    return {
      success: true,
      data: result.data,
      metadata: {
        duration,
        scopeMatchCount: result.scopeMatchCount,
        anchorMatchIndex: result.anchorMatchIndex,
      },
    };
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    
    if (isExecutionError(error)) {
      console.error(`[Homura] UnifiedSelector execution error:`, error);
      return {
        success: false,
        error,
        metadata: { duration },
      };
    }
    
    // Wrap unexpected errors
    const executionError: ExecutionError = {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : String(error),
      failedSelector: selector.fullSelector,
    };
    
    console.error(`[Homura] Unexpected error:`, error);
    return {
      success: false,
      error: executionError,
      metadata: { duration },
    };
  }
}

// =============================================================================
// SPLIT TABLE SUPPORT (Virtual Composite Scope)
// =============================================================================

/**
 * Detect split table layout where multiple elements share the same ID.
 * This is common in legacy grid frameworks (jqxGrid, jQuery UI) that use
 * two separate tables for frozen columns.
 * 
 * @param scopeElements - Array of scope elements
 * @returns Map of ID -> Element[] if split table detected, null otherwise
 */
function detectSplitTableGroups(scopeElements: Element[]): Map<string, Element[]> | null {
  const idGroups = new Map<string, Element[]>();
  
  for (const el of scopeElements) {
    const id = el.id;
    if (!id) continue;
    
    if (!idGroups.has(id)) {
      idGroups.set(id, []);
    }
    idGroups.get(id)!.push(el);
  }
  
  // Check if any group has more than one element (duplicate IDs)
  const hasDuplicateIds = Array.from(idGroups.values()).some(group => group.length > 1);
  
  if (hasDuplicateIds) {
    console.log('[Homura] Split table layout detected:', 
      Array.from(idGroups.entries())
        .filter(([, els]) => els.length > 1)
        .map(([id, els]) => `${id}: ${els.length} elements`)
    );
    return idGroups;
  }
  
  return null;
}

/**
 * Resolve anchor in split table layout.
 * Searches across all elements in each composite group (rows with same ID).
 * 
 * @param groups - Map of ID -> Element[] representing row groups
 * @param anchor - Anchor configuration
 * @returns Matched element info with composite scope for cross-table target search
 */
function resolveAnchorInSplitTable(
  groups: Map<string, Element[]>,
  anchor: SelectorAnchor
): { element: Element; index: number; compositeScope: Element[] } | null {
  let groupIndex = 0;
  
  for (const [id, elements] of groups) {
    // Search for anchor across ALL elements in this composite group
    for (const scopeEl of elements) {
      // Handle different anchor types
      if (anchor.type === 'index') {
        const targetIndex = parseInt(anchor.value, 10);
        if (groupIndex === targetIndex) {
          return { element: scopeEl, index: groupIndex, compositeScope: elements };
        }
      } else if (anchor.type === 'text_match') {
        const anchorCandidates = safeQuerySelectorAll(anchor.selector, scopeEl);
        
        for (const candidate of anchorCandidates) {
          const text = candidate.textContent || '';
          if (matchText(text, anchor.value, anchor.matchMode)) {
            console.log(`[Homura] Split table anchor matched in group "${id}": "${anchor.value}"`);
            return {
              element: scopeEl,
              index: groupIndex,
              compositeScope: elements, // Return ALL elements in this row group
            };
          }
        }
      } else if (anchor.type === 'attribute_match' && anchor.attribute) {
        const anchorCandidates = safeQuerySelectorAll(anchor.selector, scopeEl);
        
        for (const candidate of anchorCandidates) {
          const attrValue = candidate.getAttribute(anchor.attribute) || '';
          if (matchText(attrValue, anchor.value, anchor.matchMode)) {
            console.log(`[Homura] Split table anchor matched in group "${id}": [${anchor.attribute}="${anchor.value}"]`);
            return {
              element: scopeEl,
              index: groupIndex,
              compositeScope: elements,
            };
          }
        }
      }
    }
    groupIndex++;
  }
  
  return null;
}

/**
 * Find target in composite scope (multiple elements).
 * Searches across all elements in the composite scope.
 * 
 * This enables finding targets in split table layouts where the anchor
 * is in one table (e.g., right table with names) and the target is in
 * another table (e.g., left table with action buttons).
 * 
 * @param selector - Target selector
 * @param compositeScope - Array of elements to search across
 * @returns First matching element or null
 */
function findTargetInCompositeScope(
  selector: string,
  compositeScope: Element[]
): HTMLElement | null {
  for (const scopeEl of compositeScope) {
    const target = safeQuerySelector<HTMLElement>(selector, scopeEl);
    if (target) {
      console.log(`[Homura] Target found in composite scope element:`, scopeEl.id || scopeEl.tagName);
      return target;
    }
  }
  return null;
}

/**
 * Quick execution of a UnifiedSelector using just the fullSelector string
 * 
 * This is useful for simple cases where you just need to find and act on an element
 * without the full Scope+Anchor+Target logic.
 * 
 * @param selector - The unified selector
 * @param options - Executor options
 */
export async function executeUnifiedSelectorDirect(
  selector: UnifiedSelector,
  options: ExecutorOptions = {}
): Promise<ExecuteToolResult> {
  const startTime = performance.now();
  const { debug = false, debugDelay = 500 } = options;

  console.log(`[Homura] Direct execution of UnifiedSelector: ${selector.fullSelector}`);

  if (debug) {
    clearAllHighlights();
  }

  try {
    const element = safeQuerySelector<HTMLElement>(selector.fullSelector);
    
    if (!element) {
      const error: ExecutionError = {
        code: 'TARGET_NOT_FOUND',
        message: `Element not found: ${selector.fullSelector}`,
        failedSelector: selector.fullSelector,
      };
      return {
        success: false,
        error,
        metadata: { duration: Math.round(performance.now() - startTime) },
      };
    }

    if (debug) {
      highlightTarget(element);
      await sleep(debugDelay);
    }

    // Execute action based on selector.action
    const target: SelectorTarget = {
      selector: selector.fullSelector,
      action: selector.action.type,
      actionParams: selector.action.params,
    };

    const result = await executeAction(element, target);

    if (debug) {
      flashElement(element, true);
    }

    const duration = Math.round(performance.now() - startTime);

    return {
      success: true,
      data: result,
      metadata: { duration },
    };
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    
    const executionError: ExecutionError = {
      code: 'ACTION_FAILED',
      message: error instanceof Error ? error.message : String(error),
      failedSelector: selector.fullSelector,
    };
    
    return {
      success: false,
      error: executionError,
      metadata: { duration },
    };
  }
}
