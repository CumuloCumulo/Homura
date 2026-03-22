/**
 * =============================================================================
 * Homura SDK - Text Utilities
 * =============================================================================
 */

import type { SelectorAnchor } from '../types/index.js';

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
    console.warn(`[Homura SDK] Variable {{${key}}} not found in params`);
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
