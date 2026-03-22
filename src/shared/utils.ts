/**
 * =============================================================================
 * Homura Utility Functions (Compatibility Layer)
 * =============================================================================
 *
 * This file now re-exports utilities from @homura/sdk for backward compatibility.
 * New code should import directly from @homura/sdk/utils.
 */

// Re-export all utilities from SDK
export * from "@homura/sdk/utils";

// =============================================================================
// EXTENSION-SPECIFIC UTILITIES
// =============================================================================
//
// Utilities that are specific to the Chrome Extension and not part of the SDK.
// =============================================================================

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
