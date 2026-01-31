/**
 * =============================================================================
 * Homura - AI Service Module
 * =============================================================================
 * 
 * Unified export for AI service functionality
 */

// Client
export { 
  TongyiClient, 
  initAIClient, 
  getAIClient, 
  isAIClientInitialized 
} from './client';

// Types
export type {
  AIClientConfig,
  ChatMessage,
  SelectorGenerationContext,
  SelectorSuggestion,
  RecordingAction,
  RecordingTrace,
  ToolGenerationResult,
  SelfHealingContext,
  SelfHealingResult,
  // Path selector types (new)
  PathSelectorContext,
  PathSelectorResult,
  AncestorInfoForAI,
} from './types';

// Prompts (for customization)
export {
  SELECTOR_SYSTEM_PROMPT,
  TOOL_BUILDER_SYSTEM_PROMPT,
  SELF_HEALING_SYSTEM_PROMPT,
  // Path selector prompt (new)
  PATH_SELECTOR_SYSTEM_PROMPT,
  buildPathSelectorPrompt,
} from './prompts';

// Tools (new)
export {
  PATH_SELECTOR_TOOL,
  SCOPE_ANCHOR_TARGET_TOOL,
  AI_TOOLS,
} from './tools';

export type {
  PathSelectorToolResult,
  ScopeAnchorTargetToolResult,
} from './tools';
