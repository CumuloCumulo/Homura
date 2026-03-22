/**
 * =============================================================================
 * Homura SDK - NAVIGATE Primitive
 * =============================================================================
 *
 * Navigates to a URL.
 * In content script context, this only works for same-origin navigation.
 */

import type { NavigateParams } from '../types/index.js';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof location !== 'undefined';

export const BROWSER_REQUIRED = true;

/**
 * NAVIGATE Primitive
 *
 * Navigates to a URL.
 */
export async function executeNavigate(params: NavigateParams): Promise<void> {
  if (!isBrowser) {
    throw new Error('[Homura SDK] executeNavigate requires a browser environment');
  }

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
