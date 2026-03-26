/**
 * =============================================================================
 * Homura SDK - Execution Readiness
 * =============================================================================
 *
 * 统一的页面就绪等待机制
 * 整合 DOM 稳定性、SPA 检测、目标元素预检
 */

import type { ReadinessConfig, ReadinessResult } from '../types/index.js';
import { detectSPA, isPageLoading } from './spaDetection.js';
import { waitForDOMStable } from './domStability.js';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<ReadinessConfig> = {
  skipWait: false,
  domStabilityTimeout: 10000, // 增加到 10 秒，适配复杂 SPA
  targetTimeout: 10000, // 增加到 10 秒
  spaExtraWait: 3000, // SPA 额外等待 3 秒
  pollInterval: 500,
  verbose: false,
};

/**
 * 等待目标元素出现
 *
 * @param selector - 目标选择器
 * @param timeout - 超时时间（毫秒）
 * @param config - 等待配置
 * @returns 是否找到
 */
export async function waitForTarget(
  selector: string,
  timeout: number,
  config: ReadinessConfig = {},
): Promise<boolean> {
  if (typeof document === 'undefined') {
    return false;
  }

  const { pollInterval = config.pollInterval ?? 500 } = config;

  const startTime = Date.now();

  console.log(`[Readiness] waitForTarget: ${selector}, timeout: ${timeout}ms`);

  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) {
      const elapsed = Date.now() - startTime;
      console.log(`[Readiness] ✓ Target found after ${elapsed}ms: ${selector}`);
      return true;
    }
    // 每 2 秒输出一次进度
    const elapsed = Date.now() - startTime;
    if (elapsed > 0 && elapsed % 2000 < pollInterval) {
      console.log(
        `[Readiness] Still waiting for target... (${elapsed}/${timeout}ms): ${selector}`,
      );
    }
    await sleep(pollInterval);
  }

  console.log(`[Readiness] ✗ Target NOT found after ${timeout}ms: ${selector}`);

  return false;
}

/**
 * 等待页面就绪
 *
 * 四层等待机制：
 * 1. 跳过检查（调试模式）
 * 2. DOM 稳定性检测
 * 3. SPA 识别 + 额外等待
 * 4. 目标元素预检
 *
 * @param selector - 目标选择器（可选）
 * @param config - 等待配置
 * @returns 等待结果
 */
export async function waitForReady(
  selector?: string,
  config: ReadinessConfig = {},
): Promise<ReadinessResult> {
  const startTime = Date.now();
  const layers: string[] = [];
  const result: ReadinessResult = {
    ready: false,
    layers: [],
    duration: 0,
    pageType: 'unknown',
  };

  // 合并默认配置
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Layer 0: 跳过等待（调试模式）
  if (finalConfig.skipWait) {
    result.ready = true;
    result.duration = 0;
    result.layers.push('skip');
    if (finalConfig.verbose) {
      console.log('[Readiness] Skip wait enabled, skipping all checks');
    }
    return result;
  }

  try {
    // Layer 1: DOM 稳定性检测
    if (finalConfig.verbose) {
      console.log('[Readiness] Layer 1: Checking DOM stability...');
    }

    const domStable = await waitForDOMStable(
      finalConfig.domStabilityTimeout,
      finalConfig,
    );

    layers.push('dom_stability');

    if (!domStable) {
      result.error = 'DOM did not stabilize within timeout';
      return result;
    }

    // Layer 2: SPA 检测和额外等待
    if (finalConfig.verbose) {
      console.log('[Readiness] Layer 2: Detecting SPA...');
    }

    const spaResult = detectSPA();
    result.pageType = spaResult.isSPA ? 'spa' : 'traditional';

    layers.push('spa_detection');

    if (spaResult.isSPA) {
      if (finalConfig.verbose) {
        console.log('[Readiness] SPA detected:', spaResult.framework);
      }

      // 检查是否还在加载中
      const loading = isPageLoading();
      if (loading) {
        if (finalConfig.verbose) {
          console.log('[Readiness] Page still loading, waiting...');
        }

        // 等待加载指示器消失
        const loadingWaitTime = finalConfig.spaExtraWait || 2000;
        await sleep(loadingWaitTime);
      }

      // 额外等待 SPA 内容渲染
      const extraWait = finalConfig.spaExtraWait || 2000;
      if (extraWait > 0) {
        if (finalConfig.verbose) {
          console.log(
            '[Readiness] Waiting extra time for SPA rendering:',
            extraWait,
            'ms',
          );
        }
        await sleep(extraWait);
      }

      // 再次检查 DOM 稳定性
      const stillStable = await waitForDOMStable(
        2000, // 短时间检查
        finalConfig,
      );
      if (!stillStable) {
        // SPA 仍在渲染中，继续等待
        if (finalConfig.verbose) {
          console.log('[Readiness] SPA still rendering, waiting more...');
        }
        await waitForDOMStable(finalConfig.domStabilityTimeout, finalConfig);
      }
    } else {
      if (finalConfig.verbose) {
        console.log('[Readiness] Traditional page detected');
      }
    }

    // Layer 3: 目标元素预检（如果提供了选择器）
    if (selector) {
      layers.push('target_check');

      if (finalConfig.verbose) {
        console.log('[Readiness] Layer 3: Checking target element:', selector);
      }

      // 检查元素是否已存在
      const elementExists = document.querySelector(selector) !== null;

      if (elementExists) {
        // 元素已存在，直接就绪
        if (finalConfig.verbose) {
          console.log('[Readiness] Target element already exists');
        }
      } else {
        // 元素不存在，等待出现
        const targetTimeout = spaResult.isSPA
          ? (finalConfig.targetTimeout || 5000) +
            (finalConfig.spaExtraWait || 2000)
          : finalConfig.targetTimeout || 5000;

        if (finalConfig.verbose) {
          console.log(
            '[Readiness] Target not found, waiting up to',
            targetTimeout,
            'ms',
          );
        }

        const found = await waitForTarget(selector, targetTimeout, finalConfig);

        if (!found) {
          result.error = `目标元素超时: ${selector}`;
          return result;
        }
      }
    }

    // 所有检查通过
    result.ready = true;
    result.duration = Date.now() - startTime;

    if (finalConfig.verbose) {
      console.log('[Readiness] Page ready after', result.duration, 'ms');
    }

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    result.duration = Date.now() - startTime;

    if (finalConfig.verbose) {
      console.error('[Readiness] Error during readiness check:', error);
    }

    return result;
  }
}

/**
 * 辅助函数：延迟
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
