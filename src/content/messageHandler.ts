/**
 * =============================================================================
 * Homura - Content Script Message Handler
 * =============================================================================
 * 
 * Handles messages from Background Script and SidePanel.
 * This is the bridge between the orchestration layer and the execution engine.
 */

import type { 
  HomuraMessage, 
  ExecuteToolRequest, 
  ExecuteToolResult 
} from '@shared/types';
import { executeTool } from './engine';
import { clearAllHighlights } from './engine';
import { 
  analyzeElement, 
  validateSelectorDraft,
  type SelectorDraft,
  type ElementAnalysis 
} from '@shared/selectorBuilder';

// =============================================================================
// STATE FOR INSPECT/RECORD MODE
// =============================================================================

let isInspectMode = false;
let isRecordMode = false;
let currentHighlight: HTMLElement | null = null;

/**
 * Initialize message listener
 */
export function initMessageHandler(): void {
  chrome.runtime.onMessage.addListener((
    message: HomuraMessage | { type: string; payload?: unknown }, 
    _sender: chrome.runtime.MessageSender, 
    sendResponse: (response: unknown) => void
  ) => {
    handleMessage(message as { type: string; payload?: unknown })
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
async function handleMessage(message: { type: string; payload?: unknown }): Promise<unknown> {
  console.log('[Homura] Received message:', message.type);

  switch (message.type) {
    // Health check
    case 'PING':
      return { success: true, message: 'pong' };

    case 'EXECUTE_TOOL':
      return handleExecuteTool(message.payload as ExecuteToolRequest);

    case 'HIGHLIGHT_ELEMENT':
      return handleHighlightElement(message.payload as { selector: string; color?: string });

    case 'CLEAR_HIGHLIGHTS':
      return handleClearHighlights();

    // Inspect Mode
    case 'START_INSPECT':
      return handleStartInspect();

    case 'STOP_INSPECT':
      return handleStopInspect();

    // Record Mode
    case 'START_RECORDING':
      return handleStartRecording();

    case 'STOP_RECORDING':
      return handleStopRecording();

    // Selector Validation
    case 'VALIDATE_SELECTOR':
      return handleValidateSelector(message.payload as SelectorDraft);

    // AI Operations (placeholder - actual AI calls happen in background)
    case 'AI_GENERATE_SELECTOR':
      return handleAIGenerateSelector(message.payload as { intent: string; analysis: ElementAnalysis });

    case 'AI_GENERATE_TOOL':
      return handleAIGenerateTool(message.payload as { actions: unknown[] });

    default:
      console.warn('[Homura] Unknown message type:', message.type);
      return { success: false, error: { code: 'UNKNOWN', message: 'Unknown message type' } };
  }
}

// =============================================================================
// EXECUTE TOOL
// =============================================================================

async function handleExecuteTool(payload: ExecuteToolRequest): Promise<ExecuteToolResult> {
  const { tool, params, debug } = payload;
  
  console.log(`[Homura] Executing tool: ${tool.name}`);
  
  const result = await executeTool(tool, params, { debug });
  
  return result;
}

// =============================================================================
// HIGHLIGHT
// =============================================================================

function handleHighlightElement(payload: { selector: string; color?: string }): { success: boolean } {
  const { selector, color = 'rgba(249, 115, 22, 0.5)' } = payload;
  
  const element = document.querySelector(selector);
  if (!element) {
    return { success: false };
  }
  
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

function handleClearHighlights(): { success: boolean } {
  clearAllHighlights();
  
  const manual = document.getElementById('homura-manual-highlight');
  if (manual) {
    manual.remove();
  }
  
  removeInspectHighlight();
  
  return { success: true };
}

// =============================================================================
// INSPECT MODE
// =============================================================================

function handleStartInspect(): { success: boolean } {
  if (isInspectMode) return { success: true };
  
  isInspectMode = true;
  document.addEventListener('mouseover', onInspectMouseOver, true);
  document.addEventListener('mouseout', onInspectMouseOut, true);
  document.addEventListener('click', onInspectClick, true);
  document.body.style.cursor = 'crosshair';
  
  console.log('[Homura] Inspect mode started');
  return { success: true };
}

function handleStopInspect(): { success: boolean } {
  if (!isInspectMode) return { success: true };
  
  isInspectMode = false;
  document.removeEventListener('mouseover', onInspectMouseOver, true);
  document.removeEventListener('mouseout', onInspectMouseOut, true);
  document.removeEventListener('click', onInspectClick, true);
  document.body.style.cursor = '';
  removeInspectHighlight();
  
  console.log('[Homura] Inspect mode stopped');
  return { success: true };
}

function onInspectMouseOver(e: MouseEvent): void {
  if (!isInspectMode) return;
  
  const target = e.target as HTMLElement;
  if (!target || target === document.body || target === document.documentElement) return;
  
  showInspectHighlight(target);
}

function onInspectMouseOut(_e: MouseEvent): void {
  // Highlight will be updated on next mouseover
}

function onInspectClick(e: MouseEvent): void {
  if (!isInspectMode) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const target = e.target as HTMLElement;
  if (!target || target === document.body) return;
  
  // Analyze the element
  const analysis = analyzeElement(target);
  
  // Send to SidePanel
  chrome.runtime.sendMessage({
    type: 'ELEMENT_SELECTED',
    payload: analysis,
  });
  
  console.log('[Homura] Element selected:', analysis);
}

function showInspectHighlight(element: HTMLElement): void {
  removeInspectHighlight();
  
  const rect = element.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.id = 'homura-inspect-highlight';
  
  Object.assign(overlay.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    border: '2px solid rgba(139, 92, 246, 0.8)',
    borderRadius: '2px',
    pointerEvents: 'none',
    zIndex: '2147483646',
    transition: 'all 0.1s ease-out',
  });
  
  document.body.appendChild(overlay);
  currentHighlight = overlay;
}

function removeInspectHighlight(): void {
  if (currentHighlight) {
    currentHighlight.remove();
    currentHighlight = null;
  }
  const existing = document.getElementById('homura-inspect-highlight');
  if (existing) {
    existing.remove();
  }
}

// =============================================================================
// RECORD MODE
// =============================================================================

function handleStartRecording(): { success: boolean } {
  if (isRecordMode) return { success: true };
  
  isRecordMode = true;
  document.addEventListener('click', onRecordClick, true);
  document.addEventListener('input', onRecordInput, true);
  
  console.log('[Homura] Recording started');
  return { success: true };
}

function handleStopRecording(): { success: boolean } {
  if (!isRecordMode) return { success: true };
  
  isRecordMode = false;
  document.removeEventListener('click', onRecordClick, true);
  document.removeEventListener('input', onRecordInput, true);
  
  console.log('[Homura] Recording stopped');
  return { success: true };
}

/** Generate a unique ID for recorded actions */
function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function onRecordClick(e: MouseEvent): void {
  if (!isRecordMode) return;
  
  const target = e.target as HTMLElement;
  if (!target || target === document.body) return;
  
  const analysis = analyzeElement(target);
  
  chrome.runtime.sendMessage({
    type: 'ACTION_RECORDED',
    payload: {
      id: generateActionId(),
      name: '点击',
      type: 'click',
      timestamp: Date.now(),
      elementAnalysis: analysis,
    },
  });
}

function onRecordInput(e: Event): void {
  if (!isRecordMode) return;
  
  const target = e.target as HTMLInputElement;
  if (!target) return;
  
  const analysis = analyzeElement(target);
  
  chrome.runtime.sendMessage({
    type: 'ACTION_RECORDED',
    payload: {
      id: generateActionId(),
      name: '输入',
      type: 'input',
      timestamp: Date.now(),
      elementAnalysis: analysis,
      value: target.value,
    },
  });
}

// =============================================================================
// SELECTOR VALIDATION
// =============================================================================

function handleValidateSelector(draft: SelectorDraft): { success: boolean } & ReturnType<typeof validateSelectorDraft> {
  const result = validateSelectorDraft(draft);
  return { success: true, ...result };
}

// =============================================================================
// AI OPERATIONS (Placeholder - actual implementation via background)
// =============================================================================

async function handleAIGenerateSelector(_payload: { intent: string; analysis: ElementAnalysis }): Promise<{ success: boolean; draft?: SelectorDraft; error?: string }> {
  // TODO: Forward to background script for AI processing
  // For now, return a placeholder
  return { 
    success: false, 
    error: 'AI generation not yet implemented. Please use manual selector building.' 
  };
}

async function handleAIGenerateTool(_payload: { actions: unknown[] }): Promise<{ success: boolean; tool?: unknown; error?: string }> {
  // TODO: Forward to background script for AI processing
  return { 
    success: false, 
    error: 'AI tool generation not yet implemented.' 
  };
}
