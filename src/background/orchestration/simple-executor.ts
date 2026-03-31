/**
 * =============================================================================
 * Simple Mode Executor
 * =============================================================================
 *
 * 轻量级顺序执行器，使用固定时间间隔执行工具
 * 适用场景：单页面快速测试、同页面工作流
 *
 * 特点：
 * - 无页面跳转检测
 * - 固定延迟间隔
 * - 快速失败（无重试）
 * - 无状态持久化
 */

import type {
  AtomicTool,
  ExecutionState,
  ExecuteToolResult,
  SimpleExecutionConfig,
} from '@homura/sdk/types';
import { executeToolOnTab } from '../messaging';

// ============================================================================
// Types
// ============================================================================

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 简单执行器状态
 */
export interface SimpleExecutorState {
  /** 执行 ID */
  id: string;
  /** 当前工具索引 */
  currentIndex: number;
  /** 工具列表 */
  tools: Array<{
    tool: AtomicTool;
    params: Record<string, unknown>;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: ExecuteToolResult;
    timestamp?: string;
  }>;
  /** 执行状态 */
  status: 'idle' | 'running' | 'completed' | 'failed';
  /** 开始时间 */
  startTime: string;
  /** 最后更新时间 */
  lastUpdate: string;
  /** Tab ID */
  tabId: number;
  /** 执行配置 */
  config: SimpleExecutionConfig;
  /** 执行历史 */
  history: Array<{
    index: number;
    toolId: string;
    toolName: string;
    result: ExecuteToolResult;
    timestamp: string;
  }>;
  /** 错误信息 */
  error?: string;
}

// ============================================================================
// Simple Executor
// ============================================================================

class SimpleExecutor {
  private state: SimpleExecutorState | null = null;
  private isCancelled = false;

  /**
   * 启动简单模式执行
   */
  async start(
    tools: Array<{ tool: AtomicTool; params: Record<string, unknown> }>,
    tabId: number,
    config: SimpleExecutionConfig = { mode: 'simple', toolDelay: 2000 },
  ): Promise<SimpleExecutorState> {
    const id = this.generateExecutionId();

    this.state = {
      id,
      currentIndex: 0,
      tools: tools.map((t) => ({
        tool: t.tool,
        params: t.params,
        status: 'pending' as const,
      })),
      status: 'running',
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      tabId,
      config,
      history: [],
    };

    this.isCancelled = false;
    console.log('[SimpleExecutor] Starting execution:', {
      id,
      toolCount: tools.length,
      config,
    });

    // 异步执行（不阻塞响应）
    this.execute(tabId, config).catch((error) => {
      console.error('[SimpleExecutor] Execution error:', error);
      if (this.state) {
        this.state.status = 'failed';
        this.state.error =
          error instanceof Error ? error.message : String(error);
        this.state.lastUpdate = new Date().toISOString();
      }
    });

    return this.state;
  }

