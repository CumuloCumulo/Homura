/**
 * =============================================================================
 * Homura SDK - INPUT Primitive
 * =============================================================================
 *
 * Simulates text input with proper event dispatching.
 * Handles React/Vue controlled inputs by dispatching input events.
 */

import type { InputParams } from '../types/index.js';
import { TIMEOUTS } from '../constants.js';
import { sleep } from '../utils/index.js';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export const BROWSER_REQUIRED = true;

/**
 * INPUT Primitive
 *
 * Simulates text input with proper event dispatching.
 */
export async function executeInput(
  element: HTMLElement,
  params: InputParams
): Promise<void> {
  if (!isBrowser) {
    throw new Error('[Homura SDK] executeInput requires a browser environment');
  }

  const { value, clearFirst = true, typeDelay = TIMEOUTS.typeDelay } = params;

  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    throw new Error('[Homura SDK] Target is not an input element');
  }

  // Focus the input
  element.focus();
  await sleep(50);

  // Clear existing content if requested
  if (clearFirst) {
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(50);
  }

  // Type each character with delay for realistic effect
  if (typeDelay > 0) {
    for (const char of value) {
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(typeDelay);
    }
  } else {
    // Instant input
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Dispatch change event (important for form validation)
  element.dispatchEvent(new Event('change', { bubbles: true }));
}
