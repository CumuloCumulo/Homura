/**
 * =============================================================================
 * Homura - Orchestrator (MVP Mock)
 * =============================================================================
 * 
 * In the full version, this would be the "brain" that uses an LLM to make
 * decisions based on Rule Books and page state.
 * 
 * For MVP, we hardcode a simple decision flow to test the execution engine.
 */

import type { AtomicTool, ExecuteToolResult, LogEntry } from '@shared/types';
import { executeToolOnActiveTab } from './messaging';

export interface MissionContext {
  /** Current step index */
  currentStep: number;
  /** Total steps */
  totalSteps: number;
  /** Execution logs */
  logs: LogEntry[];
  /** Variables collected during execution */
  variables: Record<string, unknown>;
}

/**
 * Run a sequence of tools (MVP: hardcoded sequence)
 * 
 * In the future, this will:
 * 1. Send page state to LLM
 * 2. LLM decides which tool to call next based on Rule Book
 * 3. Execute the tool
 * 4. Repeat until mission is complete
 */
export async function runMission(
  tools: Array<{ tool: AtomicTool; params: Record<string, string | number | boolean> }>,
  onProgress?: (context: MissionContext, result: ExecuteToolResult) => void
): Promise<MissionContext> {
  const context: MissionContext = {
    currentStep: 0,
    totalSteps: tools.length,
    logs: [],
    variables: {},
  };

  for (let i = 0; i < tools.length; i++) {
    context.currentStep = i + 1;
    
    const { tool, params } = tools[i];
    
    // Log start
    context.logs.push({
      timestamp: Date.now(),
      level: 'info',
      message: `Executing step ${i + 1}/${tools.length}: ${tool.name}`,
      toolId: tool.tool_id,
    });

    try {
      // Execute the tool
      const result = await executeToolOnActiveTab(tool, params, true);
      
      // Store extracted data
      if (result.success && result.data !== undefined) {
        context.variables[tool.tool_id] = result.data;
      }

      // Log result
      context.logs.push({
        timestamp: Date.now(),
        level: result.success ? 'info' : 'error',
        message: result.success 
          ? `Step ${i + 1} completed in ${result.metadata?.duration}ms`
          : `Step ${i + 1} failed: ${result.error?.message}`,
        toolId: tool.tool_id,
        data: result,
      });

      // Notify progress
      onProgress?.(context, result);

      // Stop on error
      if (!result.success) {
        context.logs.push({
          timestamp: Date.now(),
          level: 'error',
          message: 'Mission aborted due to error',
        });
        break;
      }

      // Small delay between steps for stability
      await new Promise(r => setTimeout(r, 500));
      
    } catch (error) {
      context.logs.push({
        timestamp: Date.now(),
        level: 'error',
        message: `Step ${i + 1} threw exception: ${error}`,
        toolId: tool.tool_id,
      });
      break;
    }
  }

  return context;
}
