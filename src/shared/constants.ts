/**
 * Homura Constants
 */

/** Debug highlight colors */
export const HIGHLIGHT_COLORS = {
  scope: 'rgba(59, 130, 246, 0.5)',    // Blue for scope
  anchor: 'rgba(34, 197, 94, 0.5)',    // Green for anchor
  target: 'rgba(249, 115, 22, 0.5)',   // Orange for target
  error: 'rgba(239, 68, 68, 0.5)',     // Red for errors
} as const;

/** Default timeouts */
export const TIMEOUTS = {
  waitForElement: 5000,
  actionDelay: 100,
  typeDelay: 50,
} as const;

/** CSS class names for injected elements */
export const CSS_CLASSES = {
  highlightOverlay: 'homura-highlight-overlay',
  debugPanel: 'homura-debug-panel',
} as const;
