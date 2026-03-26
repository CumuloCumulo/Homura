/**
 * =============================================================================
 * Homura - Background Service Worker
 * =============================================================================
 *
 * The orchestration layer that coordinates tool execution and AI operations.
 */

import type { AtomicTool } from "@homura/sdk/types";
import { getAIClient, initAIClient, isAIClientInitialized } from "@services/ai";
import {
  initOrchestrator,
  startExecution,
  clearExecutionState,
  resumeExecution,
  loadExecutionState,
} from "./orchestrator";
import { simpleExecutor } from "./orchestration/simple-executor";

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize AI client with stored API key
async function initializeAI(): Promise<void> {
  const result = await chrome.storage.local.get("ai_api_key");
  if (result.ai_api_key) {
    initAIClient({ apiKey: result.ai_api_key });
    console.log("[Homura] AI client initialized");
  } else {
    // Use default key for development (will be removed in production)
    initAIClient({ apiKey: "sk-d2514b410e02403eae3f3b5efe0ef172" });
    console.log("[Homura] AI client initialized with default key");
  }
}

// Initialize on startup
initializeAI();

// Initialize orchestrator for cross-page execution
initOrchestrator();

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
    const result = await chrome.storage.session.get("recordingState");
    if (result.recordingState) {
      recordingState = result.recordingState;
      console.log(
        "[Homura] Recording state restored from storage:",
        recordingState,
      );
    }
  } catch (error) {
    console.error("[Homura] Failed to restore recording state:", error);
  }
}

// Call immediately on startup
restoreRecordingState();

async function startRecording(tabId: number): Promise<void> {
  recordingState = { isRecording: true, tabId, startTime: Date.now() };
  // Persist to storage to survive Service Worker restarts
  await chrome.storage.session.set({ recordingState });
  console.log("[Homura] Recording started on tab:", tabId);
}

async function stopRecording(): Promise<void> {
  recordingState = { isRecording: false, tabId: null, startTime: null };
  // Clear from storage
  await chrome.storage.session.remove("recordingState");
  console.log("[Homura] Recording stopped");
}

function isTabRecording(tabId: number): boolean {
  return recordingState.isRecording && recordingState.tabId === tabId;
}

// =============================================================================
// NAVIGATION RECORDING - Record page navigations during recording
// =============================================================================

// Track the last URL for each tab to avoid duplicate recordings
const lastRecordedUrl = new Map<number, string>();

// Detect navigation type from transition qualifiers
function detectNavigationType(details: {
  transitionType?: string;
  transitionQualifiers?: string[];
}): "link" | "form" | "direct" | "reload" | "typed" {
  const transitionType = details.transitionType;
  if (transitionType === "link") return "link";
  if (transitionType === "form_submit") return "form";
  if (transitionType === "reload") return "reload";
  if (transitionType === "typed") return "typed";
  return "direct"; // JavaScript redirect, bookmark, etc.
}

