/**
 * =============================================================================
 * Tab Tracker
 * =============================================================================
 *
 * 追踪 tab 切换，检测新打开的 tab
 */

import { CONFIG } from '../config';

/**
 * Tab 追踪器
 *
 * 负责检测新 tab、等待 tab 加载、管理 tab 上下文
 */
export class TabTracker {
  /**
   * 检测是否有新 tab 打开
   *
   * @param currentTabId - 当前 tab ID
   * @returns 最新的 tab（如果有新 tab 打开）
   */
  async detectNewTab(currentTabId: number): Promise<chrome.tabs.Tab | null> {
    const allTabs = await chrome.tabs.query({});

    // 找出比当前 tabId 更新的 tab（说明是工具执行过程中打开的）
    const newerTabs = allTabs.filter((t) => t.id && t.id > currentTabId);

    if (newerTabs.length === 0) {
      return null;
    }

    // 按创建时间排序，取最新的
    const newestTab = newerTabs.sort((a, b) => (b.id || 0) - (a.id || 0))[0];

    if (newestTab.id && newestTab.id !== currentTabId) {
      console.log(
        `[TabTracker] New tab detected: ${newestTab.id} (was ${currentTabId})`,
      );
      return newestTab;
    }

    return null;
  }

  /**
   * 等待 tab 加载完成
   *
   * @param tabId - Tab ID
   * @param timeout - 超时时间（毫秒）
   */
  async waitForTabReady(
    tabId: number,
    timeout: number = CONFIG.TIMEOUT.PAGE_READY,
  ): Promise<boolean> {
    try {
      const tab = await chrome.tabs.get(tabId);

      // 检查是否是内部页面
      if (this.isInternalPage(tab)) {
        console.warn(`[TabTracker] Tab ${tabId} is internal page, cannot wait`);
        return false;
      }

      // 如果已经加载完成，直接返回
      if (tab.status === 'complete') {
        return true;
      }

      // 等待加载完成
      return new Promise((resolve) => {
        const listener = (
          updatedTabId: number,
          changeInfo: chrome.tabs.TabChangeInfo,
        ) => {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve(true);
          }
        };

        chrome.tabs.onUpdated.addListener(listener);

        // 超时处理
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(false);
        }, timeout);
      });
    } catch (error) {
      console.warn(`[TabTracker] Error waiting for tab ${tabId}:`, error);
      return false;
    }
  }

  /**
   * 检查是否是内部页面（无法注入 content script）
   */
  isInternalPage(tab: chrome.tabs.Tab): boolean {
    return (
      !tab.url ||
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('about:') ||
      tab.url.startsWith('chrome-extension://')
    );
  }

  /**
   * 获取当前活动 tab
   */
  async getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tab;
  }
}

// 单例导出
export const tabTracker = new TabTracker();
