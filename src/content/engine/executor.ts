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
} from '@shared/types';
import { substituteVariables, matchText, getDOMSnapshot, safeQuerySelectorAll, safeQuerySelector, sleep } from '@shared/utils';

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
 */
async function executeSelectionLogic(
  logic: SelectorLogic,
  options: ExecutorOptions
): Promise<{ data?: string | string[]; scopeMatchCount?: number; anchorMatchIndex?: number }> {
  const { debug = false, debugDelay = 500 } = options;
  
  let context: Element | Document = document;
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
    
    console.log(`[Homura] Scope matched ${scopeElements.length} elements`);
    
    if (debug) {
      highlightScope(scopeElements);
      await sleep(debugDelay);
    }

    // ==========================================================================
    // Step 2: Resolve Anchor (if defined)
    // ==========================================================================
    if (logic.anchor) {
      const matchedContext = resolveAnchor(scopeElements, logic.anchor);
      
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
  const targetElement = findTarget(target.selector, context);
  
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
      // Text-based anchor
      const anchorTarget = safeQuerySelector(anchor.selector, scopeEl);
      if (anchorTarget) {
        const text = anchorTarget.textContent || '';
        if (matchText(text, anchor.value, anchor.matchMode)) {
          return { element: scopeEl, index: i };
        }
      }
    } else if (anchor.type === 'attribute_match') {
      // Attribute-based anchor
      const anchorTarget = safeQuerySelector(anchor.selector, scopeEl);
      if (anchorTarget && anchor.attribute) {
        const attrValue = anchorTarget.getAttribute(anchor.attribute) || '';
        if (matchText(attrValue, anchor.value, anchor.matchMode)) {
          return { element: scopeEl, index: i };
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
