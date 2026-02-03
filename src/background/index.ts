/**
 * =============================================================================
 * Homura - Background Service Worker
 * =============================================================================
 * 
 * The orchestration layer that coordinates tool execution and AI operations.
 */

import { initAIClient, isAIClientInitialized } from '@services/ai';

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize AI client with stored API key
async function initializeAI(): Promise<void> {
  const result = await chrome.storage.local.get('ai_api_key');
  if (result.ai_api_key) {
    initAIClient({ apiKey: result.ai_api_key });
    console.log('[Homura] AI client initialized');
  } else {
    // Use default key for development (will be removed in production)
    initAIClient({ apiKey: 'sk-d2514b410e02403eae3f3b5efe0ef172' });
    console.log('[Homura] AI client initialized with default key');
  }
}

// Initialize on startup
initializeAI();

// =============================================================================
// SIDE PANEL MANAGEMENT
// =============================================================================

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Set side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// =============================================================================
// RECORDING STATE MANAGEMENT (Persistent across page navigations)
// Using chrome.storage.session to survive Service Worker restarts
// =============================================================================

interface RecordingState {
  isRecording: boolean;
  tabId: number | null;
  startTime: number | null;
}

// In-memory cache (will be synced with storage)
let recordingState: RecordingState = {
  isRecording: false,
  tabId: null,
  startTime: null,
};

// Restore state from storage on Service Worker startup
async function restoreRecordingState(): Promise<void> {
  try {
    const result = await chrome.storage.session.get('recordingState');
    if (result.recordingState) {
      recordingState = result.recordingState;
      console.log('[Homura] Recording state restored from storage:', recordingState);
    }
  } catch (error) {
    console.error('[Homura] Failed to restore recording state:', error);
  }
}

// Call immediately on startup
restoreRecordingState();

async function startRecording(tabId: number): Promise<void> {
  recordingState = { isRecording: true, tabId, startTime: Date.now() };
  // Persist to storage to survive Service Worker restarts
  await chrome.storage.session.set({ recordingState });
  console.log('[Homura] Recording started on tab:', tabId);
}

async function stopRecording(): Promise<void> {
  recordingState = { isRecording: false, tabId: null, startTime: null };
  // Clear from storage
  await chrome.storage.session.remove('recordingState');
  console.log('[Homura] Recording stopped');
}

function isTabRecording(tabId: number): boolean {
  return recordingState.isRecording && recordingState.tabId === tabId;
}

// =============================================================================
// NAVIGATION LISTENER - Restore recording on page navigation (cross-domain)
// =============================================================================

// Track when recording tab opens a new tab (e.g., target="_blank" links)
chrome.webNavigation.onCreatedNavigationTarget.addListener(async (details) => {
  await restoreRecordingState();
  
  // Check if the source tab is being recorded
  if (!recordingState.isRecording) return;
  if (recordingState.tabId !== details.sourceTabId) return;
  
  console.log('[Homura] New tab opened from recording tab:', details.sourceTabId, '->', details.tabId);
  
  // Update recording to track the new tab instead
  recordingState.tabId = details.tabId;
  await chrome.storage.session.set({ recordingState });
  
  console.log('[Homura] Recording switched to new tab:', details.tabId);
});

// Handle tab activation - when user switches tabs during recording (e.g., JS redirect to new tab)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await restoreRecordingState();
  
  if (!recordingState.isRecording) return;
  if (recordingState.tabId === activeInfo.tabId) return;
  
  // Auto-switch recording to newly activated tab
  console.log('[Homura] User switched to different tab while recording:', recordingState.tabId, '->', activeInfo.tabId);
  
  recordingState.tabId = activeInfo.tabId;
  await chrome.storage.session.set({ recordingState });
  
  // Try to restore recording on the new tab after a short delay
  setTimeout(async () => {
    try {
      await chrome.tabs.sendMessage(activeInfo.tabId, { type: 'START_RECORDING' });
      console.log('[Homura] Recording started on newly activated tab');
    } catch (error) {
      console.log('[Homura] Could not start recording on new tab (content script may not be ready)');
    }
  }, 300);
});

// Use webNavigation for reliable navigation detection (works across domains)
chrome.webNavigation.onCompleted.addListener(async (details) => {
  // Only handle main frame (not iframes)
  if (details.frameId !== 0) return;
  
  // Re-check state from storage in case Service Worker just restarted
  await restoreRecordingState();
  
  if (!isTabRecording(details.tabId)) {
    // Log for debugging - only if there's any recording state
    if (recordingState.isRecording) {
      console.log('[Homura] Navigation on different tab, recording tab:', recordingState.tabId, 'current:', details.tabId);
    }
    return;
  }
  
  console.log('[Homura] Navigation completed while recording:', details.url);
  
  // Retry logic with increasing delays to ensure content script is ready
  const delays = [300, 800, 1500];
  
  for (const delay of delays) {
    await new Promise(r => setTimeout(r, delay));
    
    try {
      await chrome.tabs.sendMessage(details.tabId, { type: 'START_RECORDING' });
      console.log('[Homura] Recording restored after', delay, 'ms');
      return; // Success, exit retry loop
    } catch (error) {
      console.log('[Homura] Retry attempt at', delay, 'ms failed');
    }
  }
  
  console.error('[Homura] Failed to restore recording after all retries');
});

