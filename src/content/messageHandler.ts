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
import { executeClick, executeInput, executeExtractText } from './engine/primitives';
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
/** Hover highlight (follows mouse) */
let currentHighlight: HTMLElement | null = null;
/** Selected element highlight (persists after click) */
let selectedHighlight: HTMLElement | null = null;
/** Validation highlight (shows verified element) */
let validationHighlight: HTMLElement | null = null;

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

    // Direct Element Operations (for Inspect Mode quick actions)
    case 'EXECUTE_CLICK':
      return handleExecuteClick(message.payload as { selector: string });

    case 'EXECUTE_INPUT':
      return handleExecuteInput(message.payload as { selector: string; value: string });

    case 'EXECUTE_EXTRACT':
      return handleExecuteExtract(message.payload as { selector: string });

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
  removeSelectedHighlight();
  removeValidationHighlight();
  
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
  removeSelectedHighlight();
  
  console.log('[Homura] Inspect mode stopped');
  return { success: true };
}

function onInspectMouseOver(e: MouseEvent): void {
  if (!isInspectMode) return;
  
  const target = e.target as HTMLElement;
  if (!target || target === document.body || target === document.documentElement) return;
  
  showInspectHighlight(target);
}

function onInspectMouseOut(e: MouseEvent): void {
  if (!isInspectMode) return;
  
  // Check if mouse is leaving the document (going to browser chrome, sidepanel, etc.)
  const relatedTarget = e.relatedTarget as Node | null;
  
  // If relatedTarget is null or outside the document, mouse left the page
  if (!relatedTarget || !document.body.contains(relatedTarget)) {
    removeInspectHighlight();
  }
}

function onInspectClick(e: MouseEvent): void {
  if (!isInspectMode) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const target = e.target as HTMLElement;
  if (!target || target === document.body) return;
  
  // Clear previous validation highlight when selecting a new element
  removeValidationHighlight();
  
  // Show persistent selected highlight (different from hover highlight)
  showSelectedHighlight(target);
  
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

/**
 * Show a persistent highlight for the selected element
 * Uses a different style (emerald/teal) to distinguish from hover highlight (violet)
 */
function showSelectedHighlight(element: HTMLElement): void {
  removeSelectedHighlight();
  
  const rect = element.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.id = 'homura-selected-highlight';
  
  Object.assign(overlay.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',  // Emerald with low opacity
    border: '2px solid rgba(16, 185, 129, 0.9)',  // Emerald solid border
    borderRadius: '3px',
    pointerEvents: 'none',
    zIndex: '2147483645',  // Below hover highlight
    boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.3), 0 0 12px rgba(16, 185, 129, 0.2)',
  });
  
  document.body.appendChild(overlay);
  selectedHighlight = overlay;
}

function removeSelectedHighlight(): void {
  if (selectedHighlight) {
    selectedHighlight.remove();
    selectedHighlight = null;
  }
  const existing = document.getElementById('homura-selected-highlight');
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
// DIRECT ELEMENT OPERATIONS (for Inspect Mode quick actions)
// =============================================================================

interface DirectOperationResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Execute a click on element by selector
 */
async function handleExecuteClick(payload: { selector: string }): Promise<DirectOperationResult> {
  const { selector } = payload;
  
  try {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      return { success: false, error: `元素未找到: ${selector}` };
    }
    
    await executeClick(element);
    console.log('[Homura] Click executed on:', selector);
    return { success: true };
  } catch (error) {
    return { success: false, error: `点击失败: ${error}` };
  }
}

/**
 * Execute input on element by selector
 */
async function handleExecuteInput(payload: { selector: string; value: string }): Promise<DirectOperationResult> {
  const { selector, value } = payload;
  
  try {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      return { success: false, error: `元素未找到: ${selector}` };
    }
    
    await executeInput(element, { value, clearFirst: true, typeDelay: 0 });
    console.log('[Homura] Input executed on:', selector, 'value:', value);
    return { success: true };
  } catch (error) {
    return { success: false, error: `输入失败: ${error}` };
  }
}

