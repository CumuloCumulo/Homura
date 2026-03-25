/**
 * =============================================================================
 * Background Orchestrator
 * =============================================================================
 *
 * 协调跨页面工具执行，处理 NAVIGATE 操作
 * - 监听 tab 更新事件
 * - 恢复跨页面中断的执行
 * - 处理来自 content script 的导航请求
 */

import type {
  ExecutionState,
  AtomicTool,
  ExecuteToolResult,
} from '@homura/sdk/types';
import { executeToolOnTab } from './messaging';

const STORAGE_KEY = 'homura_execution_state';

/**
 * 初始化 Orchestrator
 *
 * 在 background script 中初始化，设置监听器
 */
export function initOrchestrator(): void {
  // 监听 tab 更新（页面加载完成）
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      // 检查是否有等待恢复的执行
      const state = await loadExecutionState();
      console.log(
        `[Orchestrator] Tab ${tabId} loaded, state:`,
        state ? `${state.status} (tabId: ${state.tabId})` : 'null',
      );

      if (state && state.status === 'paused') {
        // 不再检查 tabId 匹配，因为页面跳转可能打开新 tab
        // 只要状态是 paused，就在当前 tab 继续执行
        console.log(
          `[Orchestrator] Resuming execution on tab ${tabId}, was tracking tab ${state.tabId}`,
        );
        // 更新 tabId 为当前 tab
        state.tabId = tabId;
        await saveExecutionState(state);
        await resumeExecution(tabId);
      }
    }
  });

  console.log('[Orchestrator] Initialized');
}

/**
 * 开始执行工具集
 *
 * @param tools - 工具列表
 * @param tabId - Tab ID
 * @returns 执行状态
 */
async function startExecution(
  tools: Array<{ tool: AtomicTool; params: Record<string, unknown> }>,
  tabId: number,
): Promise<ExecutionState> {
  const id = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const state: ExecutionState = {
    id,
    mode: 'sequential',
    currentIndex: 0,
    tools: tools.map((t) => ({
      tool: t.tool as AtomicTool,
      params: t.params,
      status: 'pending' as const,
      retryCount: 0,
    })),
    variables: {},
    history: [],
    status: 'running',
    startTime: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
    currentUrl: undefined,
    tabId,
  };

  await saveExecutionState(state);

  // 开始执行第一个工具
  await executeNextTool(tabId);

  return state;
}

/**
 * 恢复执行
 *
 * @param tabId - Tab ID
 * @returns 执行状态
 */
async function resumeExecution(tabId: number): Promise<ExecutionState> {
  const state = await loadExecutionState();
  if (!state) {
    throw new Error('没有可恢复的执行状态');
  }

  if (state.status !== 'paused') {
    return state;
  }

  state.status = 'running';
  state.tabId = tabId;
  await saveExecutionState(state);

  // 继续执行
  await executeNextTool(tabId);

  return state;
}

/**
 * 执行下一个工具
 *
 * @param tabId - Tab ID
 */
async function executeNextTool(tabId: number): Promise<void> {
  const state = await loadExecutionState();
  if (!state || state.status !== 'running') {
    return;
  }

  // 找到下一个待执行的工具
  const nextIndex = state.tools.findIndex((t) => t.status === 'pending');

  if (nextIndex === -1) {
    // 全部完成
    state.status = 'completed';
    await saveExecutionState(state);
    console.log('[Orchestrator] Execution completed');
    return;
  }

  const toolExec = state.tools[nextIndex];
  console.log(
    `[Orchestrator] Executing tool ${nextIndex + 1}/${state.tools.length}: ${toolExec.tool.name}`,
  );

  state.currentIndex = nextIndex;
  toolExec.status = 'running';
  await saveExecutionState(state);

  try {
    // 等待 content script 准备好（带重试）
    const result = await executeToolWithRetry(
      tabId,
      toolExec.tool,
      toolExec.params as Record<string, string | number | boolean>,
    );

    // 更新状态
    toolExec.result = result;
    toolExec.status = result.success ? 'completed' : 'failed';
    toolExec.timestamp = new Date().toISOString();

    state.history.push({
      index: nextIndex,
      toolId: toolExec.tool.tool_id,
      toolName: toolExec.tool.name,
      result,
      timestamp: new Date().toISOString(),
    });

    state.lastUpdate = new Date().toISOString();

    // 检查页面跳转
    if (result.metadata?.pageNavigated) {
      state.currentUrl = result.metadata.newUrl;
      state.status = 'paused';
      // 保持 tabId 不变，因为是同一个 tab 跳转
      await saveExecutionState(state);
      console.log(
        '[Orchestrator] Page navigation detected, execution paused. tabId:',
        state.tabId,
        'newUrl:',
        result.metadata.newUrl,
      );
      return;
    }

    // 处理失败
    if (!result.success) {
      state.status = 'failed';
      await saveExecutionState(state);
      console.error('[Orchestrator] Execution failed:', result.error);
      return;
    }

    await saveExecutionState(state);

    // 工具间延迟：给页面变化（异步跳转、DOM 更新）留出时间
    // 特别是点击操作可能触发异步导航或 SPA 路由变化
    const toolDelay = 500;
    console.log(`[Orchestrator] Waiting ${toolDelay}ms before next tool...`);
    await new Promise((resolve) => setTimeout(resolve, toolDelay));

    // 检测是否有新 tab 打开（点击可能触发 target="_blank" 等）
    // 使用当前 tabId 作为基准，检测比当前 tab 更新的 tab
    const allTabs = await chrome.tabs.query({});

    // 找出比当前 tabId 更新的 tab（说明是工具执行过程中打开的）
    const newerTabs = allTabs.filter((t) => t.id && t.id > tabId);
    if (newerTabs.length > 0) {
      // 按创建时间排序，取最新的
      const newestTab = newerTabs.sort((a, b) => (b.id || 0) - (a.id || 0))[0];
      if (newestTab.id && newestTab.id !== tabId) {
        console.log(
          `[Orchestrator] New tab detected: ${newestTab.id}, switching context from ${tabId}`,
        );
        // 更新状态中的 tabId
        state.tabId = newestTab.id;
        state.currentUrl = newestTab.url;
        await saveExecutionState(state);
        tabId = newestTab.id; // 更新本地变量

        // 等待新 tab 的 content script 准备好
        console.log(
          `[Orchestrator] Waiting for content script in tab ${tabId}...`,
        );
        const contentScriptReady = await waitForContentScript(tabId, 5000);
        if (!contentScriptReady) {
          console.warn(
            `[Orchestrator] Content script not ready in tab ${tabId} after 5s, continuing anyway`,
          );
        } else {
          console.log(`[Orchestrator] Content script ready in tab ${tabId}`);
        }
      }
    }

    // 继续执行下一个工具
    await executeNextTool(tabId);
  } catch (error) {
    console.error('[Orchestrator] Tool execution error:', error);
    toolExec.status = 'failed';
    toolExec.timestamp = new Date().toISOString();
    state.status = 'failed';
    await saveExecutionState(state);
  }
}