// Fallback: also listen to tabs.onUpdated for hash changes (SPA navigation)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
  if (changeInfo.status !== 'complete') return;
  
  // Re-check state from storage in case Service Worker just restarted
  await restoreRecordingState();
  
  if (!isTabRecording(tabId)) return;
  
  // Small delay then try to restore
  await new Promise(r => setTimeout(r, 200));
  
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'START_RECORDING' });
    console.log('[Homura] Recording restored via tabs.onUpdated');
  } catch {
    // Ignore - webNavigation handler will handle it
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await restoreRecordingState();
  if (recordingState.tabId === tabId) {
    await stopRecording();
    console.log('[Homura] Recording stopped - tab closed');
  }
});

// =============================================================================
// MESSAGE HANDLING
// =============================================================================

interface RunMissionMessage {
  type: 'RUN_MISSION';
  payload: {
    tools: Array<{ tool: unknown; params: Record<string, string | number | boolean> }>;
  };
}

interface OpenSidePanelMessage {
  type: 'OPEN_SIDEPANEL';
}

interface SetAPIKeyMessage {
  type: 'SET_API_KEY';
  payload: { apiKey: string };
}

interface AIGenerateSelectorMessage {
  type: 'AI_GENERATE_SELECTOR';
  payload: {
    intent: string;
    targetHtml: string;
    containerHtml: string;
    anchorValue?: string;
  };
}

interface AIGenerateToolMessage {
  type: 'AI_GENERATE_TOOL';
  payload: {
    actions: unknown[];
    pageUrl: string;
    pageTitle: string;
  };
}

interface AIGeneratePathSelectorMessage {
  type: 'AI_GENERATE_PATH_SELECTOR';
  payload: {
    intent: string;
    targetSelector: string;
    targetHtml: string;
    ancestorPath: Array<{
      tagName: string;
      id?: string;
      classes: string[];
      semanticScore: number;
      selector: string;
      outerHTML: string;
      depth: number;
      isSemanticRoot: boolean;
    }>;
  };
}

interface AIGenerateSmartSelectorMessage {
  type: 'AI_GENERATE_SMART_SELECTOR';
  payload: {
    intent: string;
    targetSelector: string;
    targetHtml: string;
    ancestorPath: Array<{
      tagName: string;
      id?: string;
      classes: string[];
      semanticScore: number;
      selector: string;
      outerHTML: string;
      depth: number;
      isSemanticRoot: boolean;
    }>;
    structureInfo: {
      containerType: 'table' | 'list' | 'grid' | 'card' | 'single';
      hasRepeatingStructure: boolean;
      containerSelector?: string;
      anchorCandidates: Array<{
        selector: string;
        type: 'text_match' | 'attribute_match';
        text?: string;
        attribute?: { name: string; value: string };
        confidence: number;
        isUnique: boolean;
      }>;
    };
  };
}

interface SetRecordingStateMessage {
  type: 'SET_RECORDING_STATE';
  payload: { isRecording: boolean; tabId?: number };
}

interface GetRecordingStateMessage {
  type: 'GET_RECORDING_STATE';
}

type BackgroundMessage = 
  | RunMissionMessage 
  | OpenSidePanelMessage 
  | SetAPIKeyMessage
  | AIGenerateSelectorMessage
  | AIGenerateToolMessage
  | SetRecordingStateMessage
  | GetRecordingStateMessage
  | AIGeneratePathSelectorMessage
  | AIGenerateSmartSelectorMessage;

chrome.runtime.onMessage.addListener((
  message: BackgroundMessage, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response: unknown) => void
) => {
  handleMessage(message, sender, sendResponse);
  return true; // Async response
});

async function handleMessage(
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  console.log('[Homura] Background received:', message.type);

  switch (message.type) {
    case 'RUN_MISSION':
      await handleRunMission(message, sendResponse);
      break;

    case 'OPEN_SIDEPANEL':
      await handleOpenSidePanel(sender);
      sendResponse({ success: true });
      break;

    case 'SET_API_KEY':
      await handleSetAPIKey(message, sendResponse);
      break;

    case 'AI_GENERATE_SELECTOR':
      await handleAIGenerateSelector(message, sendResponse);
      break;

    case 'AI_GENERATE_TOOL':
      await handleAIGenerateTool(message, sendResponse);
      break;

    case 'AI_GENERATE_PATH_SELECTOR':
      await handleAIGeneratePathSelector(message, sendResponse);
      break;

    case 'AI_GENERATE_SMART_SELECTOR':
      await handleAIGenerateSmartSelector(message as AIGenerateSmartSelectorMessage, sendResponse);
      break;

    // Recording state management (for cross-page recording)
    case 'SET_RECORDING_STATE': {
      const msg = message as SetRecordingStateMessage;
      if (msg.payload.isRecording && msg.payload.tabId) {
        await startRecording(msg.payload.tabId);
      } else {
        await stopRecording();
      }
      sendResponse({ success: true });
      break;
    }

    case 'GET_RECORDING_STATE': {
      await restoreRecordingState(); // Ensure we have latest state
      sendResponse({ success: true, state: recordingState });
      break;
    }

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
}

// =============================================================================
// MESSAGE HANDLERS
// =============================================================================

async function handleRunMission(
  message: RunMissionMessage,
  sendResponse: (response: unknown) => void
): Promise<void> {
  const { runMission } = await import('./orchestrator');
  const result = await runMission(
    message.payload.tools as Parameters<typeof runMission>[0], 
    (context, result) => {
      chrome.runtime.sendMessage({
        type: 'MISSION_PROGRESS',
        payload: { context, result },
      });
    }
  );
  sendResponse(result);
}

async function handleOpenSidePanel(sender: chrome.runtime.MessageSender): Promise<void> {
  const tab = sender.tab;
  if (tab?.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  } else {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id) {
      await chrome.sidePanel.open({ tabId: activeTab.id });
    }
  }
}

