/**
 * =============================================================================
 * Homura - Selector Validator
 * =============================================================================
 * 
 * Validates selector logic against the current DOM
 */

import type { SelectorLogic } from '@shared/types';
import type { SelectorDraft, ValidationResult } from './types';
import { safeQuerySelectorAll, safeQuerySelector, matchText } from '@shared/utils';

/**
 * Validate a selector draft against the current DOM
 */
export function validateSelectorDraft(draft: SelectorDraft): ValidationResult {
  try {
    // If no scope, just validate target
    if (!draft.scope) {
      const targets = safeQuerySelectorAll(draft.target.selector);
      return {
        valid: targets.length > 0,
        scopeMatches: 0,
        anchorMatchIndex: -1,
        targetFound: targets.length > 0,
        error: targets.length === 0 ? `Target not found: ${draft.target.selector}` : undefined,
      };
    }
    
    // Validate scope
    const scopeElements = safeQuerySelectorAll(draft.scope.selector);
    if (scopeElements.length === 0) {
      return {
        valid: false,
        scopeMatches: 0,
        anchorMatchIndex: -1,
        targetFound: false,
        error: `Scope not found: ${draft.scope.selector}`,
      };
    }
    
    // If no anchor, check target in first scope element
    if (!draft.anchor) {
      const target = safeQuerySelector(draft.target.selector, scopeElements[0]);
      return {
        valid: target !== null,
        scopeMatches: scopeElements.length,
        anchorMatchIndex: 0,
        targetFound: target !== null,
        error: target === null ? `Target not found in scope: ${draft.target.selector}` : undefined,
      };
    }
    
    // Find anchor match
    let anchorMatchIndex = -1;
    for (let i = 0; i < scopeElements.length; i++) {
      const scopeEl = scopeElements[i];
      const anchorEl = safeQuerySelector(draft.anchor.selector, scopeEl);
      
      if (anchorEl) {
        const textOrAttr = anchorEl.textContent || '';
        if (matchText(textOrAttr, draft.anchor.value, draft.anchor.matchMode)) {
          anchorMatchIndex = i;
          break;
        }
      }
    }
    
    if (anchorMatchIndex === -1) {
      return {
        valid: false,
        scopeMatches: scopeElements.length,
        anchorMatchIndex: -1,
        targetFound: false,
        error: `Anchor not found: "${draft.anchor.value}" in ${draft.anchor.selector}`,
      };
    }
    
    // Validate target in matched scope
    const matchedScope = scopeElements[anchorMatchIndex];
    const target = safeQuerySelector(draft.target.selector, matchedScope);
    
    return {
      valid: target !== null,
      scopeMatches: scopeElements.length,
      anchorMatchIndex,
      targetFound: target !== null,
      error: target === null ? `Target not found in matched scope: ${draft.target.selector}` : undefined,
    };
    
  } catch (error) {
    return {
      valid: false,
      scopeMatches: 0,
      anchorMatchIndex: -1,
      targetFound: false,
      error: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validate a complete selector logic
 */
export function validateSelectorLogic(logic: SelectorLogic): ValidationResult {
  const draft: SelectorDraft = {
    target: {
      selector: logic.target.selector,
      action: logic.target.action,
    },
    confidence: 0,
    validated: false,
  };
  
  if (logic.scope) {
    draft.scope = {
      selector: logic.scope.selector,
      type: logic.scope.type,
      matchCount: 0,
    };
  }
  
  if (logic.anchor) {
    draft.anchor = {
      selector: logic.anchor.selector,
      type: logic.anchor.type,
      value: logic.anchor.value,
      matchMode: logic.anchor.matchMode,
    };
  }
  
  return validateSelectorDraft(draft);
}

/**
 * Test if a CSS selector is valid syntax
 */
export function isValidCssSelector(selector: string): boolean {
  try {
    document.querySelector(selector);
    return true;
  } catch {
    return false;
  }
}

/**
 * Count elements matching a selector
 */
export function countMatches(selector: string, context?: Element): number {
  try {
    if (context) {
      return context.querySelectorAll(selector).length;
    }
    return document.querySelectorAll(selector).length;
  } catch {
    return 0;
  }
}

/**
 * Find the element that would be targeted by the selector logic
 */
export function findTargetElement(logic: SelectorLogic, anchorValue?: string): HTMLElement | null {
  try {
    // No scope - direct target
    if (!logic.scope) {
      return safeQuerySelector<HTMLElement>(logic.target.selector);
    }
    
    // Get scope elements
    const scopeElements = safeQuerySelectorAll(logic.scope.selector);
    if (scopeElements.length === 0) return null;
    
    // No anchor - use first scope
    if (!logic.anchor) {
      return safeQuerySelector<HTMLElement>(logic.target.selector, scopeElements[0]);
    }
    
    // Find anchor match
    const searchValue = anchorValue || logic.anchor.value;
    for (const scopeEl of scopeElements) {
      const anchorEl = safeQuerySelector(logic.anchor.selector, scopeEl);
      if (anchorEl) {
        const textOrAttr = logic.anchor.type === 'attribute_match' && logic.anchor.attribute
          ? anchorEl.getAttribute(logic.anchor.attribute) || ''
          : anchorEl.textContent || '';
        
        if (matchText(textOrAttr, searchValue, logic.anchor.matchMode)) {
          return safeQuerySelector<HTMLElement>(logic.target.selector, scopeEl);
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Get all scope elements with anchor info
 */
export function getScopePreview(logic: SelectorLogic): {
  element: Element;
  anchorText: string;
  isMatch: boolean;
}[] {
  if (!logic.scope) return [];
  
  const scopeElements = safeQuerySelectorAll(logic.scope.selector);
  
  return scopeElements.map(scopeEl => {
    let anchorText = '';
    let isMatch = false;
    
    if (logic.anchor) {
      const anchorEl = safeQuerySelector(logic.anchor.selector, scopeEl);
      if (anchorEl) {
        anchorText = anchorEl.textContent?.trim().slice(0, 50) || '';
        isMatch = matchText(anchorText, logic.anchor.value, logic.anchor.matchMode);
      }
    }
    
    return { element: scopeEl, anchorText, isMatch };
  });
}
