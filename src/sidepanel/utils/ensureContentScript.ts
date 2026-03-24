/**
 * =============================================================================
 * Homura - Content Script Injection Helper
 * =============================================================================
 *
 * Ensures the content script is injected before sending messages
 */

/**
 * Ensure content script is loaded on the active tab
 * Returns the tab ID if successful
 */
export async function ensureContentScript(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    throw new Error('未找到活动标签页');
  }

  // Check if we can access this tab
  if (
    tab.url?.startsWith('chrome://') ||
    tab.url?.startsWith('chrome-extension://')
  ) {
    throw new Error('无法在 Chrome 内部页面上使用此功能');
  }

  // Try to ping the content script first
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
    return tab.id;
  } catch {
    // Content script not loaded, try to reload the tab to trigger manifest injection
    console.log(
      '[Homura] Content script not responding, please refresh the page',
    );

    // Try injecting via scripting API with a simple script first
    // This will fail on chrome:// pages but that's expected
    try {
      // Read the built manifest to get the correct content script path
      const manifestUrl = chrome.runtime.getURL('manifest.json');
      const response = await fetch(manifestUrl);
      const manifest = await response.json();
      const contentScript = manifest.content_scripts?.[0]?.js?.[0];

      if (contentScript) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [contentScript],
        });
        // Wait for script to initialize
        await new Promise((resolve) => setTimeout(resolve, 300));
        return tab.id;
      }
    } catch (e) {
      // Failed to inject, ask user to refresh
      console.error('[Homura] Auto-injection failed:', e);
    }

    throw new Error('Content script 未加载，请刷新页面');
  }
}

/**
 * Send message to content script with retry logic
 */
export async function sendToContentScript<T>(
  message: { type: string; payload?: unknown },
  retries = 2,
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i <= retries; i++) {
    try {
      const tabId = await ensureContentScript();
      const response = await chrome.tabs.sendMessage(tabId, message);
      return response as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i < retries) {
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }

  throw lastError || new Error('发送消息失败');
}
