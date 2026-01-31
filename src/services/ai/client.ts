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
  PathSelectorContext,
  PathSelectorResult,
} from './types';
import {
  SELECTOR_SYSTEM_PROMPT,
  TOOL_BUILDER_SYSTEM_PROMPT,
  SELF_HEALING_SYSTEM_PROMPT,
  PATH_SELECTOR_SYSTEM_PROMPT,
  buildSelectorPrompt,
  buildToolPrompt,
  buildSelfHealingPrompt,
  buildPathSelectorPrompt,
} from './prompts';
import { PATH_SELECTOR_TOOL } from './tools';
import type { PathSelectorToolResult } from './tools';

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
   * Send chat completion request with tool calling
   */
  async chatWithTools<T>(
    messages: ChatMessage[],
    tools: Array<{ type: string; function: { name: string; description: string; parameters: unknown } }>,
    toolChoice?: string | { type: string; function: { name: string } }
  ): Promise<{ content?: string; toolCalls?: Array<{ name: string; arguments: T }> }> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        tools,
        tool_choice: toolChoice || 'auto',
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    
    if (!choice) {
      throw new Error('No response from AI');
    }

    // Check for tool calls
    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCalls = choice.message.tool_calls.map((tc: { function: { name: string; arguments: string } }) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments) as T,
      }));
      return { toolCalls };
    }

    // Regular text response
    return { content: choice.message?.content || '' };
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

  /**
   * Generate path-based selector using tool calling
   * 
   * This method uses the generate_path_selector tool to get structured output
   * from the AI, based on the ancestor path of the target element.
   */
  async generatePathSelector(context: PathSelectorContext): Promise<PathSelectorResult> {
    const prompt = buildPathSelectorPrompt(context);
    
    const result = await this.chatWithTools<PathSelectorToolResult>(
      [
        { role: 'system', content: PATH_SELECTOR_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      [PATH_SELECTOR_TOOL],
      { type: 'function', function: { name: 'generate_path_selector' } }
    );

    // If tool was called, use the structured result
    if (result.toolCalls && result.toolCalls.length > 0) {
      const toolResult = result.toolCalls[0].arguments;
      return {
        root: toolResult.root,
        path: toolResult.path || [],
        target: toolResult.target,
        fullSelector: toolResult.fullSelector,
        confidence: toolResult.confidence,
        reasoning: toolResult.reasoning,
      };
    }

    // Fallback: try to parse text response as JSON
    if (result.content) {
      try {
        const jsonStr = this.extractJson(result.content);
        return JSON.parse(jsonStr) as PathSelectorResult;
      } catch (error) {
        throw new Error(`Failed to parse path selector response: ${error}`);
      }
    }

    throw new Error('No valid response from AI for path selector generation');
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
