/**
 * =============================================================================
 * Homura SDK - Page State Extraction
 * =============================================================================
 *
 * 为 AI Agent 提取页面摘要
 */

import type { PageState } from '../types/index.js';

// Check if we're in a browser environment
const isBrowser =
  typeof window !== 'undefined' && typeof document !== 'undefined';

export const BROWSER_REQUIRED_FOR_PAGE_STATE = true;

/**
 * 获取页面状态摘要
 *
 * 提取页面的关键信息，用于 AI 决策
 *
 * @returns 页面状态摘要
 */
export async function getPageState(): Promise<PageState> {
  if (!isBrowser) {
    throw new Error('[Homura SDK] getPageState requires a browser environment');
  }

  const text: string[] = [];
  const links: Array<{ text: string; href: string }> = [];
  const forms: Array<{ id: string; fields: string[] }> = [];
  const buttons: string[] = [];

  // 提取文本（有限制，避免过大）
  document.querySelectorAll('h1, h2, h3, p, span, a, button').forEach((el) => {
    const content = el.textContent?.trim();
    if (
      content &&
      content.length > 2 &&
      content.length < 100 &&
      text.length < 50
    ) {
      // 避免重复
      if (!text.includes(content)) {
        text.push(content);
      }
    }
  });

  // 提取链接
  document.querySelectorAll('a[href]').forEach((el) => {
    const textContent = el.textContent?.trim();
    const href = el.getAttribute('href');
    if (textContent && href && links.length < 20) {
      links.push({ text: textContent, href });
    }
  });

  // 提取表单
  document.querySelectorAll('form').forEach((form) => {
    const fields: string[] = [];
    form.querySelectorAll('input, textarea, select').forEach((input) => {
      const name =
        input.getAttribute('name') ||
        input.getAttribute('id') ||
        input.getAttribute('type');
      if (name && !fields.includes(name)) {
        fields.push(name);
      }
    });
    if (fields.length > 0 && forms.length < 5) {
      forms.push({
        id: form.id || form.name || `form-${forms.length}`,
        fields,
      });
    }
  });

  // 提取按钮
  document.querySelectorAll('button').forEach((btn) => {
    const textContent = btn.textContent?.trim();
    if (textContent && buttons.length < 15) {
      // 避免重复
      if (!buttons.includes(textContent)) {
        buttons.push(textContent);
      }
    }
  });

  return {
    url: window.location.href,
    title: document.title,
    summary: {
      text: text.slice(0, 20), // 限制数量
      links: links.slice(0, 10),
      forms: forms.slice(0, 5),
      buttons: buttons.slice(0, 10),
    },
  };
}

/**
 * 获取页面简快照（用于调试）
 */
export function getPageSnapshot(): string {
  if (!isBrowser) {
    throw new Error(
      '[Homura SDK] getPageSnapshot requires a browser environment',
    );
  }

  return `URL: ${window.location.href}
Title: ${document.title}
Visible Text: ${document.body?.textContent?.slice(0, 500) || 'N/A'}`;
}
