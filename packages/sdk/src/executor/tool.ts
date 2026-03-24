/**
 * =============================================================================
 * Homura SDK - Atomic Tool Executor
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
  ExecutorOptions,
  ReadinessConfig,
} from '../types/index.js';
import {
  substituteVariables,
  matchText,
  getDOMSnapshot,
  safeQuerySelectorAll,
  safeQuerySelector,
  sleep,
  waitForReady,
} from '../utils/index.js';
import {
  executeClick,
  executeInput,
  executeExtractText,
  executeWaitFor,
  executeNavigate,
} from '../primitives/index.js';

// Check if we're in a browser environment
const isBrowser =
  typeof window !== 'undefined' && typeof document !== 'undefined';

export const BROWSER_REQUIRED = true;

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
  options: ExecutorOptions = {},
): Promise<ExecuteToolResult> {
  if (!isBrowser) {
    throw new Error('[Homura SDK] executeTool requires a browser environment');
  }

  const startTime = performance.now();
  const { debug = false, debugDelay = 500, onDebugStep } = options;

  console.log(`[Homura SDK] Executing tool: ${tool.name}`, { params, debug });

  try {
    // Substitute variables in selector logic
    const resolvedLogic = resolveVariables(tool.selector_logic, params);

    // ============================================================================
    // 等待页面就绪（四层等待机制）
    // ============================================================================
    // NAVIGATE 操作不需要等待（页面即将跳转）
    if (resolvedLogic.target.action !== 'NAVIGATE') {
      // 获取目标选择器用于预检
      const targetSelector = resolvedLogic.target.selector || '';

      // 构建等待配置
      const readinessConfig: ReadinessConfig = {
        skipWait: false,
        domStabilityTimeout: 5000,
        targetTimeout: 5000,
        spaExtraWait: 2000,
        pollInterval: 500,
        verbose: debug,
      };

      console.log('[Homura SDK] Waiting for page readiness...');
      const readinessResult = await waitForReady(
        targetSelector,
        readinessConfig,
      );

      if (!readinessResult.ready) {
        const duration = Math.round(performance.now() - startTime);
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: readinessResult.error || '页面未就绪',
            domSnapshot: getDOMSnapshot(document.body),
          },
          metadata: { duration },
        };
      }

      console.log(
        `[Homura SDK] Page ready after ${readinessResult.duration}ms` +
          ` (type: ${readinessResult.pageType}, layers: ${readinessResult.layers.join(', ')})`,
      );
    }

    // Execute the selector logic
    const result = await executeSelectionLogic(resolvedLogic, {
      debug,
      debugDelay,
      onDebugStep,
    });

    const duration = Math.round(performance.now() - startTime);

    return {
      success: true,
      data: result.data,
      metadata: {
        duration,
        scopeMatchCount: result.scopeMatchCount,
        anchorMatchIndex: result.anchorMatchIndex,
        pageNavigated: result.pageNavigated,
        newUrl: result.newUrl,
      },
    };
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);

    if (isExecutionError(error)) {
      console.error(`[Homura SDK] Execution error:`, error);
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

    console.error(`[Homura SDK] Unexpected error:`, error);
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
 * ENHANCED: Supports "Virtual Composite Scope" for split table layouts.
 */
