/**
 * =============================================================================
 * Homura SDK - Primitives Module
 * =============================================================================
 *
 * Primitive action executors - the building blocks of automation.
 *
 * These are the hardcoded, battle-tested DOM operations.
 * AI cannot modify these - it can only invoke them through Atomic Tools.
 */

// CLICK
export { executeClick, BROWSER_REQUIRED as CLICK_BROWSER_REQUIRED } from './click.js';

// INPUT
export { executeInput, BROWSER_REQUIRED as INPUT_BROWSER_REQUIRED } from './input.js';

// EXTRACT_TEXT
export { executeExtractText } from './extract.js';

// WAIT_FOR
export { executeWaitFor, BROWSER_REQUIRED as WAIT_BROWSER_REQUIRED } from './wait.js';

// NAVIGATE
export { executeNavigate, BROWSER_REQUIRED as NAVIGATE_BROWSER_REQUIRED } from './navigate.js';
