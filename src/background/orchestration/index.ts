/**
 * =============================================================================
 * Background Orchestrator - Main Entry
 * =============================================================================
 *
 * 协调跨页面工具执行，整合各模块
 */

import type {
  ExecutionState,
  AtomicTool,
  ExecuteToolResult,
} from '@homura/sdk/types';
import { sleep } from '@homura/sdk/utils';
import { CONFIG } from '../config';
import { stateManager } from './state-manager';
import { tabTracker } from './tab-tracker';
import { retryManager } from './retry-manager';
import { contentScriptManager } from './content-script-manager';

// ============================================================================
// Types
// ============================================================================

export interface ToolExecution {
  tool: AtomicTool;
  params: Record<string, unknown>;
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * 初始化 Orchestrator
 *
 * 在 background script 中调用，设置监听器
 */
export function initOrchestrator(): void {
  // 监听 tab 更新（页面加载完成）
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      await handleTabUpdate(tabId, tab);
    }
  });

  console.log('[Orchestrator] Initialized');
}

// ============================================================================
// Public API
// ============================================================================

/**
 * 开始执行工具集
 */
export async function startExecution(
  tools: ToolExecution[],
  tabId: number,
): Promise<ExecutionState> {
  const id = generateExecutionId();

  const state: ExecutionState = {
    id,
    mode: 'sequential',
    currentIndex: 0,
    tools: tools.map((t) => ({
      tool: t.tool,
      params: t.params,
      status: 'pending' as const,
      retryCount: 0,
    })),
    variables: {},
    history: [],
    status: 'running',
    startTime: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
    tabId,
  };

  await stateManager.setState(state);
  await executeNextTool(tabId);

  return state;
}

/**
 * 取消执行
 */
export async function cancelExecution(): Promise<void> {
  const state = stateManager.getState();
  if (state) {
    await stateManager.update({ status: 'failed' });
    console.log('[Orchestrator] Execution cancelled');
  }
}

/**
 * 获取当前执行状态
 */
export async function getExecutionState(): Promise<ExecutionState | null> {
  return stateManager.load();
}

/**
 * 清除执行状态
 */
export async function clearExecutionState(): Promise<void> {
  await stateManager.clear();
}

// ============================================================================
// Internal Functions
// ============================================================================

/**
 * 处理 tab 更新事件
 */
async function handleTabUpdate(
  tabId: number,
  _tab: chrome.tabs.Tab,
): Promise<void> {
  const state = stateManager.getState();

  console.log(
    `[Orchestrator] Tab ${tabId} loaded, state:`,
    state ? `${state.status} (tabId: ${state.tabId})` : 'null',
  );

  if (state?.status === 'paused') {
    console.log(
      `[Orchestrator] Resuming execution on tab ${tabId}, was tracking tab ${state.tabId}`,
    );
    await stateManager.setTabId(tabId);
    await resumeExecution(tabId);
  }
}

/**
 * 恢复执行
 */
async function resumeExecution(tabId: number): Promise<void> {
  const state = stateManager.getState();
  if (!state || state.status !== 'paused') {
    return;
  }

  await stateManager.update({ status: 'running', tabId });
  await executeNextTool(tabId);
}

/**
 * 执行下一个工具
 */
async function executeNextTool(tabId: number): Promise<void> {
  const state = stateManager.getState();
  if (!state || state.status !== 'running') {
    return;
  }

  // 找到下一个待执行的工具
  const nextIndex = state.tools.findIndex((t) => t.status === 'pending');

  if (nextIndex === -1) {
    // 全部完成
    await stateManager.update({ status: 'completed' });
    console.log('[Orchestrator] Execution completed');
    return;
  }

  const toolExec = state.tools[nextIndex];
  console.log(
    `[Orchestrator] Executing tool ${nextIndex + 1}/${state.tools.length}: ${toolExec.tool.name}`,
  );

  await stateManager.update({
    currentIndex: nextIndex,
    tools: state.tools.map((t, i) =>
      i === nextIndex ? { ...t, status: 'running' as const } : t,
    ),
  });

  try {
    const result = await retryManager.executeWithRetry(
      tabId,
      toolExec.tool,
      toolExec.params as Record<string, string | number | boolean>,
    );

    // 处理执行结果
    await handleToolResult(tabId, nextIndex, result);
  } catch (error) {
    console.error('[Orchestrator] Tool execution error:', error);
    await handleToolFailure(nextIndex, error);
  }
}

