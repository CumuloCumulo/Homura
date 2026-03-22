/**
 * =============================================================================
 * Homura SDK - CLICK Primitive
 * =============================================================================
 *
 * Simulates a realistic click by dispatching mousedown, mouseup, and click events.
 */

import type { ClickParams } from '../types/index.js';
import { sleep } from '../utils/index.js';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export const BROWSER_REQUIRED = true;

/**
 * Check if an element is visible in the viewport
 */
function isElementVisible(element: HTMLElement): boolean {
  if (!isBrowser) {
    throw new Error('[Homura SDK] isElementVisible requires a browser environment');
  }

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * CLICK Primitive
 *
 * Simulates a realistic click by dispatching mousedown, mouseup, and click events.
 * This approach works better than just calling .click() for many React/Vue apps.
 */
export async function executeClick(
  element: HTMLElement,
  params: ClickParams = {}
): Promise<void> {
  if (!isBrowser) {
    throw new Error('[Homura SDK] executeClick requires a browser environment');
  }

  const { debugMode = false } = params;

  // Ensure element is visible and scrolled into view
  if (!isElementVisible(element)) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(200);
  }

  if (debugMode) {
    await sleep(100);
  }

  const eventOpts: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
  };

  // Dispatch events in sequence (mimics real user interaction)
  element.dispatchEvent(new MouseEvent('mousedown', eventOpts));
  await sleep(debugMode ? 50 : 10);

  element.dispatchEvent(new MouseEvent('mouseup', eventOpts));
  await sleep(debugMode ? 50 : 10);

  // Use native click if available, otherwise dispatch click event
  if (typeof element.click === 'function') {
    element.click();
  } else {
    element.dispatchEvent(new PointerEvent('click', { bubbles: true }));
  }

  // Focus the element
  element.focus?.();
}
