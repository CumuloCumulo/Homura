/**
 * =============================================================================
 * Homura SidePanel - Test Store
 * =============================================================================
 *
 * 统一的测试状态管理
 * - 合并了之前分散在 TestPanel 和 testState 中的状态
 * - 提供类型安全的操作方法
 * - 自动同步到 chrome.storage
 */

import { create } from 'zustand';
import type { AtomicTool, ExecutionState } from '@homura/sdk/types';

// =============================================================================
// 类型定义
// =============================================================================

export type TestStatus = 'idle' | 'running' | 'completed' | 'failed';

/**
 * 单个工具测试结果
 */
export interface ToolTestResult {
  toolId: string;
  toolName: string;
  success: boolean;
  duration: number;
  data?: unknown;
  error?: string;
  timestamp: string;
}

/**
 * 测试状态存储
 */
interface TestStore {
  // ==========================================================================
  // 工具集状态
  // ==========================================================================

  /** 当前工具集 ID */
  toolkitId: string | null;
  /** 当前工具集名称 */
  toolkitName: string;
  /** 当前工具列表 */
  tools: AtomicTool[];

  // ==========================================================================
  // 执行状态
  // ==========================================================================

  /** 测试状态 */
  testStatus: TestStatus;
  /** 当前执行的工具索引（-1 表示没有正在执行） */
  currentToolIndex: number;
  /** 执行 ID（用于轮询） */
  executionId: string | null;
  /** 测试结果列表 */
  results: ToolTestResult[];

  // ==========================================================================
  // 执行锁（防止并发执行）
  // ==========================================================================

  /** 是否正在执行（内部锁） */
  isExecuting: boolean;
  /** 是否请求停止 */
  stopRequested: boolean;

  // ==========================================================================
  // Actions - 工具集操作
  // ==========================================================================

  /** 设置工具集 */
  setToolkit: (
    toolkitId: string,
    toolkitName: string,
    tools: AtomicTool[],
  ) => void;
  /** 清除工具集 */
  clearToolkit: () => void;

  // ==========================================================================
  // Actions - 执行操作
  // ==========================================================================

  /** 设置测试状态 */
  setTestStatus: (status: TestStatus) => void;
  /** 设置当前工具索引 */
  setCurrentToolIndex: (index: number) => void;
  /** 设置执行 ID */
  setExecutionId: (id: string | null) => void;
  /** 添加或更新测试结果 */
  setToolResult: (result: ToolTestResult) => void;
  /** 设置所有结果（从 Orchestrator 同步） */
  setResults: (results: ToolTestResult[]) => void;
  /** 清除结果 */
  clearResults: () => void;

  // ==========================================================================
  // Actions - 执行锁操作
  // ==========================================================================

  /** 设置执行锁 */
  setIsExecuting: (executing: boolean) => void;
  /** 设置停止请求 */
  setStopRequested: (requested: boolean) => void;
  /** 重置执行状态（完成或取消后调用） */
  resetExecution: () => void;

  // ==========================================================================
  // Actions - 从 Orchestrator 状态同步
  // ==========================================================================

  /** 从 ExecutionState 同步状态 */
  syncFromExecutionState: (state: ExecutionState) => void;
}

// =============================================================================
// Store 实现
// =============================================================================

export const useTestStore = create<TestStore>((set) => ({
  // 工具集状态 - 初始值
  toolkitId: null,
  toolkitName: '',
  tools: [],

  // 执行状态 - 初始值
  testStatus: 'idle',
  currentToolIndex: -1,
  executionId: null,
  results: [],

  // 执行锁 - 初始值
  isExecuting: false,
  stopRequested: false,

  // Actions - 工具集操作
  setToolkit: (toolkitId, toolkitName, tools) => {
    set({
      toolkitId,
      toolkitName,
      tools,
      // 重置执行状态
      testStatus: 'idle',
      currentToolIndex: -1,
      executionId: null,
      results: [],
      isExecuting: false,
      stopRequested: false,
    });
  },

  clearToolkit: () => {
    set({
      toolkitId: null,
      toolkitName: '',
      tools: [],
      testStatus: 'idle',
      currentToolIndex: -1,
      executionId: null,
      results: [],
      isExecuting: false,
      stopRequested: false,
    });
  },

  // Actions - 执行操作
  setTestStatus: (status) => set({ testStatus: status }),
  setCurrentToolIndex: (index) => set({ currentToolIndex: index }),
  setExecutionId: (id) => set({ executionId: id }),

  setToolResult: (result) => {
    set((state) => {
      // 替换已存在的同 ID 结果
      const newResults = [
        ...state.results.filter((r) => r.toolId !== result.toolId),
        result,
      ];
      return { results: newResults };
    });
  },

  setResults: (results) => set({ results }),

  clearResults: () => {
    set({
      results: [],
      testStatus: 'idle',
    });
  },

  // Actions - 执行锁操作
  setIsExecuting: (executing) => set({ isExecuting: executing }),
  setStopRequested: (requested) => set({ stopRequested: requested }),

  resetExecution: () => {
    set({
      testStatus: 'idle',
      currentToolIndex: -1,
      executionId: null,
      isExecuting: false,
      stopRequested: false,
    });
  },

  // Actions - 从 Orchestrator 状态同步
  syncFromExecutionState: (state) => {
    const results: ToolTestResult[] = state.history.map((h) => {
      // 安全地提取错误信息
      let errorMessage: string | undefined = undefined;
      if (h.result.error) {
        if (typeof h.result.error === 'string') {
          errorMessage = h.result.error;
        } else if (
          typeof h.result.error === 'object' &&
          h.result.error !== null
        ) {
          const errorObj = h.result.error as {
            message?: string;
            code?: string;
            [key: string]: unknown;
          };
          errorMessage = errorObj.message || JSON.stringify(errorObj);
        } else {
          errorMessage = String(h.result.error);
        }
      }

      return {
        toolId: h.toolId,
        toolName: h.toolName,
        success: h.result.success,
        duration: h.result.metadata?.duration || 0,
        data: h.result.data,
        error: errorMessage,
        timestamp: h.timestamp,
      };
    });

    // 更新状态
    set({
      currentToolIndex: state.currentIndex,
      results,
    });

    // 根据执行状态更新测试状态
    if (state.status === 'completed') {
      set({
        testStatus: 'completed',
        executionId: null,
        isExecuting: false,
      });
      // 2 秒后重置
      setTimeout(() => {
        set({ testStatus: 'idle', currentToolIndex: -1 });
      }, 2000);
    } else if (state.status === 'failed') {
      set({
        testStatus: 'failed',
        executionId: null,
        isExecuting: false,
      });
      // 2 秒后重置
      setTimeout(() => {
        set({ testStatus: 'idle', currentToolIndex: -1 });
      }, 2000);
    }
  },
}));
