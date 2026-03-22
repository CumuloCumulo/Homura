/**
 * =============================================================================
 * Primitives Type Definitions
 * =============================================================================
 *
 * The building blocks of Homura automation - hardcoded atomic actions.
 * AI cannot invent new action types; it can only use these.
 */

/**
 * Primitive action types - the only allowed actions in the system.
 */
export type PrimitiveAction =
  | 'CLICK'         // Click on an element
  | 'INPUT'         // Input text into a field
  | 'EXTRACT_TEXT'  // Extract text content from element(s)
  | 'WAIT_FOR'      // Wait for an element to appear
  | 'NAVIGATE';     // Navigate to a URL

/**
 * Parameters for CLICK action
 */
export interface ClickParams {
  /** Whether to use debug mode (Chrome DevTools Protocol) for bot detection bypass */
  debugMode?: boolean;
}

/**
 * Parameters for INPUT action
 */
export interface InputParams {
  /** The value to input */
  value: string;
  /** Whether to clear existing content first */
  clearFirst?: boolean;
  /** Delay between keystrokes (ms) for realistic typing */
  typeDelay?: number;
}

/**
 * Parameters for EXTRACT_TEXT action
 */
export interface ExtractTextParams {
  /** Whether to extract from multiple elements */
  multiple?: boolean;
  /** Attribute to extract instead of textContent */
  attribute?: string;
}

/**
 * Parameters for WAIT_FOR action
 */
export interface WaitForParams {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Wait for element to be visible (not just in DOM) */
  visible?: boolean;
}

/**
 * Parameters for NAVIGATE action
 */
export interface NavigateParams {
  /** URL to navigate to */
  url: string;
  /** Whether to wait for page load to complete */
  waitForLoad?: boolean;
}

/**
 * Union type of all action parameters
 */
export type ActionParams = ClickParams | InputParams | ExtractTextParams | WaitForParams | NavigateParams;