async function executeSelectionLogic(
  logic: SelectorLogic,
  options: ExecutorOptions,
): Promise<{
  data?: string | string[];
  scopeMatchCount?: number;
  anchorMatchIndex?: number;
  pageNavigated?: boolean;
  newUrl?: string;
}> {
  const { debug = false, debugDelay = 500, onDebugStep } = options;

  let context: Element | Document = document;
  let compositeScope: Element[] | null = null;
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
        document.body,
      );
    }

    // Detect split table layout
    const splitTableGroups = detectSplitTableGroups(scopeElements);
    const hasSplitTable = splitTableGroups !== null;

    console.log(
      `[Homura SDK] Scope matched ${scopeElements.length} elements${hasSplitTable ? ' (split table detected)' : ''}`,
    );

    if (debug) {
      onDebugStep?.({
        type: 'scope',
        selector: logic.scope.selector,
        matchCount: scopeElements.length,
      });
      await sleep(debugDelay);
    }

    // ==========================================================================
    // Step 2: Resolve Anchor (if defined)
    // ==========================================================================
    if (logic.anchor) {
      let matchedContext: {
        element: Element;
        index: number;
        compositeScope?: Element[];
      } | null = null;

      if (hasSplitTable) {
        matchedContext = resolveAnchorInSplitTable(
          splitTableGroups!,
          logic.anchor,
        );
      } else {
        matchedContext = resolveAnchor(scopeElements, logic.anchor);
      }

      if (!matchedContext) {
        throw createError(
          'ANCHOR_NOT_FOUND',
          `No element matched anchor criteria: ${logic.anchor.value}`,
          logic.anchor.selector,
          scopeElements[0],
        );
      }

      context = matchedContext.element;
      anchorMatchIndex = matchedContext.index;

      if (matchedContext.compositeScope) {
        compositeScope = matchedContext.compositeScope;
        console.log(
          `[Homura SDK] Using composite scope with ${compositeScope.length} elements for target search`,
        );
      }

      console.log(`[Homura SDK] Anchor matched at index ${anchorMatchIndex}`);

      if (debug) {
        onDebugStep?.({
          type: 'anchor',
          selector: logic.anchor.selector,
          matchCount: 1,
          element: context,
        });
        await sleep(debugDelay);
      }
    } else {
      context = scopeElements[0];
    }
  }

  // ==========================================================================
  // Step 3: Find and Execute Target
  // ==========================================================================
  const { target } = logic;

  // NAVIGATE 操作不需要查找元素，直接执行
  if (target.action === 'NAVIGATE') {
    console.log('[Homura SDK] NAVIGATE action: skipping element lookup');

    if (!target.actionParams) {
      throw createError(
        'ACTION_FAILED',
        'NAVIGATE action requires url parameter',
        '',
        document.body,
      );
    }

    const navigateParams = target.actionParams as NavigateParams;
    const navResult = await executeNavigate(navigateParams);

    return {
      data: `Navigated to ${navigateParams.url}`,
      scopeMatchCount,
      anchorMatchIndex,
      pageNavigated: navResult.navigated,
      newUrl: navResult.newUrl,
    };
  }

  // 其他操作需要查找元素
  let targetElement: HTMLElement | null = null;

  // Handle self-targeting (empty target selector)
  if (!target.selector || target.selector === '') {
    console.log('[Homura SDK] Self-targeting: using context element as target');
    if (context instanceof Document) {
      throw createError(
        'TARGET_NOT_FOUND',
        'Self-targeting requires a scope context, not document',
        '',
        document.body,
      );
    }
    targetElement = context as HTMLElement;
  } else if (compositeScope) {
    targetElement = findTargetInCompositeScope(target.selector, compositeScope);
  } else {
    targetElement = findTarget(target.selector, context);

    if (!targetElement && !(context instanceof Document)) {
      try {
        if ((context as Element).matches(target.selector)) {
          console.log('[Homura SDK] Target selector matches context itself');
          targetElement = context as HTMLElement;
        }
      } catch {
        // Invalid selector
      }
    }
  }

  if (!targetElement) {
    throw createError(
      'TARGET_NOT_FOUND',
      `Target element not found: ${target.selector}`,
      target.selector,
      context instanceof Document ? document.body : context,
    );
  }

  console.log(`[Homura SDK] Target found, executing action: ${target.action}`);

  if (debug) {
    onDebugStep?.({
      type: 'target',
      selector: target.selector,
      element: targetElement,
    });
    await sleep(debugDelay);
  }

  // Execute the action
  const result = await executeAction(targetElement, target);

  if (debug) {
    onDebugStep?.({
      type: 'action',
      element: targetElement,
    });
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
  return safeQuerySelectorAll(scope.selector);
}

/**
 * Find the anchor-matched element within scope elements
 */
