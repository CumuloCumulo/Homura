/**
 * =============================================================================
 * Homura SDK - WAIT_FOR Primitive
 * =============================================================================
 *
 * Waits for an element to appear in the DOM.
 * Uses MutationObserver for efficient waiting.
 */

import type { WaitForParams } from '../types/index.js';
import { TIMEOUTS } from '../constants.js';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export const BROWSER_REQUIRED = true;

/**
 * Check if an element is visible in the viewport
 */
function isElementVisible(element: HTMLElement): boolean {
  if (!isBrowser) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * WAIT_FOR Primitive
 *
 * Waits for an element to appear in the DOM.
 */
export async function executeWaitFor(
  selector: string,
  params: WaitForParams = {},
  context: Document | Element = document
): Promise<Element> {
  if (!isBrowser) {
    throw new Error('[Homura SDK] executeWaitFor requires a browser environment');
  }

  const { timeout = TIMEOUTS.waitForElement, visible = false } = params;

  return new Promise((resolve, reject) => {
    // Check if element already exists
    const existing = context.querySelector(selector);
    if (existing && (!visible || isElementVisible(existing as HTMLElement))) {
      resolve(existing);
      return;
    }

    // Set up timeout
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
    }, timeout);

    // Set up MutationObserver to watch for the element
    const observer = new MutationObserver(() => {
      const element = context.querySelector(selector);
      if (element && (!visible || isElementVisible(element as HTMLElement))) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    });

    observer.observe(context instanceof Document ? context.body : context, {
      childList: true,
      subtree: true,
      attributes: visible,
    });
  });
}
