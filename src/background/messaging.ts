/**
 * =============================================================================
 * Homura - Background Messaging Utilities
 * =============================================================================
 *
 * Type-safe messaging between Background and Content Scripts.
 */

import type { AtomicTool, ExecuteToolResult } from '@homura/sdk/types';
import type {
  ExecuteToolMessage,
  HighlightElementMessage,
  ClearHighlightsMessage,
} from '@shared/types';
import { generateMessageId } from '@homura/sdk/utils';

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Get active tab ID
 */
async function getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    throw new Error('No active tab found');
  }

  return tab.id;
}

/**
 * Send a message to a specific tab
 */
async function sendToTab<T>(tabId: number, message: unknown): Promise<T> {
  return chrome.tabs.sendMessage(tabId, message);
}

/**
 * Create an ExecuteTool message
 */
function createExecuteToolMessage(
  tool: AtomicTool,
  params: Record<string, string | number | boolean>,
  debug: boolean = false,
): ExecuteToolMessage {
  return {
    type: 'EXECUTE_TOOL',
    payload: { tool, params, debug },
    messageId: generateMessageId(),
  };
}

// ============================================================================
// Tool Execution API
// ============================================================================

/**
 * Execute an Atomic Tool
 *
 * Unified interface for tool execution on either a specific tab or active tab.
 *
 * @param target - Either { tabId: number } for specific tab, or { activeTab: true } for current active tab
 * @param tool - The AtomicTool to execute
 * @param params - Tool parameters
 * @param debug - Enable debug mode
 *
 * @example
 * // Execute on specific tab
 * await executeTool({ tabId: 123 }, tool, params);
 *
 * // Execute on active tab
 * await executeTool({ activeTab: true }, tool, params);
 */
export async function executeTool(
  target: { tabId: number } | { activeTab: true },
  tool: AtomicTool,
  params: Record<string, string | number | boolean>,
  debug: boolean = false,
): Promise<ExecuteToolResult> {
  const tabId = 'tabId' in target ? target.tabId : await getActiveTabId();
  const message = createExecuteToolMessage(tool, params, debug);
  return sendToTab<ExecuteToolResult>(tabId, message);
}

/**
 * Execute an Atomic Tool on the active tab
 *
 * @deprecated Use executeTool({ activeTab: true }, ...) instead
 */
export async function executeToolOnActiveTab(
  tool: AtomicTool,
  params: Record<string, string | number | boolean>,
  debug: boolean = false,
): Promise<ExecuteToolResult> {
  return executeTool({ activeTab: true }, tool, params, debug);
}

/**
 * Execute an Atomic Tool on a specific tab
 *
 * @deprecated Use executeTool({ tabId }, ...) instead
 */
export async function executeToolOnTab(
  tabId: number,
  tool: AtomicTool,
  params: Record<string, string | number | boolean>,
  debug: boolean = false,
): Promise<ExecuteToolResult> {
  return executeTool({ tabId }, tool, params, debug);
}

// ============================================================================
// Highlight API
// ============================================================================

/**
 * Highlight an element on the active tab
 */
export async function highlightElementOnActiveTab(
  selector: string,
  color?: string,
): Promise<{ success: boolean }> {
  const tabId = await getActiveTabId();
  const message: HighlightElementMessage = {
    type: 'HIGHLIGHT_ELEMENT',
    payload: { selector, color },
  };

  return sendToTab(tabId, message);
}

/**
 * Clear all highlights on the active tab
 */
export async function clearHighlightsOnActiveTab(): Promise<{
  success: boolean;
}> {
  const tabId = await getActiveTabId();
  const message: ClearHighlightsMessage = {
    type: 'CLEAR_HIGHLIGHTS',
    payload: undefined,
  };

  return sendToTab(tabId, message);
}
