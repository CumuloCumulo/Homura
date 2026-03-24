/**
 * =============================================================================
 * Homura SDK - DOM Stability Detection
 * =============================================================================
 *
 * 检测 DOM 是否已稳定（不再快速变化）
 * 用于判断单页应用是否已完成渲染
 */

import type { ReadinessConfig, DOMFingerprint } from '../types/index.js';

/**
 * 生成 DOM 指纹
 *
 * @returns DOM 指纹
 */
export function generateDOMFingerprint(): DOMFingerprint {
  if (typeof document === 'undefined') {
    return {
      elementCount: 0,
      keySelectors: {},
      structureHash: '',
    };
  }

  // 元素数量
  const elementCount = document.querySelectorAll('*').length;

  // 关键选择器的存在状态（常见的关键元素）
  const keySelectors: Record<string, boolean> = {
    button: document.querySelectorAll('button').length > 0,
    input: document.querySelectorAll('input').length > 0,
    a: document.querySelectorAll('a').length > 0,
    table: document.querySelectorAll('table').length > 0,
    form: document.querySelectorAll('form').length > 0,
    '[role="button"]': document.querySelectorAll('[role="button"]').length > 0,
  };

  // HTML 结构哈希（简化版 - 只取前 10 个元素的标签名）
  const elements = Array.from(document.querySelectorAll('*')).slice(0, 10);
  const structureHash = elements
    .map((el) => el.tagName.toLowerCase())
    .join(',');

  return {
    elementCount,
    keySelectors,
    structureHash,
  };
}

/**
 * 对比两个 DOM 指纹是否相同
 *
 * @param a - 第一个指纹
 * @param b - 第二个指纹
 * @param tolerance - 元素数量容差（允许的变化量）
 * @returns 是否相同
 */
export function compareFingerprints(
  a: DOMFingerprint,
  b: DOMFingerprint,
  tolerance: number = 5,
): boolean {
  const elementCountStable =
    Math.abs(a.elementCount - b.elementCount) <= tolerance;

  const structureStable = a.structureHash === b.structureHash;

  const keySelectorsStable =
    Object.keys(a.keySelectors).length === Object.keys(b.keySelectors).length &&
    Object.entries(a.keySelectors).every(
      ([key, value]) => b.keySelectors[key] === value,
    );

  return elementCountStable && structureStable && keySelectorsStable;
}

/**
 * 等待 DOM 稳定
 *
 * 通过连续两次 DOM 指纹对比来检测 DOM 是否稳定
 * 使用滑动窗口策略：需要连续 stableCount 次快照相同才认为稳定
 *
 * @param timeout - 超时时间（毫秒），默认 5000
 * @param config - 等待配置
 * @returns 是否稳定
 */
export async function waitForDOMStable(
  timeout: number = 5000,
  config: ReadinessConfig = {},
): Promise<boolean> {
  if (typeof document === 'undefined') {
    return true;
  }

  const {
    pollInterval = config.pollInterval ?? 500,
    verbose = config.verbose ?? false,
  } = config;

  const startTime = Date.now();
  let previousSnapshot = generateDOMFingerprint();
  let stableCount = 0;
  const requiredStableCount = 2; // 需要连续 2 次快照相同

  if (verbose) {
    console.log('[Readiness] Initial DOM fingerprint:', previousSnapshot);
  }

  while (Date.now() - startTime < timeout) {
    await sleep(pollInterval);

    const currentSnapshot = generateDOMFingerprint();

    if (verbose) {
      console.log('[Readiness] Comparing fingerprints:', {
        previous: previousSnapshot,
        current: currentSnapshot,
        stable: compareFingerprints(previousSnapshot, currentSnapshot),
      });
    }

    if (compareFingerprints(previousSnapshot, currentSnapshot)) {
      stableCount++;
      if (verbose) {
        console.log(
          `[Readiness] Snapshot stable (${stableCount}/${requiredStableCount})`,
        );
      }

      if (stableCount >= requiredStableCount) {
        if (verbose) {
          console.log(
            '[Readiness] DOM stable after',
            Date.now() - startTime,
            'ms',
          );
        }
        return true;
      }
    } else {
      // 快照不同，重置计数
      stableCount = 0;
    }

    // 更新快照，继续等待
    previousSnapshot = currentSnapshot;
  }

  if (verbose) {
    console.log('[Readiness] DOM did not stabilize within', timeout, 'ms');
  }

  return false;
}

/**
 * 辅助函数：延迟
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
