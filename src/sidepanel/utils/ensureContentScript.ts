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
  if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
    throw new Error('无法在 Chrome 内部页面上使用此功能');
  }

  // Try to ping the content script first
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
    return tab.id;
  } catch {
    // Content script not loaded, inject it
    console.log('[Homura] Content script not responding, injecting...');
  }

  // Inject the content script
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/content/index.tsx.js'],
    });
  } catch (e) {
    console.error('[Homura] Script injection failed:', e);
    // Try with the bundled file name pattern
    try {
      // The actual file might have a different name after bundling
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Minimal inline script to check if already injected
          if (!(window as Window & { __HOMURA_INJECTED__?: boolean }).__HOMURA_INJECTED__) {
            console.log('[Homura] Content script needs to be loaded via manifest');
          }
        },
      });
    } catch (e2) {
      throw new Error(`无法注入脚本: ${e2}`);
    }
  }

  // Wait a bit for the script to initialize
  await new Promise(resolve => setTimeout(resolve, 200));

  return tab.id;
}

/**
 * Send message to content script with retry logic
 */
export async function sendToContentScript<T>(
  message: { type: string; payload?: unknown },
  retries = 2
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
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }

  throw lastError || new Error('发送消息失败');
}