function resolveAnchor(
  scopeElements: Element[],
  anchor: SelectorAnchor,
): { element: Element; index: number } | null {
  for (let i = 0; i < scopeElements.length; i++) {
    const scopeEl = scopeElements[i];

    if (anchor.type === 'index') {
      const targetIndex = parseInt(anchor.value, 10);
      if (i === targetIndex) {
        return { element: scopeEl, index: i };
      }
    } else if (anchor.type === 'text_match') {
      const anchorCandidates = safeQuerySelectorAll(anchor.selector, scopeEl);

      for (const candidate of anchorCandidates) {
        const text = candidate.textContent || '';
        if (matchText(text, anchor.value, anchor.matchMode)) {
          console.log(
            `[Homura SDK] Anchor matched: "${anchor.value}" in scope[${i}]`,
          );
          return { element: scopeEl, index: i };
        }
      }
    } else if (anchor.type === 'attribute_match') {
      const anchorCandidates = safeQuerySelectorAll(anchor.selector, scopeEl);

      for (const candidate of anchorCandidates) {
        if (anchor.attribute) {
          const attrValue = candidate.getAttribute(anchor.attribute) || '';
          if (matchText(attrValue, anchor.value, anchor.matchMode)) {
            console.log(
              `[Homura SDK] Anchor matched: [${anchor.attribute}="${anchor.value}"] in scope[${i}]`,
            );
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
function findTarget(
  selector: string,
  context: Element | Document,
): HTMLElement | null {
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
  target: SelectorTarget,
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
  params: Record<string, string | number | boolean>,
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
  contextElement?: Element,
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
// SPLIT TABLE SUPPORT (Virtual Composite Scope)
// =============================================================================

/**
 * Detect split table layout where multiple elements share the same ID.
 */
function detectSplitTableGroups(
  scopeElements: Element[],
): Map<string, Element[]> | null {
  const idGroups = new Map<string, Element[]>();

  for (const el of scopeElements) {
    const id = el.id;
    if (!id) continue;

    if (!idGroups.has(id)) {
      idGroups.set(id, []);
    }
    idGroups.get(id)!.push(el);
  }

  const hasDuplicateIds = Array.from(idGroups.values()).some(
    (group) => group.length > 1,
  );

  if (hasDuplicateIds) {
    console.log(
      '[Homura SDK] Split table layout detected:',
      Array.from(idGroups.entries())
        .filter(([, els]) => els.length > 1)
        .map(([id, els]) => `${id}: ${els.length} elements`),
    );
    return idGroups;
  }

  return null;
}

/**
 * Resolve anchor in split table layout.
 */
function resolveAnchorInSplitTable(
  groups: Map<string, Element[]>,
  anchor: SelectorAnchor,
): { element: Element; index: number; compositeScope: Element[] } | null {
  let groupIndex = 0;

  for (const [id, elements] of groups) {
    for (const scopeEl of elements) {
      if (anchor.type === 'index') {
        const targetIndex = parseInt(anchor.value, 10);
        if (groupIndex === targetIndex) {
          return {
            element: scopeEl,
            index: groupIndex,
            compositeScope: elements,
          };
        }
      } else if (anchor.type === 'text_match') {
        const anchorCandidates = safeQuerySelectorAll(anchor.selector, scopeEl);

        for (const candidate of anchorCandidates) {
          const text = candidate.textContent || '';
          if (matchText(text, anchor.value, anchor.matchMode)) {
            console.log(
              `[Homura SDK] Split table anchor matched in group "${id}": "${anchor.value}"`,
            );
            return {
              element: scopeEl,
              index: groupIndex,
              compositeScope: elements,
            };
          }
        }
      } else if (anchor.type === 'attribute_match' && anchor.attribute) {
        const anchorCandidates = safeQuerySelectorAll(anchor.selector, scopeEl);

        for (const candidate of anchorCandidates) {
          const attrValue = candidate.getAttribute(anchor.attribute) || '';
          if (matchText(attrValue, anchor.value, anchor.matchMode)) {
            console.log(
              `[Homura SDK] Split table anchor matched in group "${id}": [${anchor.attribute}="${anchor.value}"]`,
            );
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
 */
function findTargetInCompositeScope(
  selector: string,
  compositeScope: Element[],
): HTMLElement | null {
  for (const scopeEl of compositeScope) {
    const target = safeQuerySelector<HTMLElement>(selector, scopeEl);
    if (target) {
      console.log(
        `[Homura SDK] Target found in composite scope element:`,
        scopeEl.id || scopeEl.tagName,
      );
      return target;
    }
  }
  return null;
}
