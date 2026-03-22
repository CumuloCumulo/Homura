/**
 * =============================================================================
 * Homura Constants (Compatibility Layer)
 * =============================================================================
 *
 * This file now re-exports constants from @homura/sdk for backward compatibility.
 * New code should import directly from @homura/sdk.
 */

// Re-export all constants from SDK
export * from "@homura/sdk/constants";

// =============================================================================
// EXTENSION-SPECIFIC CONSTANTS
// =============================================================================
//
// Constants that are specific to the Chrome Extension and not part of the SDK.
// =============================================================================

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
