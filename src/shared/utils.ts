/**
 * Homura Utility Functions
 */

import type { SelectorAnchor } from './types';

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Substitute template variables in a string
 * e.g., "Hello {{name}}" with { name: "World" } -> "Hello World"
 */
export function substituteVariables(
  template: string, 
  params: Record<string, string | number | boolean>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in params) {
      return String(params[key]);
    }
    console.warn(`[Homura] Variable {{${key}}} not found in params`);
    return match;
  });
}

/**
 * Check if text matches based on anchor match mode
 */
export function matchText(
  actual: string, 
  expected: string, 
  mode: SelectorAnchor['matchMode'] = 'contains'
): boolean {
  const normalizedActual = actual.trim().toLowerCase();
  const normalizedExpected = expected.trim().toLowerCase();

  switch (mode) {
    case 'exact':
      return normalizedActual === normalizedExpected;
    case 'contains':
      return normalizedActual.includes(normalizedExpected);
    case 'startsWith':
      return normalizedActual.startsWith(normalizedExpected);
    case 'endsWith':
      return normalizedActual.endsWith(normalizedExpected);
    default:
      return normalizedActual.includes(normalizedExpected);
  }
}

/**
 * Truncate string for display
 */
export function truncate(str: string, maxLength: number = 50): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Get a simplified DOM snapshot for error reporting
 */
export function getDOMSnapshot(element: Element, depth: number = 2): string {
  if (depth === 0) return '...';
  
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
  
  let result = `<${tag}${id}${classes}>`;
  
  if (depth > 1 && element.children.length > 0) {
    const children = Array.from(element.children)
      .slice(0, 3) // Limit children
      .map(child => getDOMSnapshot(child, depth - 1));
    result += children.join('');
    if (element.children.length > 3) {
      result += '...';
    }
  } else if (element.textContent) {
    result += truncate(element.textContent.trim(), 30);
  }
  
  result += `</${tag}>`;
  return result;
}

/**
 * Safe query selector with error handling
 */
export function safeQuerySelector<T extends Element = Element>(
  selector: string, 
  context: Document | Element = document
): T | null {
  try {
    return context.querySelector<T>(selector);
  } catch (e) {
    console.error(`[Homura] Invalid selector: ${selector}`, e);
    return null;
  }
}

/**
 * Safe query selector all with error handling
 */
export function safeQuerySelectorAll<T extends Element = Element>(
  selector: string, 
  context: Document | Element = document
): T[] {
  try {
    return Array.from(context.querySelectorAll<T>(selector));
  } catch (e) {
    console.error(`[Homura] Invalid selector: ${selector}`, e);
    return [];
  }
}
