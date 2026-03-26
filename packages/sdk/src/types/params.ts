/**
 * =============================================================================
 * Homura SDK - Tool Parameters
 * =============================================================================
 *
 * 明确定工具参数类型，替代 Record<string, unknown>
 */

/**
 * 工具参数类型
 */
export interface ToolParams {
  /** 目标 URL */
  url?: string;
  /** 输入值 */
  value?: string;
  /** 索引值 */
  index?: number;
  /** 用于列表选择的索引 */
  itemIndex?: number;
  /** 等待 DOM 碜定的超时 */
  waitForDomStability?: number;
  /** 启用调试模式（显示 highlights, slow execution) */
  debug?: boolean;
  /** 提取数据 */
  extractText?: boolean;
  /** 点击触发的滚动偏移量 */
  scrollOffset?: number;
  /** 匹配锚点 */
  matchAnchorIndex?: number;
  /** 匹配目标元素 */
  matchTargetIndex?: number;
  /** 仅匹配目标元素 */
  matchTargetOnly?: boolean;
  /** 仅匹配锚点元素 */
  matchAnchorOnly?: boolean;
  /** 用于 `fill` 的匹配索引 */
  fillIndex?: number;
  /** 用于 `select` 的值索引 */
  selectIndex?: number;
  /** 用于 `scroll` 的滚动距离 */
  scrollDistance?: number;
}
