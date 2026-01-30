/**
 * =============================================================================
 * Homura - AI Client (通义 API)
 * =============================================================================
 * 
 * Client for interacting with Alibaba's Tongyi (通义) API
 * Uses OpenAI-compatible endpoint
 */

import type { SelectorLogic, AtomicTool } from '@shared/types';
import type {
  AIClientConfig,
  ChatMessage,
  ChatCompletionResponse,
  SelectorGenerationContext,
  SelectorSuggestion,
  RecordingTrace,
  ToolGenerationResult,
  SelfHealingContext,
  SelfHealingResult,
} from './types';
import {
  SELECTOR_SYSTEM_PROMPT,
  TOOL_BUILDER_SYSTEM_PROMPT,
  SELF_HEALING_SYSTEM_PROMPT,
  buildSelectorPrompt,
  buildToolPrompt,
  buildSelfHealingPrompt,
} from './prompts';

// Default configuration
const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const DEFAULT_MODEL = 'qwen-plus';

/**
 * Tongyi AI Client
 */
export class TongyiClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: AIClientConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || DEFAULT_MODEL;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  /**
   * Send chat completion request
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.3, // Lower temperature for more deterministic outputs
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI request failed: ${response.status} - ${errorText}`);
    }

    const data: ChatCompletionResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Extract JSON from AI response (handles markdown code blocks)
   */
  private extractJson(response: string): string {
    // Try to extract JSON from markdown code block
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
    // Assume the entire response is JSON
    return response.trim();
  }

  /**
   * Generate selector logic from context
   */
  async generateSelector(context: SelectorGenerationContext): Promise<SelectorSuggestion> {
    const prompt = buildSelectorPrompt(context);
    
    const response = await this.chat([
      { role: 'system', content: SELECTOR_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);

    try {
      const jsonStr = this.extractJson(response);
      const selectorLogic = JSON.parse(jsonStr) as SelectorLogic;
      
      return {
        selectorLogic,
        confidence: 0.8, // Default confidence
        explanation: 'AI-generated selector based on DOM analysis',
      };
    } catch (error) {
      throw new Error(`Failed to parse selector response: ${error}`);
    }
  }

  /**
   * Generate atomic tool from recording trace
   */
  async generateTool(recording: RecordingTrace): Promise<ToolGenerationResult> {
    const prompt = buildToolPrompt(recording);
    
    const response = await this.chat([
      { role: 'system', content: TOOL_BUILDER_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);

    try {
      const jsonStr = this.extractJson(response);
      const tool = JSON.parse(jsonStr) as AtomicTool;
      
      // Extract identified parameters
      const parameters = Object.entries(tool.parameters).map(([name, param]) => ({
        name,
        value: '', // To be filled by user
        description: param.description,
      }));

      return {
        tool,
        parameters,
        explanation: 'AI-generated tool from recording',
      };
    } catch (error) {
      throw new Error(`Failed to parse tool response: ${error}`);
    }
  }

  /**
   * Self-heal a failed selector
   */
  async healSelector(context: SelfHealingContext): Promise<SelfHealingResult> {
    const prompt = buildSelfHealingPrompt(context);
    
    const response = await this.chat([
      { role: 'system', content: SELF_HEALING_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);

    try {
      const jsonStr = this.extractJson(response);
      return JSON.parse(jsonStr) as SelfHealingResult;
    } catch (error) {
      throw new Error(`Failed to parse healing response: ${error}`);
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: TongyiClient | null = null;

/**
 * Initialize the AI client with config
 */
export function initAIClient(config: AIClientConfig): TongyiClient {
  clientInstance = new TongyiClient(config);
  return clientInstance;
}

/**
 * Get the AI client instance
 */
export function getAIClient(): TongyiClient {
  if (!clientInstance) {
    throw new Error('AI client not initialized. Call initAIClient first.');
  }
  return clientInstance;
}

/**
 * Check if AI client is initialized
 */
export function isAIClientInitialized(): boolean {
  return clientInstance !== null;
}
