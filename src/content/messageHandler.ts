/**
 * =============================================================================
 * Homura - Content Script Message Handler
 * =============================================================================
 * 
 * Handles messages from Background Script.
 * This is the bridge between the orchestration layer and the execution engine.
 */

import type { 
  HomuraMessage, 
  ExecuteToolRequest, 
  ExecuteToolResult 
} from '@shared/types';
import { executeTool } from './engine';
import { clearAllHighlights } from './engine';

/**
 * Initialize message listener
 */
export function initMessageHandler(): void {
  chrome.runtime.onMessage.addListener((
    message: HomuraMessage, 
    _sender: chrome.runtime.MessageSender, 
    sendResponse: (response: unknown) => void
  ) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => {
        console.error('[Homura] Message handling error:', error);
        sendResponse({ success: false, error: { code: 'UNKNOWN', message: String(error) } });
      });
    
    // Return true to indicate async response
    return true;
  });

  console.log('[Homura] Content script message handler initialized');
}

/**
 * Route and handle incoming messages
 */
async function handleMessage(message: HomuraMessage): Promise<unknown> {
  console.log('[Homura] Received message:', message.type);

  switch (message.type) {
    case 'EXECUTE_TOOL':
      return handleExecuteTool(message.payload);

    case 'HIGHLIGHT_ELEMENT':
      return handleHighlightElement(message.payload);

    case 'CLEAR_HIGHLIGHTS':
      return handleClearHighlights();

    default:
      console.warn('[Homura] Unknown message type:', (message as HomuraMessage).type);
      return { success: false, error: { code: 'UNKNOWN', message: 'Unknown message type' } };
  }
}

/**
 * Handle EXECUTE_TOOL message
 */
async function handleExecuteTool(payload: ExecuteToolRequest): Promise<ExecuteToolResult> {
  const { tool, params, debug } = payload;
  
  console.log(`[Homura] Executing tool: ${tool.name}`);
  
  const result = await executeTool(tool, params, { debug });
  
  return result;
}

/**
 * Handle HIGHLIGHT_ELEMENT message
 */
function handleHighlightElement(payload: { selector: string; color?: string }): { success: boolean } {
  const { selector, color = 'rgba(249, 115, 22, 0.5)' } = payload;
  
  const element = document.querySelector(selector);
  if (!element) {
    return { success: false };
  }
  
  // Simple highlight for now
  const rect = element.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.id = 'homura-manual-highlight';
  
  Object.assign(overlay.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    backgroundColor: color,
    border: `2px solid ${color.replace('0.5', '1')}`,
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: '2147483647',
  });
  
  document.body.appendChild(overlay);
  
  return { success: true };
}

/**
 * Handle CLEAR_HIGHLIGHTS message
 */
function handleClearHighlights(): { success: boolean } {
  clearAllHighlights();
  
  // Also remove manual highlights
  const manual = document.getElementById('homura-manual-highlight');
  if (manual) {
    manual.remove();
  }
  
  return { success: true };
}
