/**
 * =============================================================================
 * Homura - Background Service Worker
 * =============================================================================
 * 
 * The orchestration layer that coordinates tool execution.
 */

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Set side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

interface RunMissionMessage {
  type: 'RUN_MISSION';
  payload: {
    tools: Array<{ tool: unknown; params: Record<string, string | number | boolean> }>;
  };
}

// Handle messages from SidePanel
chrome.runtime.onMessage.addListener((
  message: RunMissionMessage, 
  _sender: chrome.runtime.MessageSender, 
  sendResponse: (response: unknown) => void
) => {
  if (message.type === 'RUN_MISSION') {
    import('./orchestrator').then(async ({ runMission }) => {
      const result = await runMission(message.payload.tools as Parameters<typeof runMission>[0], (context, result) => {
        // Send progress updates to SidePanel
        chrome.runtime.sendMessage({
          type: 'MISSION_PROGRESS',
          payload: { context, result },
        });
      });
      sendResponse(result);
    });
    return true;
  }
  
  return false;
});

console.log('[Homura] Background service worker initialized');
