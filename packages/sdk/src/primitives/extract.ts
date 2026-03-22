/**
 * =============================================================================
 * Homura SDK - EXTRACT_TEXT Primitive
 * =============================================================================
 *
 * Extracts text content or attribute from element(s).
 */

import type { ExtractTextParams } from '../types/index.js';

/**
 * EXTRACT_TEXT Primitive
 *
 * Extracts text content or attribute from element(s).
 */
export function executeExtractText(
  elements: Element | Element[],
  params: ExtractTextParams = {}
): string | string[] {
  const { multiple = false, attribute } = params;
  const elementArray = Array.isArray(elements) ? elements : [elements];

  const extractFromElement = (el: Element): string => {
    if (attribute) {
      return el.getAttribute(attribute) || '';
    }
    return el.textContent?.trim() || '';
  };

  if (multiple) {
    return elementArray.map(extractFromElement);
  }

  return extractFromElement(elementArray[0]);
}