/**
 * 等待 content script 准备好
 *
 * @param tabId - Tab ID
 * @param timeout - 超时时间（毫秒）
 * @returns 是否准备好
 */
async function waitForContentScript(
  tabId: number,
  timeout = 5000,
): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 200;

  // 首先检查 tab 是否可访问（排除内部页面）
  try {
    const tab = await chrome.tabs.get(tabId);
    if (
      !tab.url ||
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('about:')
    ) {
      console.warn(
        `[Orchestrator] Tab ${tabId} is internal page (${tab.url}), content script cannot be injected`,
      );
      return false;
    }
  } catch (error) {
    console.warn(`[Orchestrator] Cannot access tab ${tabId}:`, error);
    return false;
  }

  // 如果 tab 还在加载中，先等待加载完成
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status !== 'complete') {
      console.log(
        `[Orchestrator] Tab ${tabId} is loading (${tab.status}), waiting...`,
      );
      await new Promise<void>((resolve) => {
        const listener = (
          updatedTabId: number,
          changeInfo: chrome.tabs.TabChangeInfo,
        ) => {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);

        // 设置超时，避免永久等待
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }, timeout);
      });
    }
  } catch (error) {
    console.warn(
      `[Orchestrator] Error waiting for tab ${tabId} to load:`,
      error,
    );
  }

  // 等待 content script 响应
  while (Date.now() - startTime < timeout) {
    try {
      // 尝试发送 ping 消息
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      return true;
    } catch {
      // Content script 还没准备好，等待后重试
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  return false;
}

/**
 * 执行工具（带重试，等待 content script 准备好）
 */
async function executeToolWithRetry(
  tabId: number,
  tool: AtomicTool,
  params: Record<string, string | number | boolean>,
  maxRetries = 5,
): Promise<ExecuteToolResult> {
  const delays = [200, 400, 800, 1500, 3000];

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await executeToolOnTab(tabId, tool, params, false);
    } catch (error) {
      const isLastAttempt = i === maxRetries - 1;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // 检查是否是 content script 未就绪的错误
      if (
        errorMessage.includes('Receiving end does not exist') ||
        errorMessage.includes('message port closed') ||
        errorMessage.includes('Could not establish connection')
      ) {
        if (!isLastAttempt) {
          console.log(
            `[Orchestrator] Content script not ready, retry ${i + 1}/${maxRetries} after ${delays[i]}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delays[i]));
          continue;
        }
      }

      // 其他错误或最后一次重试失败
      if (isLastAttempt) {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: `Failed after ${maxRetries} retries: ${errorMessage}`,
          },
        };
      }
    }
  }

  return {
    success: false,
    error: {
      code: 'UNKNOWN',
      message: 'Unknown execution error',
    },
  };
}

/**
 * 加载执行状态
 */
async function loadExecutionState(): Promise<ExecutionState | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || null;
}

/**
 * 保存执行状态
 */
async function saveExecutionState(state: ExecutionState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

/**
 * 清除执行状态
 */
async function clearExecutionState(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}

// ============================================================================
// Exports
// ============================================================================

// initOrchestrator 已经在文件顶部导出
export {
  startExecution,
  resumeExecution,
  loadExecutionState,
  clearExecutionState,
};
