/**
 * =============================================================================
 * Homura SDK - AI Agent
 * =============================================================================
 *
 * 基于 Blueprint 的 AI 自主导航执行器
 *
 * Agent 模式允许 AI 根据 Rule Book 自主决策执行流程
 * 而非预定义的工具顺序
 */

import type {
  Blueprint,
  ExecutionState,
  AIDecision,
  PageState,
  ExecutionConfig,
} from '../types/index.js';
import {
  createExecutionEngine,
  type ExecutionEngine,
} from '../engine/index.js';
import { executeTool } from '../executor/index.js';
import { getPageState } from '../utils/pageState.js';

/**
 * LLM 客户端接口
 *
 * 需要由使用者实现，用于与 LLM 服务通信
 */
export interface LLMClient {
  /**
   * 聊天 completion
   *
   * @param messages - 消息列表
   * @returns AI 决策
   */
  chat(messages: Array<{ role: string; content: string }>): Promise<AIDecision>;
}

/**
 * AI Agent 配置
 */
export interface AIAgentConfig extends ExecutionConfig {
  /** LLM 客户端 */
  llmClient: LLMClient;

  /** 最大迭代次数 */
  maxIterations?: number;

  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * AI Agent
 *
 * 基于 Blueprint 的 AI 自主导航执行器
 */
export class AIAgent {
  private blueprint: Blueprint;
  private config: AIAgentConfig;
  private engine: ExecutionEngine;
  private context: Record<string, unknown> = {};
  private state: ExecutionState | null = null;

  constructor(blueprint: Blueprint, config: AIAgentConfig) {
    this.blueprint = blueprint;
    this.config = {
      maxIterations: 50,
      timeout: 300000, // 5 分钟
      failureStrategy: 'continue', // AI 模式默认继续
      ...config,
    };
    this.engine = createExecutionEngine(this.config);
  }

