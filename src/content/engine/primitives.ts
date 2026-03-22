/**
 * =============================================================================
 * Homura - Primitive Action Executors (Compatibility Layer)
 * =============================================================================
 *
 * This file now re-exports primitive executors from @homura/sdk for backward compatibility.
 * New code should import directly from @homura/sdk/primitives.
 *
 * The hardcoded, battle-tested DOM operations.
 * AI cannot modify these - it can only invoke them through Atomic Tools.
 */

// Re-export all primitive executors from SDK
export {
  executeClick,
  executeInput,
  executeExtractText,
  executeWaitFor,
  executeNavigate,
} from '@homura/sdk/primitives';
