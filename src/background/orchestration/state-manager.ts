/**
 * =============================================================================
 * Execution State Manager
 * =============================================================================
 *
 * 单一状态源，管理执行状态并自动持久化
 */

import type { ExecutionState } from '@homura/sdk/types';
import { CONFIG } from '../config';

/**
 * 执行状态管理器
 *
 * 提供单一状态源，自动同步到 chrome.storage
 */
export class ExecutionStateManager {
  private state: ExecutionState | null = null;

  /**
   * 获取当前状态
   */
  getState(): ExecutionState | null {
    return this.state;
  }

  /**
   * 从 storage 加载状态
   */
  async load(): Promise<ExecutionState | null> {
    const result = await chrome.storage.local.get(CONFIG.STORAGE.EXECUTION_STATE);
    this.state = result[CONFIG.STORAGE.EXECUTION_STATE] || null;
    return this.state;
  }

  /**
   * 更新状态并持久化
   */
  async update(updates: Partial<ExecutionState>): Promise<void> {
    if (!this.state) {
      console.warn('[StateManager] Cannot update: no state exists');
      return;
    }

    this.state = {
      ...this.state,
      ...updates,
      lastUpdate: new Date().toISOString(),
    };

    await this.save();
  }

  /**
   * 设置新状态
   */
  async setState(state: ExecutionState): Promise<void> {
    this.state = state;
    await this.save();
  }

  /**
   * 清除状态
   */
  async clear(): Promise<void> {
    this.state = null;
    await chrome.storage.local.remove(CONFIG.STORAGE.EXECUTION_STATE);
  }

  /**
   * 检查是否有正在进行的执行
   */
  isRunning(): boolean {
    return this.state?.status === 'running';
  }

  /**
   * 检查是否有暂停的执行（等待恢复）
   */
  isPaused(): boolean {
    return this.state?.status === 'paused';
  }

  /**
   * 获取当前工具索引
   */
  getCurrentIndex(): number {
    return this.state?.currentIndex ?? -1;
  }

  /**
   * 获取当前 Tab ID
   */
  getTabId(): number | undefined {
    return this.state?.tabId;
  }

  /**
   * 更新 Tab ID
   */
  async setTabId(tabId: number): Promise<void> {
    await this.update({ tabId });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async save(): Promise<void> {
    if (this.state) {
      await chrome.storage.local.set({
        [CONFIG.STORAGE.EXECUTION_STATE]: this.state,
      });
    }
  }
}

// 单例导出
export const stateManager = new ExecutionStateManager();
