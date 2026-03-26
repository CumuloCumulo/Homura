/**
 * =============================================================================
 * Background Orchestrator - Backward Compatibility Layer
 * =============================================================================
 *
 * 重导出模块化的 orchestrator API，保持向后兼容
 *
 * @deprecated 直接从 './orchestration/index' 导入
 */

export {
  initOrchestrator,
  startExecution,
  cancelExecution,
  getExecutionState,
  clearExecutionState,
  resumeExecution,
  loadExecutionState,
  saveExecutionState,
  stateManager,
  tabTracker,
  retryManager,
  contentScriptManager,
} from './orchestration/index.js';

// 类型导出
export type { ToolExecution } from './orchestration/index.js';
