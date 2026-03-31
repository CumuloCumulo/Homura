/**
 * =============================================================================
 * Retry Manager
 * =============================================================================
 *
 * 管理工具执行的重试逻辑
 */

import type { AtomicTool, ExecuteToolResult } from '@homura/sdk/types';
import { CONFIG } from '../config';
import { executeToolOnTab } from '../messaging';

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract error message safely from any error type
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }

  return String(error);
}

/**
 * 重试管理器
 *
 * 处理工具执行失败后的重试逻辑
 */
export class RetryManager {
  /**
   * 执行工具（带重试）
   *
   * @param tabId - Tab ID
   * @param tool - 工具定义
   * @param params - 参数
   * @param maxRetries - 最大重试次数
   */
  async executeWithRetry(
    tabId: number,
    tool: AtomicTool,
    params: Record<string, string | number | boolean>,
    maxRetries = CONFIG.RETRY.MAX_ATTEMPTS,
  ): Promise<ExecuteToolResult> {
    const delays = CONFIG.RETRY.DELAYS;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await executeToolOnTab(tabId, tool, params, false);
      } catch (error) {
        const isLastAttempt = attempt === maxRetries - 1;
        const errorMessage = extractErrorMessage(error);

        // 检查是否是 content script 未就绪的错误
        if (this.isContentScriptNotReadyError(errorMessage)) {
          if (!isLastAttempt) {
            const delay = delays[attempt] || delays[delays.length - 1];
            console.log(
              `[RetryManager] Content script not ready, retry ${attempt + 1}/${maxRetries} after ${delay}ms`,
            );
            await sleep(delay);
            continue;
          }
        }

        // 其他错误或最后一次重试失败
        if (isLastAttempt) {
          return this.createErrorResult(
            'TIMEOUT',
            `Failed after ${maxRetries} retries: ${errorMessage}`,
          );
        }
      }
    }

    return this.createErrorResult('UNKNOWN', 'Unknown execution error');
  }

  /**
   * 检查是否是 content script 未就绪的错误
   */
  isContentScriptNotReadyError(message: string): boolean {
    return (
      message.includes('Receiving end does not exist') ||
      message.includes('message port closed') ||
      message.includes('Could not establish connection')
    );
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createErrorResult(
    code: 'TIMEOUT' | 'UNKNOWN',
    message: string,
  ): ExecuteToolResult {
    return {
      success: false,
      error: {
        code,
        message,
      },
    };
  }
}

// 单例导出
export const retryManager = new RetryManager();