/**
 * Extract text from element by selector
 */
function handleExecuteExtract(payload: { selector: string }): DirectOperationResult {
  const { selector } = payload;
  
  try {
    const element = document.querySelector(selector);
    if (!element) {
      return { success: false, error: `元素未找到: ${selector}` };
    }
    
    const text = executeExtractText(element);
    console.log('[Homura] Text extracted from:', selector, 'text:', text);
    return { success: true, data: text as string };
  } catch (error) {
    return { success: false, error: `读取失败: ${error}` };
  }
}

// =============================================================================
// SELECTOR VALIDATION
// =============================================================================

interface ValidationResponse {
  success: boolean;
  valid: boolean;
  scopeMatches: number;
  anchorMatchIndex: number;
  targetFound: boolean;
  error?: string;
  /** The scoped selector that was used to find the element */
  usedSelector?: string;
}

/**
 * Validate a selector draft and highlight the found element
 * 
 * This function uses the scoped selector logic:
 * 1. If scope exists: find container first, then find target within container
 * 2. If no scope but we have a minimalSelector with container prefix: use it directly
 * 3. Highlight the found element with validation highlight (blue)
 */
function handleValidateSelector(draft: SelectorDraft): ValidationResponse {
  // Remove previous validation highlight
  removeValidationHighlight();
  
  const result = validateSelectorDraft(draft);
  
  // If validation passed, find and highlight the actual element
  if (result.valid && result.targetFound) {
    const element = findValidatedElement(draft, result.anchorMatchIndex);
    if (element) {
      showValidationHighlight(element);
    }
  }
  
  return { 
    success: true, 
    ...result,
    usedSelector: draft.scope 
      ? `${draft.scope.selector} ${draft.target.selector}`
      : draft.target.selector,
  };
}

/**
 * Find the element that was validated
 */
function findValidatedElement(draft: SelectorDraft, anchorMatchIndex: number): HTMLElement | null {
  try {
    // No scope - use target directly (which may include container prefix)
    if (!draft.scope) {
      return document.querySelector(draft.target.selector) as HTMLElement;
    }
    
    // With scope - find the correct scope element and then target
    const scopeElements = document.querySelectorAll(draft.scope.selector);
    const scopeIndex = anchorMatchIndex >= 0 ? anchorMatchIndex : 0;
    const scopeElement = scopeElements[scopeIndex];
    
    if (!scopeElement) return null;
    
    return scopeElement.querySelector(draft.target.selector) as HTMLElement;
  } catch {
    return null;
  }
}

/**
 * Show validation highlight (blue color to distinguish from inspect/selected)
 */
function showValidationHighlight(element: HTMLElement): void {
  removeValidationHighlight();
  
  const rect = element.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.id = 'homura-validation-highlight';
  
  Object.assign(overlay.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',   // Blue
    border: '2px solid rgba(59, 130, 246, 0.9)',  // Blue solid border
    borderRadius: '3px',
    pointerEvents: 'none',
    zIndex: '2147483644',  // Below selected and hover highlights
    boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.3), 0 0 15px rgba(59, 130, 246, 0.3)',
    animation: 'homura-pulse 1.5s ease-in-out infinite',
  });
  
  // Add pulse animation style if not exists
  if (!document.getElementById('homura-validation-style')) {
    const style = document.createElement('style');
    style.id = 'homura-validation-style';
    style.textContent = `
      @keyframes homura-pulse {
        0%, 100% { box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3), 0 0 15px rgba(59, 130, 246, 0.3); }
        50% { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5), 0 0 25px rgba(59, 130, 246, 0.5); }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(overlay);
  validationHighlight = overlay;
  
  // Scroll element into view if not visible
  if (!isElementInViewport(element)) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function removeValidationHighlight(): void {
  if (validationHighlight) {
    validationHighlight.remove();
    validationHighlight = null;
  }
  const existing = document.getElementById('homura-validation-highlight');
  if (existing) {
    existing.remove();
  }
}

/**
 * Check if element is visible in viewport
 */
function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
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