// Record navigation when tab navigates to a new URL
chrome.webNavigation.onCompleted.addListener(async (details) => {
  // Only handle main frame (not iframes)
  if (details.frameId !== 0) return;

  // Skip chrome:// and other internal pages
  if (
    details.url.startsWith("chrome://") ||
    details.url.startsWith("chrome-extension://") ||
    details.url.startsWith("about:")
  ) {
    return;
  }

  // Re-check state from storage in case Service Worker just restarted
  await restoreRecordingState();

  if (!isTabRecording(details.tabId)) return;

  // Skip duplicate recordings (same URL)
  const lastUrl = lastRecordedUrl.get(details.tabId);
  if (lastUrl === details.url) {
    console.log("[Homura] Skipping duplicate navigation:", details.url);
    return;
  }

  // Detect navigation type (cast to access transitionType which exists at runtime)
  const navDetails = details as {
    transitionType?: string;
    transitionQualifiers?: string[];
  };
  const navigationType = detectNavigationType(navDetails);

  console.log("[Homura] Navigation recorded:", {
    url: details.url,
    type: navigationType,
    transitionType: navDetails.transitionType,
  });

  // Send recorded navigation to SidePanel
  try {
    // Send to runtime which will be picked up by SidePanel
    chrome.runtime.sendMessage({
      type: "ACTION_RECORDED",
      payload: {
        id: `nav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "navigate",
        name: "导航",
        url: details.url,
        navigationType,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.log(
      "[Homura] Could not send navigation recording (SidePanel may not be open):",
      error,
    );
  }

  // Update last recorded URL
  lastRecordedUrl.set(details.tabId, details.url);

  // Then restore recording state on the new page
  console.log("[Homura] Navigation completed while recording:", details.url);

  // Retry logic with increasing delays to ensure content script is ready
  const delays = [300, 800, 1500];

  for (const delay of delays) {
    await new Promise((r) => setTimeout(r, delay));

    try {
      await chrome.tabs.sendMessage(details.tabId, { type: "START_RECORDING" });
      console.log("[Homura] Recording restored after", delay, "ms");
      return; // Success, exit retry loop
    } catch (error) {
      console.log("[Homura] Retry attempt at", delay, "ms failed");
    }
  }

  console.error("[Homura] Failed to restore recording after all retries");
});

// =============================================================================
// NAVIGATION LISTENER - Restore recording on page navigation (cross-domain)
// =============================================================================

// Track when recording tab opens a new tab (e.g., target="_blank" links)
chrome.webNavigation.onCreatedNavigationTarget.addListener(async (details) => {
  await restoreRecordingState();

  // Check if the source tab is being recorded
  if (!recordingState.isRecording) return;
  if (recordingState.tabId !== details.sourceTabId) return;

  console.log(
    "[Homura] New tab opened from recording tab:",
    details.sourceTabId,
    "->",
    details.tabId,
  );

  // Update recording to track the new tab instead
  recordingState.tabId = details.tabId;
  await chrome.storage.session.set({ recordingState });

  console.log("[Homura] Recording switched to new tab:", details.tabId);
});

// Handle tab activation - when user switches tabs during recording (e.g., JS redirect to new tab)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await restoreRecordingState();

  if (!recordingState.isRecording) return;
  if (recordingState.tabId === activeInfo.tabId) return;

  // Auto-switch recording to newly activated tab
  console.log(
    "[Homura] User switched to different tab while recording:",
    recordingState.tabId,
    "->",
    activeInfo.tabId,
  );

  recordingState.tabId = activeInfo.tabId;
  await chrome.storage.session.set({ recordingState });

  // Try to restore recording on the new tab after a short delay
  setTimeout(async () => {
    try {
      await chrome.tabs.sendMessage(activeInfo.tabId, {
        type: "START_RECORDING",
      });
      console.log("[Homura] Recording started on newly activated tab");
    } catch (error) {
      console.log(
        "[Homura] Could not start recording on new tab (content script may not be ready)",
      );
    }
  }, 300);
});

// Fallback: also listen to tabs.onUpdated for hash changes (SPA navigation)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
  if (changeInfo.status !== "complete") return;

  // Re-check state from storage in case Service Worker just restarted
  await restoreRecordingState();

  if (!isTabRecording(tabId)) return;

  // Small delay then try to restore
  await new Promise((r) => setTimeout(r, 200));

  try {
    await chrome.tabs.sendMessage(tabId, { type: "START_RECORDING" });
    console.log("[Homura] Recording restored via tabs.onUpdated");
  } catch {
    // Ignore - webNavigation handler will handle it
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await restoreRecordingState();
  if (recordingState.tabId === tabId) {
    await stopRecording();
    console.log("[Homura] Recording stopped - tab closed");
  }
});

// =============================================================================
// MESSAGE HANDLING
// =============================================================================

interface RunMissionMessage {
  type: "RUN_MISSION";
  payload: {
    tools: Array<{
      tool: unknown;
      params: Record<string, string | number | boolean>;
    }>;
  };
}

interface OpenSidePanelMessage {
  type: "OPEN_SIDEPANEL";
}

interface SetAPIKeyMessage {
  type: "SET_API_KEY";
  payload: { apiKey: string };
}

interface AIGenerateSelectorMessage {
  type: "AI_GENERATE_SELECTOR";
  payload: {
    intent: string;
    targetHtml: string;
    containerHtml: string;
    anchorValue?: string;
  };
}

interface AIGenerateToolMessage {
  type: "AI_GENERATE_TOOL";
  payload: {
    actions: unknown[];
    pageUrl: string;
    pageTitle: string;
  };
}

interface AIGeneratePathSelectorMessage {
  type: "AI_GENERATE_PATH_SELECTOR";
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
  type: "AI_GENERATE_SMART_SELECTOR";
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
      containerType: "table" | "list" | "grid" | "card" | "single";
      hasRepeatingStructure: boolean;
      containerSelector?: string;
      anchorCandidates: Array<{
        selector: string;
        type: "text_match" | "attribute_match";
        text?: string;
        attribute?: { name: string; value: string };
        confidence: number;
        isUnique: boolean;
      }>;
    };
  };
}

interface SetRecordingStateMessage {
  type: "SET_RECORDING_STATE";
  payload: { isRecording: boolean; tabId?: number };
}

interface GetRecordingStateMessage {
  type: "GET_RECORDING_STATE";
}

interface ExecuteNavigateMessage {
  type: "EXECUTE_NAVIGATE";
  payload: {
    url: string;
    newTab?: boolean;
    setActive?: boolean;
  };
}

interface HomuraNavigateMessage {
  type: "HOMURA_NAVIGATE";
  payload: {
    tabId: number;
    url: string;
    waitForLoad: boolean;
  };
}

interface HomuraStartExecutionMessage {
  type: "HOMURA_START_EXECUTION";
  payload: {
    tools: Array<{ tool: unknown; params: Record<string, unknown> }>;
    tabId: number;
    executionMode?: "simple" | "advanced";
    executionConfig?: { mode: "simple"; toolDelay?: number };
  };
}

interface HomuraResumeExecutionMessage {
  type: "HOMURA_RESUME_EXECUTION";
  payload: { tabId: number };
}

interface HomuraGetStateMessage {
  type: "HOMURA_GET_STATE";
}

interface HomuraCancelExecutionMessage {
  type: "HOMURA_CANCEL_EXECUTION";
}

interface ToolUpdatedMessage {
  type: "TOOL_UPDATED";
  payload: {
    toolkitId: string;
    toolIndex: number;
    updatedTool: AtomicTool;
  };
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
  | AIGenerateSmartSelectorMessage
  | ExecuteNavigateMessage
  | HomuraNavigateMessage
  | HomuraStartExecutionMessage
  | HomuraResumeExecutionMessage
  | HomuraGetStateMessage
  | HomuraCancelExecutionMessage
  | ToolUpdatedMessage;

chrome.runtime.onMessage.addListener(
  (
    message: BackgroundMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) => {
    handleMessage(message, sender, sendResponse);
    return true; // Async response
  },
);

async function handleMessage(
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  console.log("[Homura] Background received:", message.type);

  switch (message.type) {
    case "RUN_MISSION":
      await handleRunMission(message, sendResponse);
      break;

    case "OPEN_SIDEPANEL":
      await handleOpenSidePanel(sender);
      sendResponse({ success: true });
      break;

    case "SET_API_KEY":
      await handleSetAPIKey(message, sendResponse);
      break;

    case "AI_GENERATE_SELECTOR":
      await handleAIGenerateSelector(message, sendResponse);
      break;

    case "AI_GENERATE_TOOL":
      await handleAIGenerateTool(message, sendResponse);
      break;

    case "AI_GENERATE_PATH_SELECTOR":
      await handleAIGeneratePathSelector(message, sendResponse);
      break;

    case "AI_GENERATE_SMART_SELECTOR":
      await handleAIGenerateSmartSelector(
        message as AIGenerateSmartSelectorMessage,
        sendResponse,
      );
      break;

    case "EXECUTE_NAVIGATE":
      await handleExecuteNavigate(
        message as ExecuteNavigateMessage,
        sendResponse,
      );
      break;

    case "HOMURA_NAVIGATE": {
      const msg = message as HomuraNavigateMessage;
      const { tabId, url } = msg.payload;
      // waitForLoad is handled by the tab status listener in orchestrator
      const result = await executeNavigation({
        url,
        tabId,
        newTab: false,
        setActive: false,
      });
      sendResponse(result);
      break;
    }

    // Recording state management (for cross-page recording)
    case "SET_RECORDING_STATE": {
      const msg = message as SetRecordingStateMessage;
      if (msg.payload.isRecording && msg.payload.tabId) {
        await startRecording(msg.payload.tabId);
      } else {
        await stopRecording();
      }
      sendResponse({ success: true });
      break;
    }

    case "GET_RECORDING_STATE": {
      await restoreRecordingState(); // Ensure we have latest state
      sendResponse({ success: true, state: recordingState });
      break;
    }

    // Orchestrator messages
    case "HOMURA_START_EXECUTION": {
      const msg = message as HomuraStartExecutionMessage;
      const { executionMode = "advanced", executionConfig } = msg.payload;

      console.log(
        "[Background] Starting execution with mode:",
        executionMode,
        "config:",
        executionConfig,
      );

      if (executionMode === "simple") {
        // 简单模式：使用简单执行器
        const state = await simpleExecutor.start(
          msg.payload.tools as Array<{
            tool: AtomicTool;
            params: Record<string, unknown>;
          }>,
          msg.payload.tabId,
          executionConfig || { mode: "simple", toolDelay: 2000 },
        );
        // 返回兼容的 ExecutionState 格式
        sendResponse(state);
      } else {
        // 高级模式：使用原有编排器
        await clearExecutionState();
        const result = await startExecution(
          msg.payload.tools as Array<{
            tool: AtomicTool;
            params: Record<string, unknown>;
          }>,
          msg.payload.tabId,
        );
        sendResponse(result);
      }
      break;
    }

    case "HOMURA_RESUME_EXECUTION": {
      const result = await resumeExecution(message.payload.tabId);
      sendResponse(result);
      break;
    }

    case "HOMURA_GET_STATE": {
      // 首先检查简单执行器
      const simpleState = simpleExecutor.getState();
      if (simpleState) {
        // 简单执行器正在运行
        sendResponse(simpleExecutor.toExecutionState());
      } else {
        // 检查高级编排器
        const state = await loadExecutionState();
        sendResponse(state);
      }
      break;
    }

    case "HOMURA_CANCEL_EXECUTION": {
      // 取消简单执行器
      const simpleState = simpleExecutor.getState();
      if (simpleState && simpleState.status === "running") {
        await simpleExecutor.cancel();
      } else {
        // 取消高级编排器
        await clearExecutionState();
      }
      sendResponse({ success: true });
      break;
    }

    case "TOOL_UPDATED": {
      const msg = message as ToolUpdatedMessage;
      const { toolkitId, toolIndex, updatedTool } = msg.payload;

      // Store the update in chrome.storage.local for Dashboard to pick up
      const updateKey = `homura_tool_update_${toolkitId}_${toolIndex}`;
      await chrome.storage.local.set({
        [updateKey]: {
          toolkitId,
          toolIndex,
          updatedTool,
          timestamp: Date.now(),
        },
      });

      console.log(
        `[Background] Tool updated: ${toolkitId}[${toolIndex}] - ${updatedTool.name}`,
      );
      sendResponse({ success: true });
      break;
    }

    default:
      sendResponse({ success: false, error: "Unknown message type" });
  }
}

// =============================================================================
// MESSAGE HANDLERS
// =============================================================================

async function handleRunMission(
  message: RunMissionMessage,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  // 获取当前活动 tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    sendResponse({ error: "No active tab found" });
    return;
  }

  const result = await startExecution(
    message.payload.tools as Parameters<typeof startExecution>[0],
    tab.id,
  );
  sendResponse(result);
}

async function handleOpenSidePanel(
  sender: chrome.runtime.MessageSender,
): Promise<void> {
  const tab = sender.tab;
  if (tab?.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  } else {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (activeTab?.id) {
      await chrome.sidePanel.open({ tabId: activeTab.id });
    }
  }
}

async function handleSetAPIKey(
  message: SetAPIKeyMessage,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  await chrome.storage.local.set({ ai_api_key: message.payload.apiKey });
  initAIClient({ apiKey: message.payload.apiKey });
  sendResponse({ success: true });
}

async function handleAIGenerateSelector(
  message: AIGenerateSelectorMessage,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  if (!isAIClientInitialized()) {
    sendResponse({ success: false, error: "AI client not initialized" });
    return;
  }

  try {
    const client = getAIClient();

    const result = await client.generateSelector({
      intent: message.payload.intent,
      targetHtml: message.payload.targetHtml,
      containerHtml: message.payload.containerHtml,
      anchorValue: message.payload.anchorValue,
    });

    sendResponse({ success: true, selectorLogic: result.selectorLogic });
  } catch (error) {
    console.error("[Homura] AI selector generation error:", error);
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleAIGenerateTool(
  message: AIGenerateToolMessage,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  if (!isAIClientInitialized()) {
    sendResponse({ success: false, error: "AI client not initialized" });
    return;
  }

  try {
    const client = getAIClient();

    const result = await client.generateTool({
      actions: message.payload.actions as never[],
      pageUrl: message.payload.pageUrl,
      pageTitle: message.payload.pageTitle,
      domSnapshot: "", // TODO: Get from content script
    });

    sendResponse({ success: true, tool: result.tool });
  } catch (error) {
    console.error("[Homura] AI tool generation error:", error);
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleAIGeneratePathSelector(
  message: AIGeneratePathSelectorMessage,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  if (!isAIClientInitialized()) {
    sendResponse({ success: false, error: "AI client not initialized" });
    return;
  }

  try {
    const client = getAIClient();

    // Use the new path-based selector generation
    const result = await client.generatePathSelector({
      intent: message.payload.intent,
      targetSelector: message.payload.targetSelector,
      targetHtml: message.payload.targetHtml,
      ancestorPath: message.payload.ancestorPath,
    });

    console.log("[Homura] AI path selector result:", result);

    sendResponse({
      success: true,
      pathSelector: result,
    });
  } catch (error) {
    console.error("[Homura] AI path selector generation error:", error);
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleAIGenerateSmartSelector(
  message: AIGenerateSmartSelectorMessage,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  console.log("[Background] Routing SmartSelector to AI service:", {
    containerType: message.payload.structureInfo.containerType,
    hasRepeating: message.payload.structureInfo.hasRepeatingStructure,
    anchorCount: message.payload.structureInfo.anchorCandidates.length,
  });

  if (!isAIClientInitialized()) {
    sendResponse({ success: false, error: "AI client not initialized" });
    return;
  }

  try {
    const client = getAIClient();

    // Use the smart selector generation method
    const result = await client.generateSmartSelector({
      intent: message.payload.intent,
      targetSelector: message.payload.targetSelector,
      targetHtml: message.payload.targetHtml,
      ancestorPath: message.payload.ancestorPath,
      structureInfo: message.payload.structureInfo,
    });

    console.log("[Background] SmartSelector result:", {
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
    console.error("[Background] SmartSelector generation error:", error);
    sendResponse({ success: false, error: String(error) });
  }
}

// =============================================================================
// NAVIGATION EXECUTION
// =============================================================================

interface NavigationOptions {
  url: string;
  tabId?: number;
  newTab?: boolean;
  setActive?: boolean;
}

interface NavigationResult {
  success: boolean;
  tabId?: number;
  error?: string;
}

async function executeNavigation(
  options: NavigationOptions,
): Promise<NavigationResult> {
  const { url, tabId, newTab = false, setActive = true } = options;

  try {
    // Validate URL
    if (!url || typeof url !== "string") {
      return { success: false, error: "Invalid URL" };
    }

    // Skip internal pages
    if (
      url.startsWith("chrome://") ||
      url.startsWith("chrome-extension://") ||
      url.startsWith("about:")
    ) {
      return { success: false, error: "Cannot navigate to internal pages" };
    }

    if (newTab || tabId === undefined) {
      // Create new tab
      const tab = await chrome.tabs.create({
        url,
        active: setActive,
      });

      console.log("[Homura] Navigated in new tab:", tab.id, "to:", url);
      return { success: true, tabId: tab.id };
    } else {
      // Navigate in existing tab
      await chrome.tabs.update(tabId, { url });
      console.log("[Homura] Navigated tab:", tabId, "to:", url);
      return { success: true, tabId };
    }
  } catch (error) {
    console.error("[Homura] Navigation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function handleExecuteNavigate(
  message: ExecuteNavigateMessage,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  const { url, newTab = false, setActive = true } = message.payload;

  const result = await executeNavigation({ url, newTab, setActive });
  sendResponse(result);
}

console.log("[Homura] Background service worker initialized");
