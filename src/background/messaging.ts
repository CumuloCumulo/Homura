/**
 * =============================================================================
 * Homura - Background Messaging Utilities
 * =============================================================================
 * 
 * Type-safe messaging between Background and Content Scripts.
 */

import type { 
  AtomicTool, 
  ExecuteToolResult,
  ExecuteToolMessage,
  HighlightElementMessage,
  ClearHighlightsMessage,
} from '@shared/types';
import { generateMessageId } from '@shared/utils';

/**
 * Send a message to the active tab's content script
 */
async function sendToActiveTab<T>(message: unknown): Promise<T> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab?.id) {
    throw new Error('No active tab found');
  }
  
  return chrome.tabs.sendMessage(tab.id, message);
}

/**
 * Send a message to a specific tab
 */
async function sendToTab<T>(tabId: number, message: unknown): Promise<T> {
  return chrome.tabs.sendMessage(tabId, message);
}

/**
 * Execute an Atomic Tool on the active tab
 */
export async function executeToolOnActiveTab(
  tool: AtomicTool,
  params: Record<string, string | number | boolean>,
  debug: boolean = false
): Promise<ExecuteToolResult> {
  const message: ExecuteToolMessage = {
    type: 'EXECUTE_TOOL',
    payload: { tool, params, debug },
    messageId: generateMessageId(),
  };
  
  return sendToActiveTab<ExecuteToolResult>(message);
}

/**
 * Execute an Atomic Tool on a specific tab
 */
export async function executeToolOnTab(
  tabId: number,
  tool: AtomicTool,
  params: Record<string, string | number | boolean>,
  debug: boolean = false
): Promise<ExecuteToolResult> {
  const message: ExecuteToolMessage = {
    type: 'EXECUTE_TOOL',
    payload: { tool, params, debug },
    messageId: generateMessageId(),
  };
  
  return sendToTab<ExecuteToolResult>(tabId, message);
}

/**
 * Highlight an element on the active tab
 */
export async function highlightElementOnActiveTab(
  selector: string,
  color?: string
): Promise<{ success: boolean }> {
  const message: HighlightElementMessage = {
    type: 'HIGHLIGHT_ELEMENT',
    payload: { selector, color },
  };
  
  return sendToActiveTab(message);
}

/**
 * Clear all highlights on the active tab
 */
export async function clearHighlightsOnActiveTab(): Promise<{ success: boolean }> {
  const message: ClearHighlightsMessage = {
    type: 'CLEAR_HIGHLIGHTS',
    payload: undefined,
  };
  
  return sendToActiveTab(message);
}
