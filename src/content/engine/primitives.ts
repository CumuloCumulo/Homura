/**
 * =============================================================================
 * Homura - Primitive Action Executors
 * =============================================================================
 * 
 * These are the hardcoded, battle-tested DOM operations.
 * AI cannot modify these - it can only invoke them through Atomic Tools.
 * 
 * Inspired by Automa's content script handlers:
 * - simulateClickElement (content/utils.js)
 * - handleSelector (content/handleSelector.js)
 */

import type { 
  ClickParams, 
  InputParams, 
  ExtractTextParams, 
  WaitForParams, 
  NavigateParams,
  ExecutionError 
} from '@shared/types';
import { TIMEOUTS } from '@shared/constants';
import { sleep } from '@shared/utils';

/**
 * CLICK Primitive
 * 
 * Simulates a realistic click by dispatching mousedown, mouseup, and click events.
 * This approach works better than just calling .click() for many React/Vue apps.
 * 
 * @reference Automa: src/content/utils.js - simulateClickElement
 */
export async function executeClick(
  element: HTMLElement, 
  params: ClickParams = {}
): Promise<void> {
  const { debugMode = false } = params;

  // Ensure element is visible and scrolled into view
  if (!isElementVisible(element)) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(200); // Wait for scroll to complete
  }

  if (debugMode) {
    // In debug mode, we could use Chrome DevTools Protocol for more realistic clicks
    // For MVP, we'll use the standard approach with extra delays
    await sleep(100);
  }

  const eventOpts: MouseEventInit = { 
    bubbles: true, 
    cancelable: true,
    view: window 
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

  // Focus the element (important for buttons and links)
  element.focus?.();
}

/**
 * INPUT Primitive
 * 
 * Simulates text input with proper event dispatching.
 * Handles React/Vue controlled inputs by dispatching input events.
 */
export async function executeInput(
  element: HTMLElement, 
  params: InputParams
): Promise<void> {
  const { value, clearFirst = true, typeDelay = TIMEOUTS.typeDelay } = params;

  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    throw createError('ACTION_FAILED', 'Target is not an input element');
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

/**
 * EXTRACT_TEXT Primitive
 * 
 * Extracts text content or attribute from element(s).
 */
export function executeExtractText(
  elements: Element | Element[], 
  params: ExtractTextParams = {}
): string | string[] {
  const { multiple = false, attribute } = params;
  const elementArray = Array.isArray(elements) ? elements : [elements];

  const extractFromElement = (el: Element): string => {
    if (attribute) {
      return el.getAttribute(attribute) || '';
    }
    return el.textContent?.trim() || '';
  };

  if (multiple) {
    return elementArray.map(extractFromElement);
  }
  
  return extractFromElement(elementArray[0]);
}

/**
 * WAIT_FOR Primitive
 * 
 * Waits for an element to appear in the DOM.
 * Uses MutationObserver for efficient waiting.
 */
export async function executeWaitFor(
  selector: string, 
  params: WaitForParams = {},
  context: Document | Element = document
): Promise<Element> {
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
      reject(createError('TIMEOUT', `Element "${selector}" not found within ${timeout}ms`, selector));
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
      attributes: visible, // Only watch attributes if checking visibility
    });
  });
}

/**
 * NAVIGATE Primitive
 * 
 * Navigates to a URL (should be called from background script for cross-origin)
 * In content script context, this only works for same-origin navigation.
 */
export async function executeNavigate(params: NavigateParams): Promise<void> {
  const { url, waitForLoad = true } = params;

  if (waitForLoad) {
    return new Promise((resolve) => {
      const handleLoad = () => {
        window.removeEventListener('load', handleLoad);
        resolve();
      };
      window.addEventListener('load', handleLoad);
      window.location.href = url;
    });
  } else {
    window.location.href = url;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if an element is visible in the viewport
 */
function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Create a structured error object
 */
function createError(
  code: ExecutionError['code'], 
  message: string, 
  failedSelector?: string
): ExecutionError {
  return { code, message, failedSelector };
}
