/**
 * =============================================================================
 * Homura - Debug Highlighter
 * =============================================================================
 * 
 * Provides visual debugging by highlighting elements during execution.
 * Creates overlay divs that follow element positions.
 */

import { HIGHLIGHT_COLORS, CSS_CLASSES } from '@shared/constants';

interface HighlightOptions {
  color: string;
  label?: string;
  duration?: number;
}

const activeHighlights = new Map<string, HTMLDivElement>();

/**
 * Highlight an element with a colored overlay
 */
export function highlightElement(
  element: Element, 
  id: string,
  options: HighlightOptions
): void {
  // Remove existing highlight with same ID
  removeHighlight(id);

  const rect = element.getBoundingClientRect();
  
  const overlay = document.createElement('div');
  overlay.className = CSS_CLASSES.highlightOverlay;
  overlay.id = `homura-highlight-${id}`;
  
  Object.assign(overlay.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    backgroundColor: options.color,
    border: `2px solid ${options.color.replace('0.5', '1')}`,
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: '2147483647',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  });

  // Add label if provided
  if (options.label) {
    const label = document.createElement('div');
    Object.assign(label.style, {
      position: 'absolute',
      top: '-24px',
      left: '0',
      backgroundColor: options.color.replace('0.5', '0.9'),
      color: 'white',
      fontSize: '11px',
      fontFamily: 'system-ui, sans-serif',
      fontWeight: '600',
      padding: '2px 8px',
      borderRadius: '4px 4px 0 0',
      whiteSpace: 'nowrap',
    });
    label.textContent = options.label;
    overlay.appendChild(label);
  }

  document.body.appendChild(overlay);
  activeHighlights.set(id, overlay);

  // Auto-remove after duration
  if (options.duration && options.duration > 0) {
    setTimeout(() => removeHighlight(id), options.duration);
  }
}

/**
 * Remove a specific highlight
 */
export function removeHighlight(id: string): void {
  const overlay = activeHighlights.get(id);
  if (overlay) {
    overlay.remove();
    activeHighlights.delete(id);
  }
}

/**
 * Clear all highlights
 */
export function clearAllHighlights(): void {
  activeHighlights.forEach((overlay) => overlay.remove());
  activeHighlights.clear();
}

/**
 * Highlight scope elements (blue)
 */
export function highlightScope(elements: Element[]): void {
  elements.forEach((el, index) => {
    highlightElement(el, `scope-${index}`, {
      color: HIGHLIGHT_COLORS.scope,
      label: `Scope [${index}]`,
    });
  });
}

/**
 * Highlight anchor-matched element (green)
 */
export function highlightAnchor(element: Element, index: number): void {
  highlightElement(element, 'anchor', {
    color: HIGHLIGHT_COLORS.anchor,
    label: `Anchor Match [${index}]`,
  });
}

/**
 * Highlight target element (orange)
 */
export function highlightTarget(element: Element): void {
  highlightElement(element, 'target', {
    color: HIGHLIGHT_COLORS.target,
    label: 'Target',
  });
}

/**
 * Highlight error (red)
 */
export function highlightError(element: Element | null, message: string): void {
  if (!element) return;
  
  highlightElement(element, 'error', {
    color: HIGHLIGHT_COLORS.error,
    label: `Error: ${message}`,
    duration: 5000,
  });
}

/**
 * Flash animation for action feedback
 */
export function flashElement(element: Element, success: boolean): void {
  const color = success 
    ? 'rgba(34, 197, 94, 0.6)'  // Green for success
    : 'rgba(239, 68, 68, 0.6)'; // Red for failure
  
  highlightElement(element, 'flash', {
    color,
    duration: 500,
  });
}
