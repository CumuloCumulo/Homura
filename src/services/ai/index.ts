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
} from './types';

// Prompts (for customization)
export {
  SELECTOR_SYSTEM_PROMPT,
  TOOL_BUILDER_SYSTEM_PROMPT,
  SELF_HEALING_SYSTEM_PROMPT,
} from './prompts';
