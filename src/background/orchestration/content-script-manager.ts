/**
 * =============================================================================
 * Content Script Manager
 * =============================================================================
 *
 * 管理 content script 的注入和就绪检查
 */

import { sleep } from '@homura/sdk/utils';
import { CONFIG } from '../config';
import { TabTracker } from './tab-tracker';

/**
 * Content Script 管理器
 *
 * 负责检测、注入和等待 content script 就绪
 */
export class ContentScriptManager {
  private tabTracker: TabTracker;

  constructor(tabTracker: TabTracker) {
    this.tabTracker = tabTracker;
  }

  /**
   * 等待 content script 准备好
   *
   * @param tabId - Tab ID
   * @param timeout - 超时时间（毫秒）
   */
  async waitForReady(tabId: number, timeout = 5000): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = CONFIG.POLLING.CONTENT_SCRIPT;
    let injected = false;

    // 首先检查 tab 是否可访问
    try {
      const tab = await chrome.tabs.get(tabId);
      if (this.tabTracker.isInternalPage(tab)) {
        console.warn(
          `[ContentScriptManager] Tab ${tabId} is internal page, cannot inject`,
        );
        return false;
      }
    } catch (error) {
      console.warn(`[ContentScriptManager] Cannot access tab ${tabId}:`, error);
      return false;
    }

    // 等待 tab 加载完成
    await this.tabTracker.waitForTabReady(tabId, timeout);

    // 等待 content script 响应
    while (Date.now() - startTime < timeout) {
      try {
        // 尝试发送 ping 消息
        await chrome.tabs.sendMessage(tabId, { type: 'PING' });
        return true;
      } catch {
        // Content script 还没准备好
        const elapsed = Date.now() - startTime;

        // 如果已经等待超过 1 秒且还没尝试过注入，尝试主动注入
        if (elapsed > 1000 && !injected) {
          injected = await this.tryInject(tabId);
        }

        // 等待后重试
        await sleep(pollInterval);
      }
    }

    return false;
  }

  /**
   * 尝试注入 content script
   */
  private async tryInject(tabId: number): Promise<boolean> {
    try {
      // 读取 manifest 声明的 content script 文件
      const contentScriptFiles =
        chrome.runtime.getManifest().content_scripts?.[0]?.js;

      if (!contentScriptFiles || contentScriptFiles.length === 0) {
        return false;
      }

      // 使用 scripting API 注入
      await chrome.scripting.executeScript({
        target: { tabId },
        files: contentScriptFiles,
      });

      console.log(
        `[ContentScriptManager] Injected content script into tab ${tabId}`,
      );

      // 注入后等待初始化
      await sleep(CONFIG.DELAY.POST_INJECTION);
      return true;
    } catch (error) {
      console.debug(
        `[ContentScriptManager] Injection failed (may be normal):`,
        error,
      );
      return false;
    }
  }
}

// 创建实例
const tabTracker = new TabTracker();
export const contentScriptManager = new ContentScriptManager(tabTracker);
