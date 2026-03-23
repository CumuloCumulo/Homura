/**
 * =============================================================================
 * Homura SDK - DOM Utilities
 * =============================================================================
 *
 * DOM-related utility functions. This module requires a browser environment.
 */

// Check if we're in a browser environment
const isBrowser =
  typeof window !== 'undefined' && typeof document !== 'undefined';

export const BROWSER_REQUIRED = true;

/**
 * Safe query selector with error handling
 */
export function safeQuerySelector<T extends Element = Element>(
  selector: string,
  context: Document | Element = document,
): T | null {
  if (!isBrowser) {
    throw new Error(
      '[Homura SDK] safeQuerySelector requires a browser environment',
    );
  }
  try {
    return context.querySelector<T>(selector);
  } catch (e) {
    console.error(`[Homura SDK] Invalid selector: ${selector}`, e);
    return null;
  }
}

/**
 * Safe query selector all with error handling
 */
export function safeQuerySelectorAll<T extends Element = Element>(
  selector: string,
  context: Document | Element = document,
): T[] {
  if (!isBrowser) {
    throw new Error(
      '[Homura SDK] safeQuerySelectorAll requires a browser environment',
    );
  }
  try {
    return Array.from(context.querySelectorAll<T>(selector));
  } catch (e) {
    console.error(`[Homura SDK] Invalid selector: ${selector}`, e);
    return [];
  }
}

/**
 * Get a simplified DOM snapshot for error reporting
 */
export function getDOMSnapshot(element: Element, depth: number = 2): string {
  if (!isBrowser) {
    throw new Error(
      '[Homura SDK] getDOMSnapshot requires a browser environment',
    );
  }

  if (depth === 0) return '...';

  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = element.className
    ? `.${element.className.split(' ').join('.')}`
    : '';

  let result = `<${tag}${id}${classes}>`;

  if (depth > 1 && element.children.length > 0) {
    const children = Array.from(element.children)
      .slice(0, 3)
      .map((child) => getDOMSnapshot(child, depth - 1));
    result += children.join('');
    if (element.children.length > 3) {
      result += '...';
    }
  } else if (element.textContent) {
    // Inline truncate implementation to avoid circular import
    const text = element.textContent.trim();
    result += text.length > 30 ? text.substring(0, 27) + '...' : text;
  }

  result += `</${tag}>`;
  return result;
}