  /**
   * 执行工具序列
   */
  private async execute(
    tabId: number,
    config: SimpleExecutionConfig,
  ): Promise<void> {
    if (!this.state) return;

    const toolDelay = config.toolDelay || 2000;

    for (let i = 0; i < this.state.tools.length; i++) {
      // 检查是否被取消
      if (this.isCancelled) {
        console.log('[SimpleExecutor] Execution cancelled at index', i);
        if (this.state) {
          this.state.status = 'failed';
          this.state.error = '执行被取消';
        }
        return;
      }

      const toolExec = this.state.tools[i];
      const tool = toolExec.tool;
      const params = toolExec.params as Record<
        string,
        string | number | boolean
      >;

      console.log(
        `[SimpleExecutor] Executing tool ${i + 1}/${this.state.tools.length}: ${tool.name}`,
      );

      // 更新状态为运行中
      toolExec.status = 'running';
      this.state.currentIndex = i;
      this.state.lastUpdate = new Date().toISOString();

      const startTime = Date.now();

      try {
        // 执行工具
        const result = await executeToolOnTab(
          tabId,
          tool,
          params,
          false, // debug
        );

        const duration = Date.now() - startTime;

        // 更新工具状态
        toolExec.status = result.success ? 'completed' : 'failed';
        toolExec.result = result;
        toolExec.timestamp = new Date().toISOString();

        // 添加到历史
        this.state.history.push({
          index: i,
          toolId: tool.tool_id,
          toolName: tool.name,
          result,
          timestamp: new Date().toISOString(),
        });

        this.state.lastUpdate = new Date().toISOString();

        // 输出结果
        if (result.success) {
          console.log(
            `[SimpleExecutor] ✓ Tool ${i + 1} SUCCEEDED: ${tool.name} (${duration}ms)`,
          );
        } else {
          console.log(
            `[SimpleExecutor] ✗ Tool ${i + 1} FAILED: ${tool.name} (${duration}ms)`,
          );
          console.log(`[SimpleExecutor]   Error:`, result.error);

          // 简单模式：快速失败，停止执行
          this.state.status = 'failed';
          this.state.error = result.error
            ? typeof result.error === 'string'
              ? result.error
              : result.error.message || '未知错误'
            : '工具执行失败';
          return;
        }

        // 等待固定延迟（最后一个工具不需要等待）
        if (i < this.state.tools.length - 1) {
          console.log(
            `[SimpleExecutor] Waiting ${toolDelay}ms before next tool...`,
          );
          await sleep(toolDelay);
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.log(
          `[SimpleExecutor] ✗ Tool ${i + 1} EXCEPTION: ${tool.name} (${duration}ms)`,
        );
        console.log(`[SimpleExecutor]   Exception:`, error);

        // 更新工具状态
        toolExec.status = 'failed';
        toolExec.result = {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: errorMessage,
          },
          metadata: { duration },
        };
        toolExec.timestamp = new Date().toISOString();

        this.state.lastUpdate = new Date().toISOString();

        // 简单模式：快速失败
        this.state.status = 'failed';
        this.state.error = errorMessage;
        return;
      }
    }

    // 所有工具执行完成
    if (this.state) {
      this.state.status = 'completed';
      this.state.currentIndex = this.state.tools.length;
      this.state.lastUpdate = new Date().toISOString();
      console.log('[SimpleExecutor] All tools completed successfully');
    }
  }

  /**
   * 取消执行
   */
  async cancel(): Promise<void> {
    console.log('[SimpleExecutor] Cancelling execution...');
    this.isCancelled = true;
    if (this.state) {
      this.state.status = 'failed';
      this.state.error = '执行被取消';
      this.state.lastUpdate = new Date().toISOString();
    }
  }

  /**
   * 获取当前状态
   */
  getState(): SimpleExecutorState | null {
    return this.state;
  }

  /**
   * 清除状态
   */
  clear(): void {
    this.state = null;
    this.isCancelled = false;
  }

  /**
   * 生成执行 ID
   */
  private generateExecutionId(): string {
    return `simple_exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * 将 SimpleExecutorState 转换为 ExecutionState（兼容现有 API）
   */
  toExecutionState(): ExecutionState | null {
    if (!this.state) return null;

    return {
      id: this.state.id,
      mode: 'sequential',
      executionMode: 'simple',
      executionConfig: this.state.config,
      currentIndex: this.state.currentIndex,
      tools: this.state.tools.map((t) => ({
        tool: t.tool,
        params: t.params,
        status: t.status,
        result: t.result,
        retryCount: 0,
        timestamp: t.timestamp,
      })),
      variables: {},
      history: this.state.history,
      status: this.state.status as
        | 'idle'
        | 'running'
        | 'paused'
        | 'completed'
        | 'failed',
      startTime: this.state.startTime,
      lastUpdate: this.state.lastUpdate,
      tabId: this.state.tabId,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const simpleExecutor = new SimpleExecutor();
