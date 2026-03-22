/**
 * =============================================================================
 * Homura - Atomic Tool Executor (Compatibility Layer)
 * =============================================================================
 *
 * This file now wraps @homura/sdk/executor and adds extension-specific features:
 * - Visual debugging with highlighter
 * - Chrome extension integration
 *
 * The core execution logic has moved to @homura/sdk.
 */

import type {
  AtomicTool,
  ExecuteToolResult,
  ExecutorOptions as SDKExecutorOptions,
  UnifiedSelector,
  DebugStep,
} from "@homura/sdk/types";
import { executeTool as sdkExecuteTool } from "@homura/sdk/executor";
import { substituteVariables } from "@homura/sdk/utils";
import { convertUnifiedToSelectorLogic } from "@homura/sdk/selector";
import {
  executeClick,
  executeInput,
  executeExtractText,
} from "@homura/sdk/primitives";

// Import debug highlighter (extension-specific)
import {
  highlightScope,
  highlightAnchor,
  highlightTarget,
  flashElement,
  clearAllHighlights,
} from "./highlighter";

/**
 * Executor options with extension-specific features
 */
export interface ExecutorOptions extends SDKExecutorOptions {
  /** Enable debug mode with visual highlights */
  debug?: boolean;
  /** Delay between steps in debug mode (ms) */
  debugDelay?: number;
}

/**
 * Execute an Atomic Tool
 *
 * Wraps the SDK executor with extension-specific features like visual highlighting.
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
  const { debug = false, debugDelay = 500 } = options;

  console.log(`[Homura] Executing tool: ${tool.name}`, { params, debug });

  // Clear any existing highlights
  if (debug) {
    clearAllHighlights();
  }

  // Create debug callback for visual highlighting
  const onDebugStep = (step: DebugStep) => {
    if (debug) {
      switch (step.type) {
        case "scope":
          if (step.element) {
            highlightScope([step.element]);
          }
          break;
        case "anchor":
          if (step.element) {
            highlightAnchor(step.element, step.matchCount ?? 0);
          }
          break;
        case "target":
          if (step.element) {
            highlightTarget(step.element);
          }
          break;
        case "action":
          if (step.element) {
            flashElement(step.element, true);
          }
          break;
      }
    }
  };

  // Call SDK executor with our debug callback
  const result = await sdkExecuteTool(tool, params, {
    debug,
    debugDelay,
    onDebugStep,
  });

  return result;
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
  options: ExecutorOptions = {},
): Promise<ExecuteToolResult> {
  const startTime = performance.now();
  const { debug = false, debugDelay = 500 } = options;

  console.log(`[Homura] Executing UnifiedSelector: ${selector.id}`, {
    strategy: selector.strategy,
    fullSelector: selector.fullSelector,
    debug,
  });

  // Clear any existing highlights
  if (debug) {
    clearAllHighlights();
  }

  try {
    // Convert UnifiedSelector to SelectorLogic
    const selectorLogic = convertUnifiedToSelectorLogic(selector);

    // Substitute variables
    const resolvedLogic = resolveVariablesInLogic(selectorLogic, params);

    // Execute using SDK (through a temporary AtomicTool wrapper)
    const tempTool: AtomicTool = {
      tool_id: `temp_${selector.id}`,
      name: "Execute UnifiedSelector",
      description: `Execute ${selector.strategy} selector`,
      parameters: {},
      selector_logic: resolvedLogic,
    };

    const result = await executeTool(tempTool, {}, { debug, debugDelay });

    const duration = Math.round(performance.now() - startTime);

    return {
      success: result.success,
      data: result.data,
      metadata: {
        duration,
        ...result.metadata,
      },
    };
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);

    const executionError: import("@homura/sdk/types").ExecutionError = {
      code: "ACTION_FAILED",
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
  options: ExecutorOptions = {},
): Promise<ExecuteToolResult> {
  const startTime = performance.now();
  const { debug = false, debugDelay = 500 } = options;

  console.log(
    `[Homura] Direct execution of UnifiedSelector: ${selector.fullSelector}`,
  );

  if (debug) {
    clearAllHighlights();
  }

  try {
    // Find element
    const element = document.querySelector<HTMLElement>(selector.fullSelector);

    if (!element) {
      const error: import("@homura/sdk/types").ExecutionError = {
        code: "TARGET_NOT_FOUND",
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
      await new Promise((resolve) => setTimeout(resolve, debugDelay));
    }

    // Execute action based on selector.action
    const result = await executeAction(element, selector);

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

    const executionError: import("@homura/sdk/types").ExecutionError = {
      code: "ACTION_FAILED",
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

/**
 * Execute the primitive action on target element (local helper)
 */
async function executeAction(
  element: HTMLElement,
  selector: UnifiedSelector,
): Promise<string | string[] | undefined> {
  const { type: action, params } = selector.action;

  switch (action) {
    case "CLICK":
      await executeClick(
        element,
        params as import("@homura/sdk/types").ClickParams,
      );
      return undefined;

    case "INPUT":
      await executeInput(
        element,
        params as import("@homura/sdk/types").InputParams,
      );
      return undefined;

    case "EXTRACT_TEXT":
      return executeExtractText(
        element,
        params as import("@homura/sdk/types").ExtractTextParams,
      );

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Local variable substitution helper
 */
function resolveVariablesInLogic(
  logic: import("@homura/sdk/types").SelectorLogic,
  params: Record<string, string | number | boolean>,
): import("@homura/sdk/types").SelectorLogic {
  const resolved: import("@homura/sdk/types").SelectorLogic = {
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
  if (logic.target.action === "INPUT" && logic.target.actionParams) {
    const inputParams = logic.target
      .actionParams as import("@homura/sdk/types").InputParams;
    resolved.target.actionParams = {
      ...inputParams,
      value: substituteVariables(inputParams.value, params),
    };
  }

  return resolved;
}
