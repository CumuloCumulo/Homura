/**
 * =============================================================================
 * Blueprint Utilities
 * =============================================================================
 *
 * Utility functions for Blueprint operations
 */

import type { AtomicTool } from '../types';

/**
 * Calculate hash of skills for change detection
 * This provides a consistent way to detect changes in skills
 */
export function calculateSkillsHash(skills: AtomicTool[]): string {
  // Normalize skills for consistent hashing
  const normalized = skills
    .map((skill) => ({
      tool_id: skill.tool_id,
      selector_logic: skill.selector_logic,
    }))
    .sort((a, b) => a.tool_id.localeCompare(b.tool_id));

  const jsonString = JSON.stringify(normalized);

  // Simple hash function (browser-compatible)
  let hash = 0;
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16);
}

/**
 * Generate a unique tool ID
 */
export function generateToolId(prefix: string = 'tool'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Validate tool ID format
 */
export function isValidToolId(toolId: string): boolean {
  // Tool IDs should be alphanumeric with underscores and hyphens
  const pattern = /^[a-zA-Z0-9_-]+$/;
  return pattern.test(toolId) && toolId.length > 0;
}