async function handleSetAPIKey(
  message: SetAPIKeyMessage,
  sendResponse: (response: unknown) => void
): Promise<void> {
  await chrome.storage.local.set({ ai_api_key: message.payload.apiKey });
  initAIClient({ apiKey: message.payload.apiKey });
  sendResponse({ success: true });
}

async function handleAIGenerateSelector(
  message: AIGenerateSelectorMessage,
  sendResponse: (response: unknown) => void
): Promise<void> {
  if (!isAIClientInitialized()) {
    sendResponse({ success: false, error: 'AI client not initialized' });
    return;
  }

  try {
    const { getAIClient } = await import('@services/ai');
    const client = getAIClient();
    
    const result = await client.generateSelector({
      intent: message.payload.intent,
      targetHtml: message.payload.targetHtml,
      containerHtml: message.payload.containerHtml,
      anchorValue: message.payload.anchorValue,
    });

    sendResponse({ success: true, selectorLogic: result.selectorLogic });
  } catch (error) {
    console.error('[Homura] AI selector generation error:', error);
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleAIGenerateTool(
  message: AIGenerateToolMessage,
  sendResponse: (response: unknown) => void
): Promise<void> {
  if (!isAIClientInitialized()) {
    sendResponse({ success: false, error: 'AI client not initialized' });
    return;
  }

  try {
    const { getAIClient } = await import('@services/ai');
    const client = getAIClient();
    
    const result = await client.generateTool({
      actions: message.payload.actions as never[],
      pageUrl: message.payload.pageUrl,
      pageTitle: message.payload.pageTitle,
      domSnapshot: '', // TODO: Get from content script
    });

    sendResponse({ success: true, tool: result.tool });
  } catch (error) {
    console.error('[Homura] AI tool generation error:', error);
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleAIGeneratePathSelector(
  message: AIGeneratePathSelectorMessage,
  sendResponse: (response: unknown) => void
): Promise<void> {
  if (!isAIClientInitialized()) {
    sendResponse({ success: false, error: 'AI client not initialized' });
    return;
  }

  try {
    const { getAIClient } = await import('@services/ai');
    const client = getAIClient();
    
    // Use the new path-based selector generation
    const result = await client.generatePathSelector({
      intent: message.payload.intent,
      targetSelector: message.payload.targetSelector,
      targetHtml: message.payload.targetHtml,
      ancestorPath: message.payload.ancestorPath,
    });

    console.log('[Homura] AI path selector result:', result);

    sendResponse({ 
      success: true, 
      pathSelector: result,
    });
  } catch (error) {
    console.error('[Homura] AI path selector generation error:', error);
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleAIGenerateSmartSelector(
  message: AIGenerateSmartSelectorMessage,
  sendResponse: (response: unknown) => void
): Promise<void> {
  console.log('[Background] Routing SmartSelector to AI service:', {
    containerType: message.payload.structureInfo.containerType,
    hasRepeating: message.payload.structureInfo.hasRepeatingStructure,
    anchorCount: message.payload.structureInfo.anchorCandidates.length,
  });

  if (!isAIClientInitialized()) {
    sendResponse({ success: false, error: 'AI client not initialized' });
    return;
  }

  try {
    const { getAIClient } = await import('@services/ai');
    const client = getAIClient();
    
    // Use the smart selector generation method
    const result = await client.generateSmartSelector({
      intent: message.payload.intent,
      targetSelector: message.payload.targetSelector,
      targetHtml: message.payload.targetHtml,
      ancestorPath: message.payload.ancestorPath,
      structureInfo: message.payload.structureInfo,
    });

    console.log('[Background] SmartSelector result:', {
      strategy: result.strategy,
      confidence: result.confidence,
    });

    sendResponse({ 
      success: true,
      strategy: result.strategy,
      pathSelector: result.pathSelector,
      selectorLogic: result.selectorLogic,
      confidence: result.confidence,
      reasoning: result.reasoning,
    });
  } catch (error) {
    console.error('[Background] SmartSelector generation error:', error);
    sendResponse({ success: false, error: String(error) });
  }
}

console.log('[Homura] Background service worker initialized');