/**
 * 处理工具执行结果
 */
async function handleToolResult(
  tabId: number,
  toolIndex: number,
  result: ExecuteToolResult,
): Promise<void> {
  const state = stateManager.getState();
  if (!state) return;

  const toolExec = state.tools[toolIndex];

  // 更新工具状态
  const updatedTools = state.tools.map((t, i) =>
    i === toolIndex
      ? {
          ...t,
          status: result.success ? ('completed' as const) : ('failed' as const),
          result,
          timestamp: new Date().toISOString(),
        }
      : t,
  );

  // 添加到历史
  const history = [
    ...state.history,
    {
      index: toolIndex,
      toolId: toolExec.tool.tool_id,
      toolName: toolExec.tool.name,
      result,
      timestamp: new Date().toISOString(),
    },
  ];

  await stateManager.update({ tools: updatedTools, history });

  // 检查页面跳转
  if (result.metadata?.pageNavigated) {
    await stateManager.update({
      currentUrl: result.metadata.newUrl,
      status: 'paused',
    });
    console.log('[Orchestrator] Page navigation detected, execution paused');
    return;
  }

  // 处理失败
  if (!result.success) {
    await stateManager.update({ status: 'failed' });
    console.error('[Orchestrator] Execution failed:', result.error);
    return;
  }

  // 检测新 tab
  const newTab = await tabTracker.detectNewTab(tabId);
  if (newTab?.id) {
    await handleTabSwitch(newTab.id);
    tabId = newTab.id;
  } else {
    // 同一页面延迟
    await sleep(CONFIG.DELAY.SAME_TAB_TOOL);
  }

  // 继续执行下一个工具
  await executeNextTool(tabId);
}

/**
 * 处理工具执行失败
 */
async function handleToolFailure(
  toolIndex: number,
  error: unknown,
): Promise<void> {
  const state = stateManager.getState();
  if (!state) return;

  const errorMessage = error instanceof Error ? error.message : String(error);

  const updatedTools = state.tools.map((t, i) =>
    i === toolIndex
      ? {
          ...t,
          status: 'failed' as const,
          timestamp: new Date().toISOString(),
        }
      : t,
  );

  await stateManager.update({
    tools: updatedTools,
    status: 'failed',
  });

  console.error('[Orchestrator] Tool execution failed:', errorMessage);
}

/**
 * 处理 tab 切换
 */
async function handleTabSwitch(newTabId: number): Promise<void> {
  const state = stateManager.getState();
  if (!state) return;

  await stateManager.update({ tabId: newTabId });

  console.log(`[Orchestrator] Switched to new tab ${newTabId}`);

  // 等待 content script 就绪
  const ready = await contentScriptManager.waitForReady(newTabId);
  if (!ready) {
    console.warn(
      `[Orchestrator] Content script not ready in tab ${newTabId}, continuing anyway`,
    );
  }

  // 新 tab 延迟
  await sleep(CONFIG.DELAY.NEW_TAB_CONTEXT);
}

// ============================================================================
// Helpers
// ============================================================================

function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// Legacy Exports (for backward compatibility)
// ============================================================================

// 导出 resumeExecution 供外部使用
export { resumeExecution };

// 导出 stateManager 的方法作为独立函数
export const loadExecutionState = (): Promise<ExecutionState | null> =>
  stateManager.load();
export const saveExecutionState = (state: ExecutionState): Promise<void> =>
  stateManager.setState(state);
export const clearExecutionStateAsync = (): Promise<void> =>
  stateManager.clear();

export { stateManager, tabTracker, retryManager, contentScriptManager };