  /**
   * 执行 Agent
   *
   * @param userParams - 用户提供的初始参数
   * @returns 执行状态
   */
  async execute(
    userParams: Record<string, unknown> = {},
  ): Promise<ExecutionState> {
    const startTime = Date.now();
    this.context = { ...userParams };
    let iterations = 0;
    const maxIterations = this.config.maxIterations || 50;

    // 构建技能映射
    const skills = new Map(this.blueprint.skills.map((s) => [s.tool_id, s]));

    // 创建初始状态
    this.state = {
      id: `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mode: 'agent',
      currentIndex: 0,
      tools: [],
      variables: { ...this.context },
      history: [],
      status: 'running',
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
    };

    while (iterations < maxIterations) {
      iterations++;

      // 检查超时
      if (Date.now() - startTime > (this.config.timeout || 300000)) {
        this.state!.status = 'failed';
        throw new Error('执行超时');
      }

      // 1. 获取页面状态
      const pageState = await getPageState();

      // 2. 构建提示词
      const prompt = this.buildPrompt(pageState, this.context);

      // 3. AI 决策
      const decision = await this.config.llmClient.chat([
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: prompt },
      ]);

      console.log('[AIAgent] Decision:', decision.action, decision.reasoning);

      // 4. 执行决策
      switch (decision.action) {
        case 'complete': {
          // 任务完成
          this.state!.status = 'completed';
          this.config.onComplete?.(this.state!);
          return this.state!;
        }

        case 'ask_user': {
          // 请求用户输入
          this.state!.status = 'paused';
          this.config.onPaused?.(
            decision.reasoning || '需要用户输入',
            this.state!,
          );
          return this.state!;
        }

        case 'call_skill': {
          const skill = skills.get(decision.skillId!);
          if (!skill) {
            console.warn(`[AIAgent] 技能不存在: ${decision.skillId}`);
            continue;
          }

          console.log(`[AIAgent] 调用技能: ${skill.name}`);

          const result = await executeTool(
            skill,
            (decision.params as Record<string, string | number | boolean>) ||
              {},
            { debug: this.config.debug },
          );

          // 更新上下文
          if (result.data) {
            this.context = { ...this.context, extracted: result.data };
            this.state!.variables = {
              ...this.state!.variables,
              extracted: result.data,
            };
          }

          // 记录历史
          this.state!.history.push({
            index: iterations,
            toolId: skill.tool_id,
            toolName: skill.name,
            result,
            timestamp: new Date().toISOString(),
            reasoning: decision.reasoning,
          });

          // 处理页面跳转
          if (result.metadata?.pageNavigated) {
            this.state!.currentUrl = result.metadata.newUrl;
            this.state!.status = 'paused';
            this.config.onPaused?.('页面跳转，等待恢复', this.state!);
            return this.state!;
          }

          // 处理失败
          if (!result.success) {
            if (this.config.failureStrategy === 'stop') {
              this.state!.status = 'failed';
              this.config.onError?.(result.error!, this.state!);
              return this.state!;
            }
            // continue 策略：继续执行
          }

          break;
        }

        case 'skip': {
          // 跳过当前步骤
          console.log('[AIAgent] 跳过当前步骤');
          continue;
        }

        case 'retry': {
          // 重试上一步
          console.log('[AIAgent] 重试上一步');
          iterations--;
          continue;
        }
      }

      // 更新状态
      this.state!.lastUpdate = new Date().toISOString();
      this.config.onProgress?.(this.state!);
    }

    // 达到最大迭代次数
    this.state!.status = 'completed';
    this.config.onComplete?.(this.state!);
    return this.state!;
  }

  /**
   * 设置用户响应
   *
   * 用于恢复 ask_user 暂停的状态
   *
   * @param params - 用户提供的参数
   */
  setUserResponse(params: Record<string, unknown>): void {
    this.context = { ...this.context, ...params };
    if (this.state) {
      this.state.variables = { ...this.state.variables, ...params };
    }
  }

  /**
   * 恢复执行
   *
   * @returns 执行状态
   */
  async resume(): Promise<ExecutionState> {
    if (!this.state) {
      throw new Error('没有可恢复的执行状态');
    }

    if (this.state.status !== 'paused') {
      throw new Error(`状态不允许恢复: ${this.state.status}`);
    }

    // 继续执行
    return this.execute(this.context);
  }

  /**
   * 获取当前状态
   *
   * @returns 当前执行状态
   */
  getState(): ExecutionState | null {
    return this.state;
  }

  /**
   * 构建系统提示词
   *
   * @returns 系统提示词
   */
  private buildSystemPrompt(): string {
    const skillsList = this.blueprint.skills
      .map((s) => `- ${s.tool_id}: ${s.name} - ${s.description || ''}`)
      .join('\n');

    return `你是一个浏览器自动化 Agent。

可用技能：
${skillsList}

执行规则：
${this.blueprint.rules || '无特殊规则'}

请根据当前页面状态和执行规则，决定下一步操作。

返回 JSON 格式的决策，包含以下字段：
- action: 操作类型 (call_skill/complete/ask_user/skip/retry)
- skillId: 技能 ID (call_skill 时必需)
- params: 技能参数 (call_skill 时可选)
- reasoning: 决策理由 (可选)
- requiredParams: 需要用户输入的参数 (ask_user 时可选)`;
  }

  /**
   * 构建用户提示词
   *
   * @param pageState - 页面状态
   * @param context - 当前上下文
   * @returns 用户提示词
   */
  private buildPrompt(
    pageState: PageState,
    context: Record<string, unknown>,
  ): string {
    return `当前页面：
URL: ${pageState.url}
标题: ${pageState.title}

页面摘要：
文本: ${pageState.summary.text.slice(0, 5).join(', ')}
链接: ${pageState.summary.links
      .slice(0, 3)
      .map((l) => l.text)
      .join(', ')}
表单: ${pageState.summary.forms.map((f) => f.id).join(', ') || '无'}
按钮: ${pageState.summary.buttons.slice(0, 5).join(', ')}

上下文变量：
${JSON.stringify(context, null, 2)}

请决定下一步操作。`;
  }
}

/**
 * 工厂函数：创建 AI Agent
 *
 * @param blueprint - Blueprint 定义
 * @param config - Agent 配置
 * @returns AI Agent 实例
 */
export function createAIAgent(
  blueprint: Blueprint,
  config: AIAgentConfig,
): AIAgent {
  return new AIAgent(blueprint, config);
}
