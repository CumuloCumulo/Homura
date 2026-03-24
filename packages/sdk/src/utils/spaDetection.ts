/**
 * =============================================================================
 * Homura SDK - SPA Detection
 * =============================================================================
 *
 * 检测当前页面是否是单页应用（SPA）
 * 用于决定是否需要延长等待时间
 */

import type { SPADetectionResult } from '../types/index.js';

/**
 * SPA 特征模式
 */
const SPA_PATTERNS = {
  // Vue.js 特征
  vue: [
    { selector: '#app', framework: 'vue' as const },
    { selector: '[data-v-]', framework: 'vue' as const },
    { selector: '[data-vue-root]', framework: 'vue' as const },
    { selector: '.vue-component', framework: 'vue' as const },
  ],

  // React 特征
  react: [
    { selector: '[data-reactroot]', framework: 'react' as const },
    { selector: '#root', framework: 'react' as const },
    { selector: '[data-reactid]', framework: 'react' as const },
    { selector: '._reactRootComponent', framework: 'react' as const },
  ],

  // Angular 特征
  angular: [
    { selector: '[ng-version]', framework: 'angular' as const },
    { selector: 'ng-app', framework: 'angular' as const },
    { selector: '[ng-reflect]', framework: 'angular' as const },
  ],
};

/**
 * 检测当前页面是否是 SPA
 *
 * @returns SPA 检测结果
 */
export function detectSPA(): SPADetectionResult {
  // 如果不在浏览器环境，返回默认结果
  if (typeof document === 'undefined') {
    return { isSPA: false, confidence: 0 };
  }

  // 检测各框架特征
  const detected: Array<{
    framework: string;
    confidence: number;
    selector: string;
  }> = [];

  for (const [framework, patterns] of Object.entries(SPA_PATTERNS)) {
    for (const pattern of patterns) {
      const element = document.querySelector(pattern.selector);
      if (element) {
        detected.push({
          framework,
          confidence: 0.9,
          selector: pattern.selector,
        });
        break; // 找到一个特征即可
      }
    }
  }

  if (detected.length === 0) {
    return { isSPA: false, confidence: 0 };
  }

  // 如果有多个框架被检测到，选择置信度最高的
  const bestMatch = detected[0];

  return {
    isSPA: true,
    framework: bestMatch.framework as 'vue' | 'react' | 'angular' | 'unknown',
    rootSelector: bestMatch.selector,
    confidence: bestMatch.confidence,
  };
}

/**
 * 检查页面是否正在加载
 *
 * 通过检测常见加载指示器
 *
 * @returns 是否正在加载
 */
export function isPageLoading(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  // 检查常见的加载指示器
  const loadingSelectors = [
    '.loading',
    '.spinner',
    '[data-loading="true"]',
    '.v-loading',
    '.ant-spin',
    '.el-loading-mask',
    '.el-loading-spinner',
    '#nprogress',
  ];

  for (const selector of loadingSelectors) {
    const element = document.querySelector(selector);
    if (element && getComputedStyle(element).display !== 'none') {
      return true;
    }
  }

  return false;
}

/**
 * 获取 SPA 根元素
 *
 * @returns 根元素或 null
 */
export function getSPARoot(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const result = detectSPA();

  if (!result.isSPA || !result.rootSelector) {
    return null;
  }

  const rootElement = document.querySelector(result.rootSelector);
  return rootElement as HTMLElement | null;
}
