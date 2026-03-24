/**
 * =============================================================================
 * Homura SDK - NAVIGATE Primitive
 * =============================================================================
 *
 * 跨页面安全的导航原语
 * - 通过 background 执行，避免 content script 中断
 * - 返回新页面信息，支持状态恢复
 */

import type { NavigateParams } from '../types/index.js';

// Check if we're in a browser environment
const isBrowser =
  typeof window !== 'undefined' && typeof location !== 'undefined';

export const BROWSER_REQUIRED = true;

/**
 * 导航结果
 */
export interface NavigateResult {
  /** 目标 URL */
  url: string;
  /** 页面是否跳转 */
  navigated: boolean;
  /** 新页面 URL（如果已跳转） */
  newUrl?: string;
}

/**
 * NAVIGATE Primitive
 *
 * 特殊处理：通过消息发送到 background 执行
 *
 * @param params - 导航参数
 * @returns 导航结果
 */
export async function executeNavigate(
  params: NavigateParams,
): Promise<NavigateResult> {
  if (!isBrowser) {
    throw new Error(
      '[Homura SDK] executeNavigate requires a browser environment',
    );
  }

  const { url, waitForLoad = true } = params;

  // 检查是否在 content script 中（有 chrome.runtime）
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      // 获取当前 tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab?.id) {
        // 发送到 background 执行导航
        await chrome.runtime.sendMessage({
          type: 'HOMURA_NAVIGATE',
          tabId: tab.id,
          url,
          waitForLoad,
        });

        // 返回跳转信息
        return {
          url,
          navigated: true,
          newUrl: url,
        };
      }
    } catch (e) {
      // 无法发送到 background（可能是在测试环境），使用直接执行
      console.warn(
        '[Homura SDK] Cannot send to background, using direct navigation:',
        e,
      );
    }
  }

  // 直接执行（fallback，用于测试或非扩展环境）
  if (waitForLoad) {
    return new Promise((resolve) => {
      const handleLoad = () => {
        window.removeEventListener('load', handleLoad);
        resolve({
          url,
          navigated: true,
          newUrl: window.location.href,
        });
      };
      window.addEventListener('load', handleLoad);

      // 设置超时，防止页面加载卡住
      setTimeout(() => {
        window.removeEventListener('load', handleLoad);
        resolve({
          url,
          navigated: true,
          newUrl: url,
        });
      }, 5000);

      window.location.href = url;
    });
  } else {
    window.location.href = url;
    return {
      url,
      navigated: true,
      newUrl: url,
    };
  }
}

/**
 * 判断是否为跨域导航
 */
export function isCrossOriginNavigation(url: string): boolean {
  if (!isBrowser) {
    return false;
  }

  try {
    const target = new URL(url, window.location.href);
    return target.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * 判断是否为同页面导航
 */
export function isSamePageNavigation(url: string): boolean {
  if (!isBrowser) {
    return false;
  }

  try {
    const target = new URL(url, window.location.href);
    return (
      target.origin === window.location.origin &&
      target.pathname === window.location.pathname &&
      target.search === window.location.search
    );
  } catch {
    return false;
  }
}
