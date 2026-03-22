/**
 * =============================================================================
 * Homura Extension-Specific Constants
 * =============================================================================
 *
 * This file contains constants that are specific to the Chrome Extension.
 * For SDK constants, import directly from @homura/sdk/constants.
 *
 * Constants previously here have been moved to the SDK:
 * - HIGHLIGHT_COLORS -> @homura/sdk/constants
 * - Selector constants -> @homura/sdk/constants
 * =============================================================================
 */

/** Storage keys for extension state */
export const STORAGE_KEYS = {
  RECORDING_STATE: "homura_recording_state",
  TOOL_LIBRARY: "homura_tool_library",
  RULE_BOOK: "homura_rule_book",
  SELECTOR_DRAFT: "homura_selector_draft",
} as const;

/** Chrome extension IDs */
export const EXTENSION_IDS = {
  SIDEPANEL: "homura-sidepanel",
  DASHBOARD: "homura-dashboard",
} as const;
