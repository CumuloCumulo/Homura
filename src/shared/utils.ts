/**
 * =============================================================================
 * Homura Extension-Specific Utility Functions
 * =============================================================================
 *
 * This file contains utility functions that are specific to the Chrome Extension.
 * For SDK utilities, import directly from @homura/sdk/utils.
 *
 * Utilities previously here have been moved to the SDK:
 * - Text utilities -> @homura/sdk/utils
 * - DOM utilities -> @homura/sdk/utils
 * - Async utilities -> @homura/sdk/utils
 * =============================================================================
 */

/**
 * Chrome Extension message passing utility
 */
export async function sendMessageToContent<T = unknown>(
  tabId: number,
  message: { type: string; payload?: T },
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response as T);
      }
    });
  });
}

/**
 * Get active tab in current window
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}
