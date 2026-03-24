/**
 * =============================================================================
 * Homura SDK - Execution Engine
 * =============================================================================
 *
 * 状态持久化的工具集执行引擎
 * 支持暂停、恢复、重试、跨页面执行
 */

import type {
  ExecutionState,
  ExecutionConfig,
  ToolExecution,
  ExecuteToolResult,
  ExecutionError,
  AtomicTool,
} from '../types/index.js';
import { executeTool } from '../executor/index.js';

const STORAGE_KEY = 'homura_execution_state';

/**
 * 执行引擎
 *
 * 管理工具集的执行，支持状态持久化、恢复、重试
 */
export class ExecutionEngine {
  private state: ExecutionState | null = null;
  private config: ExecutionConfig;
  private abortController: AbortController | null = null;

  constructor(config: ExecutionConfig = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      failureStrategy: 'stop',
      ...config,
    };
  }

  /**
   * 开始执行工具集
   *
   * @param tools - 工具列表
   * @param initialVariables - 初始变量
   * @returns 执行状态
   */
  async execute(
    tools: Array<{ tool: AtomicTool; params: Record<string, unknown> }>,
    initialVariables: Record<string, unknown> = {}
  ): Promise<ExecutionState> {
    const id = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    this.state = {
      id,
      mode: 'sequential',
      currentIndex: 0,
      tools: tools.map(t => ({
        tool: t.tool,
        params: t.params,
        status: 'pending' as const,
        retryCount: 0,
      })),
      variables: { ...initialVariables },
      history: [],
      status: 'running',
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
    };

    this.abortController = new AbortController();
    await this.saveState();

    try {
      for (let i = 0; i < this.state.tools.length; i++) {
        if (this.abortController.signal.aborted) {
          throw new Error('执行已取消');
        }

        this.state.currentIndex = i;
        const toolExec = this.state.tools[i];

        // 执行工具（带重试）
        const result = await this.executeWithRetry(toolExec);

        // 更新状态
        toolExec.result = result;
        toolExec.status = result.success ? 'completed' : 'failed';
        toolExec.timestamp = new Date().toISOString();

        this.state.history.push({
          index: i,
          toolId: toolExec.tool.tool_id,
          toolName: toolExec.tool.name,
          result,
          timestamp: new Date().toISOString(),
        });

        // 检查页面跳转
        if (result.metadata?.pageNavigated) {
          this.state.currentUrl = result.metadata.newUrl;
          await this.saveState();
          // 暂停执行，等待页面加载后恢复
          this.state.status = 'paused';
          await this.saveState();
          this.config.onPaused?.('页面跳转，等待恢复', this.state);
          return this.state;
        }

        // 处理失败
        if (!result.success) {
          if (this.config.failureStrategy === 'stop') {
            this.state.status = 'failed';
            this.config.onError?.(result.error!, this.state);
            await this.saveState();
            return this.state;
          }
          // continue 策略：继续执行
        }

        await this.saveState();
        this.config.onProgress?.(this.state);
      }

      this.state.status = 'completed';
      this.config.onComplete?.(this.state);
      await this.saveState();
      return this.state;

    } catch (error) {
      this.state.status = 'failed';
      this.config.onError?.(
        {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        this.state
      );
      await this.saveState();
      return this.state;
    }
  }

  /**
   * 执行单个工具（带重试）
   *
   * @param toolExec - 工具执行对象
   * @returns 执行结果
   */
  private async executeWithRetry(
    toolExec: ToolExecution
  ): Promise<ExecuteToolResult> {
    const maxRetries = this.config.maxRetries || 3;
    let lastError: ExecutionError | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      toolExec.retryCount = attempt;

      try {
        const result = await executeTool(
          toolExec.tool,
          toolExec.params as Record<string, string | number | boolean>,
          { debug: this.config.debug }
        );

        if (result.success) {
          return result;
        }

        // 记录错误
        lastError = result.error;

        // 可重试的错误
        if (this.isRetryableError(result.error)) {
          if (attempt < maxRetries) {
            await this.delay(this.config.retryDelay || 1000);
            continue;
          }
        }

        return result;

      } catch (error) {
        lastError = {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : String(error),
        };

        if (attempt < maxRetries) {
          await this.delay(this.config.retryDelay || 1000);
          continue;
        }

        return { success: false, error: lastError };
      }
    }

    return { success: false, error: lastError };
  }

  /**
   * 恢复执行
   *
   * @returns 执行状态
   */
  async resume(): Promise<ExecutionState> {
    if (!this.state) {
      // 尝试从存储加载
      this.state = await this.loadState();
    }

    if (!this.state) {
      throw new Error('没有可恢复的执行状态');
    }

    if (this.state.status !== 'paused') {
      throw new Error(`状态不允许恢复: ${this.state.status}`);
    }

    this.state.status = 'running';
    this.abortController = new AbortController();

    // 从当前索引继续
    const startIndex = this.state.currentIndex + 1;

    for (let i = startIndex; i < this.state.tools.length; i++) {
      if (this.abortController.signal.aborted) {
        throw new Error('执行已取消');
      }

      this.state.currentIndex = i;
      const toolExec = this.state.tools[i];

      // 执行工具
      const result = await this.executeWithRetry(toolExec);

      // 更新状态
      toolExec.result = result;
      toolExec.status = result.success ? 'completed' : 'failed';
      toolExec.timestamp = new Date().toISOString();

      this.state.history.push({
        index: i,
        toolId: toolExec.tool.tool_id,
        toolName: toolExec.tool.name,
        result,
        timestamp: new Date().toISOString(),
      });

      // 检查页面跳转
      if (result.metadata?.pageNavigated) {
        this.state.currentUrl = result.metadata.newUrl;
        await this.saveState();
        this.state.status = 'paused';
        await this.saveState();
        this.config.onPaused?.('页面跳转，等待恢复', this.state);
        return this.state;
      }

      // 处理失败
      if (!result.success && this.config.failureStrategy === 'stop') {
        this.state.status = 'failed';
        this.config.onError?.(result.error!, this.state);
        await this.saveState();
        return this.state;
      }

      await this.saveState();
      this.config.onProgress?.(this.state);
    }

    this.state.status = 'completed';
    this.config.onComplete?.(this.state);
    await this.saveState();
    return this.state;
  }

  /**
   * 暂停执行
   */
  pause(): void {
    if (this.state) {
      this.state.status = 'paused';
      this.abortController?.abort();
    }
  }

  /**
   * 取消执行
   */
  cancel(): void {
    this.abortController?.abort();
    this.state = null;
    this.clearState();
  }

  /**
   * 获取当前状态
   *
   * @returns 当前执行状态
   */
  getState(): ExecutionState | null {
    return this.state;
  }

  /**
   * 更新变量上下文
   *
   * @param variables - 要更新的变量
   */
  updateVariables(variables: Record<string, unknown>): void {
    if (this.state) {
      this.state.variables = { ...this.state.variables, ...variables };
    }
  }

  /**
   * 保存状态到存储
   */
  private async saveState(): Promise<void> {
    if (this.state) {
      // 在浏览器环境中使用 chrome.storage.local
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [STORAGE_KEY]: this.state });
      }
      // 在非浏览器环境中（如测试），可以跳过持久化
    }
  }

  /**
   * 从存储加载状态
   */
  private async loadState(): Promise<ExecutionState | null> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      return result[STORAGE_KEY] || null;
    }
    return null;
  }

  /**
   * 清除状态
   */
  private async clearState(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.remove(STORAGE_KEY);
    }
  }

  /**
   * 判断错误是否可重试
   *
   * @param error - 执行错误
   * @returns 是否可重试
   */
  private isRetryableError(error?: ExecutionError): boolean {
    if (!error) return false;

    const retryableCodes = ['TIMEOUT', 'TARGET_NOT_FOUND', 'ACTION_FAILED'];
    return retryableCodes.includes(error.code);
  }

  /**
   * 延迟
   *
   * @param ms - 毫秒数
   * @returns Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 工厂函数：创建执行引擎
 *
 * @param config - 执行配置
 * @returns 执行引擎实例
 */
export function createExecutionEngine(
  config?: ExecutionConfig
): ExecutionEngine {
  return new ExecutionEngine(config);
}

/**
 * 从存储加载执行状态
 *
 * @returns 执行状态或 null
 */
export async function loadExecutionState(): Promise<ExecutionState | null> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || null;
  }
  return null;
}

/**
 * 清除存储的执行状态
 */
export async function clearExecutionState(): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.remove(STORAGE_KEY);
  }
}
