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

type BackgroundMessage = 
  | RunMissionMessage 
  | OpenSidePanelMessage 
  | SetAPIKeyMessage
  | AIGenerateSelectorMessage
  | AIGenerateToolMessage
  | AIGeneratePathSelectorMessage;

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

console.log('[Homura] Background service worker initialized');
