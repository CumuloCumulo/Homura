/**
 * =============================================================================
 * Homura SDK - Type Guards
 * =============================================================================
 *
 * Type guards for runtime type checking and safer error handling.
 * Use these instead of `as` type assertions for safer code.
 */

import type {
  AtomicTool,
  ExecutionError,
  ExecuteToolResult,
  SelectorLogic,
  SelectorScope,
  SelectorAnchor,
  SelectorTarget,
} from '../types/index.js';

// =============================================================================
// Error Code Enumeration
// =============================================================================

/**
 * Execution error codes
 *
 * Use this enum instead of string literals for error codes.
 */
export enum ErrorCode {
  /** Scope selector matched 0 elements */
  SCOPE_NOT_FOUND = 'SCOPE_NOT_FOUND',
  /** No element in scope matched anchor */
  ANCHOR_NOT_FOUND = 'ANCHOR_NOT_FOUND',
  /** Target selector not found in context */
  TARGET_NOT_FOUND = 'TARGET_NOT_FOUND',
  /** Action execution failed */
  ACTION_FAILED = 'ACTION_FAILED',
  /** Wait timeout exceeded */
  TIMEOUT = 'TIMEOUT',
  /** CSS selector syntax error */
  INVALID_SELECTOR = 'INVALID_SELECTOR',
  /** Page not ready for execution */
  PAGE_NOT_READY = 'PAGE_NOT_READY',
  /** Navigation failed */
  NAVIGATION_FAILED = 'NAVIGATION_FAILED',
  /** Unexpected error */
  UNKNOWN = 'UNKNOWN',
}

// =============================================================================
// Error Type Guards
// =============================================================================

/**
 * Check if value is a valid ExecutionError
 *
 * @example
 * ```typescript
 * try {
 *   await executeTool(tool, params);
 * } catch (error) {
 *   if (isExecutionError(error)) {
 *     console.log(error.code); // TypeScript knows error is ExecutionError
 *   }
 * }
 * ```
 */
export function isExecutionError(value: unknown): value is ExecutionError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const error = value as Record<string, unknown>;

  return (
    'code' in error &&
    typeof error.code === 'string' &&
    Object.values(ErrorCode).includes(error.code as ErrorCode) &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

/**
 * Check if an error has an error code (broader check)
 *
 * Use this when the error might not be a full ExecutionError
 * but still has a code field.
 */
export function hasErrorCode(
  error: unknown,
): error is { code: string; message?: string } {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  return (
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

/**
 * Extract error message safely from any error type
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (isExecutionError(error)) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as Record<string, unknown>).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }

  return 'Unknown error';
}

/**
 * Convert any error to ExecutionError
 */
export function toExecutionError(
  error: unknown,
  defaultCode: ErrorCode = ErrorCode.UNKNOWN,
): ExecutionError {
  if (isExecutionError(error)) {
    return error;
  }

  return {
    code: defaultCode as ExecutionError['code'],
    message: extractErrorMessage(error),
  };
}

// =============================================================================
// Tool Type Guards
// =============================================================================

/**
 * Check if value is a valid AtomicTool
 *
 * @example
 * ```typescript
 * const tool = JSON.parse(toolJson);
 * if (isAtomicTool(tool)) {
 *   await executeTool(tool, params);
 * }
 * ```
 */
export function isAtomicTool(value: unknown): value is AtomicTool {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const tool = value as Record<string, unknown>;

  // Check required fields
  const hasRequired =
    'tool_id' in tool &&
    typeof tool.tool_id === 'string' &&
    'name' in tool &&
    typeof tool.name === 'string' &&
    'selector_logic' in tool &&
    typeof tool.selector_logic === 'object';

  if (!hasRequired) {
    return false;
  }

  // Validate selector_logic structure
  return isSelectorLogic(tool.selector_logic);
}

/**
 * Check if value is a valid SelectorLogic
 */
export function isSelectorLogic(value: unknown): value is SelectorLogic {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const logic = value as Record<string, unknown>;

  // Must have target
  if (!('target' in logic) || typeof logic.target !== 'object') {
    return false;
  }

  return isSelectorTarget(logic.target);
}

/**
 * Check if value is a valid SelectorTarget
 */
export function isSelectorTarget(value: unknown): value is SelectorTarget {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const target = value as Record<string, unknown>;

  return (
    'action' in target &&
    typeof target.action === 'string' &&
    [
      'CLICK',
      'INPUT',
      'EXTRACT_TEXT',
      'WAIT_FOR',
      'NAVIGATE',
      'SCROLL',
    ].includes(target.action)
  );
}

/**
 * Check if value is a valid SelectorScope
 */
export function isSelectorScope(value: unknown): value is SelectorScope {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const scope = value as Record<string, unknown>;

  return (
    'type' in scope &&
    typeof scope.type === 'string' &&
    'selector' in scope &&
    typeof scope.selector === 'string'
  );
}

/**
 * Check if value is a valid SelectorAnchor
 */
export function isSelectorAnchor(value: unknown): value is SelectorAnchor {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const anchor = value as Record<string, unknown>;

  return (
    'type' in anchor &&
    typeof anchor.type === 'string' &&
    ['index', 'text_match', 'attribute_match'].includes(anchor.type) &&
    'selector' in anchor &&
    typeof anchor.selector === 'string' &&
    'value' in anchor &&
    typeof anchor.value === 'string'
  );
}

// =============================================================================
// Result Type Guards
// =============================================================================

/**
 * Check if value is a valid ExecuteToolResult
 */
export function isExecuteToolResult(
  value: unknown,
): value is ExecuteToolResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const result = value as Record<string, unknown>;

  // Must have success field
  if (!('success' in result) || typeof result.success !== 'boolean') {
    return false;
  }

  // If failed, should have error
  if (!result.success && 'error' in result) {
    // Error should be ExecutionError or undefined
    const error = result.error;
    if (error !== undefined && !isExecutionError(error)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if result is successful
 */
export function isSuccessResult(
  result: ExecuteToolResult,
): result is ExecuteToolResult & { success: true } {
  return result.success === true;
}

/**
 * Check if result is failed
 */
export function isFailedResult(
  result: ExecuteToolResult,
): result is ExecuteToolResult & { success: false; error: ExecutionError } {
  return result.success === false;
}

// =============================================================================
// Parameter Type Guards
// =============================================================================

/**
 * Check if value is valid tool params
 */
export function isValidToolParams(
  value: unknown,
): value is Record<string, string | number | boolean> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const params = value as Record<string, unknown>;

  for (const val of Object.values(params)) {
    if (
      typeof val !== 'string' &&
      typeof val !== 'number' &&
      typeof val !== 'boolean'
    ) {
      return false;
    }
  }

  return true;
}
