/**
 * =============================================================================
 * Homura - Smart Selector Router
 * =============================================================================
 * 
 * Implements the routing logic for choosing between Path Selector and
 * Scope+Anchor+Target strategies based on page structure analysis.
 */

import type { SmartSelectorContext } from './types';

/**
 * Determine if Scope+Anchor+Target strategy should be used
 * 
 * Decision rules:
 * - Rule A: If hasRepeatingStructure is true AND containerType is 'table' or 'list'
 *           AND there are anchor candidates -> use Scope+Anchor+Target
 * - Rule B: Otherwise -> use Path Selector
 */
export function shouldUseScopeAnchorTarget(context: SmartSelectorContext): boolean {
  const { containerType, hasRepeatingStructure, anchorCandidates } = context.structureInfo;
  
  const timestamp = new Date().toISOString();
  
  // Rule A: Table/list structures with anchors benefit from Scope+Anchor+Target
  if (hasRepeatingStructure && ['table', 'list'].includes(containerType)) {
    if (anchorCandidates.length > 0) {
      console.log(`[SmartSelector ${timestamp}] Decision: SCOPE_ANCHOR_TARGET - containerType=${containerType}, anchorCount=${anchorCandidates.length}`);
      return true;
    }
    console.log(`[SmartSelector ${timestamp}] Decision: PATH_SELECTOR - repeating structure but no anchors`);
    return false;
  }
  
  // Rule B: Non-repeating or other structures use Path Selector
  console.log(`[SmartSelector ${timestamp}] Decision: PATH_SELECTOR - containerType=${containerType}, hasRepeating=${hasRepeatingStructure}`);
  return false;
}

/**
 * Get the decision reason for logging
 */
export function getDecisionReason(context: SmartSelectorContext): string {
  const { containerType, hasRepeatingStructure, anchorCandidates } = context.structureInfo;
  
  if (hasRepeatingStructure && ['table', 'list'].includes(containerType)) {
    if (anchorCandidates.length > 0) {
      return `Using Scope+Anchor+Target: ${containerType} structure with ${anchorCandidates.length} anchor candidate(s)`;
    }
    return `Using Path Selector: ${containerType} structure but no anchor candidates found`;
  }
  
  if (hasRepeatingStructure) {
    return `Using Path Selector: ${containerType} container (grid/card not optimal for Scope+Anchor+Target)`;
  }
  
  return `Using Path Selector: single element (no repeating structure)`;
}
