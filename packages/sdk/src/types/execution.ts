/**
 * =============================================================================
 * Execution Type Definitions
 * =============================================================================
 *
 * Types for tool execution requests, responses, and errors.
 */

import type { SelectorLogic } from "./selector.js";

// ============================================================================
// Execution Mode
// ============================================================================

/**
 * 执行模式
 * - simple: 简单模式，固定时间间隔顺序执行
 * - advanced: 高级模式，智能等待页面就绪，支持跨页面执行
 */
export type ExecutionMode = "simple" | "advanced";

/**
 * 简单模式执行配置
 */
export interface SimpleExecutionConfig {
  mode: "simple";
  /** 工具之间的延迟（毫秒），默认 2000 */
  toolDelay?: number;
}

/**
 * 高级模式执行配置
 */
export interface AdvancedExecutionConfig {
  mode: "advanced";
  /** 页面导航超时（毫秒），默认 30000 */
  pageNavigationTimeout?: number;
  /** Content script 超时（毫秒），默认 10000 */
  contentScriptTimeout?: number;
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
}

/**
 * 执行模式配置（联合类型）
 */
export type ExecutionModeConfig =
  | SimpleExecutionConfig
  | AdvancedExecutionConfig;

/**
 * Parameter definition for an atomic tool
 */
export interface ToolParameter {
  type: "string" | "number" | "boolean" | "array";
  description: string;
  required?: boolean;
  default?: string | number | boolean;
}

/**
 * Tool source type - indicates how the tool was created
 */
export type ToolSource = "recorded" | "manual" | "imported";

/**
 * Atomic Tool: A complete, reusable automation action
 *
 * This is what AI generates from user recordings or natural language.
 * It combines primitives according to the selector logic.
 */
export interface AtomicTool {
  /** Unique identifier */
  tool_id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this tool does */
  description?: string;
  /** Parameter definitions (for variable substitution) */
  parameters: Record<string, ToolParameter>;
  /** The selection and action logic */
  selector_logic: SelectorLogic;
  /** Tool source - indicates how this tool was created */
  source?: ToolSource;
  /** Creation timestamp (ISO 8601) */
  createdAt?: string;
}

/**
 * Request to execute an atomic tool
 */
export interface ExecuteToolRequest {
  /** The tool definition */
  tool: AtomicTool;
  /** Parameter values to substitute */
  params: Record<string, string | number | boolean>;
  /** Enable debug mode (show highlights, slow execution) */
  debug?: boolean;
}

/**
 * Result of tool execution
 */
export interface ExecuteToolResult {
  /** Whether execution was successful */
  success: boolean;
  /** Extracted data (for EXTRACT_TEXT action) */
  data?: string | string[];
  /** Error message if failed */
  error?: ExecutionError;
  /** Execution metadata */
  metadata?: {
    /** Time taken in milliseconds */
    duration: number;
    /** Number of elements matched by scope */
    scopeMatchCount?: number;
    /** Index of anchor-matched element */
    anchorMatchIndex?: number;
    /** 页面是否跳转（用于状态恢复） */
    pageNavigated?: boolean;
    /** 新页面 URL（页面跳转后） */
    newUrl?: string;
    /** 需要等待的元素（用于页面加载后） */
    waitForSelector?: string;
  };
}

/**
 * Structured error for self-healing agent
 */
export interface ExecutionError {
  /** Error code for programmatic handling */
  code:
    | "SCOPE_NOT_FOUND" // Scope selector matched 0 elements
    | "ANCHOR_NOT_FOUND" // No element in scope matched anchor
    | "TARGET_NOT_FOUND" // Target selector not found in context
    | "ACTION_FAILED" // Action execution failed
    | "TIMEOUT" // Wait timeout exceeded
    | "INVALID_SELECTOR" // CSS selector syntax error
    | "PAGE_NOT_READY" // Page not ready for execution
    | "NAVIGATION_FAILED" // Navigation failed
    | "UNKNOWN"; // Unexpected error
  /** Human-readable message */
  message: string;
  /** The selector that failed (for self-healing) */
  failedSelector?: string;
  /** Snapshot of nearby DOM for AI analysis */
  domSnapshot?: string;
}

/**
 * Options for executor behavior
 */
export interface ExecutorOptions {
  /** Enable debug mode with highlights and delays */
  debug?: boolean;
  /** Delay between debug steps (ms) */
  debugDelay?: number;
  /** Callback for debug step notifications */
  onDebugStep?: (step: DebugStep) => void;
}

/**
 * Debug step information for callback
 */
export interface DebugStep {
  type: "scope" | "anchor" | "target" | "action";
  selector?: string;
  matchCount?: number;
  element?: Element;
}

// ============================================================================
// Execution State (支持持久化)
// ============================================================================

/**
 * 执行状态（支持持久化到 chrome.storage）
 */
export interface ExecutionState {
  /** 唯一标识 */
  id: string;

  /** 执行模式 */
  mode: "sequential" | "agent" | "interactive";

  /** 执行模式（simple/advanced） */
  executionMode?: ExecutionMode;
  /** 执行配置参数 */
  executionConfig?: ExecutionModeConfig;

  /** 当前工具索引 */
  currentIndex: number;

  /** 工具列表 */
  tools: ToolExecution[];

  /** 变量上下文 */
  variables: Record<string, unknown>;

  /** 执行历史 */
  history: ExecutionStep[];

  /** 状态 */
  status: "idle" | "running" | "paused" | "completed" | "failed";

  /** 开始时间 */
  startTime: string;

  /** 最后更新时间 */
  lastUpdate: string;

  /** 当前 URL（跨页面恢复用） */
  currentUrl?: string;

  /** 当前 Tab ID */
  tabId?: number;
}

/**
 * 工具执行状态
 */
export interface ToolExecution {
  /** 工具定义 */
  tool: AtomicTool;

  /** 参数 */
  params: Record<string, unknown>;

  /** 执行状态 */
  status: "pending" | "running" | "completed" | "failed" | "skipped";

  /** 执行结果 */
  result?: ExecuteToolResult;

  /** 重试次数 */
  retryCount: number;

  /** 执行时间戳 */
  timestamp?: string;
}

/**
 * 执行步骤
 */
export interface ExecutionStep {
  /** 步骤索引 */
  index: number;

  /** 工具 ID */
  toolId: string;

  /** 工具名称 */
  toolName: string;

  /** 执行结果 */
  result: ExecuteToolResult;

  /** 时间戳 */
  timestamp: string;

  /** AI 决策理由（agent 模式） */
  reasoning?: string;
}

// ============================================================================
// Execution Config
// ============================================================================

/**
 * 执行配置
 */
export interface ExecutionConfig {
  /** 最大重试次数 */
  maxRetries?: number;

  /** 重试延迟（毫秒） */
  retryDelay?: number;

  /** 超时时间（毫秒） */
  timeout?: number;

  /** 失败策略 */
  failureStrategy?: "stop" | "continue" | "retry";

  /** 调试模式 */
  debug?: boolean;

  /** 进度回调 */
  onProgress?: (state: ExecutionState) => void;

  /** 完成回调 */
  onComplete?: (state: ExecutionState) => void;

  /** 错误回调 */
  onError?: (error: ExecutionError, state: ExecutionState) => void;

  /** 暂停回调（如需要用户介入） */
  onPaused?: (reason: string, state: ExecutionState) => void;
}

// ============================================================================
// AI Decision
// ============================================================================

/**
 * AI 决策
 */
export interface AIDecision {
  /** 决策类型 */
  action: "call_skill" | "complete" | "ask_user" | "skip" | "retry";

  /** 工具 ID（call_skill 时） */
  skillId?: string;

  /** 参数 */
  params?: Record<string, unknown>;

  /** 决策理由 */
  reasoning?: string;

  /** 需要用户输入的参数（ask_user 时） */
  requiredParams?: string[];
}

/**
 * 页面状态摘要
 */
export interface PageState {
  /** 当前 URL */
  url: string;

  /** 页面标题 */
  title: string;

  /** DOM 摘要 */
  summary: {
    /** 关键文本 */
    text: string[];

    /** 链接 */
    links: Array<{ text: string; href: string }>;

    /** 表单 */
    forms: Array<{ id: string; fields: string[] }>;

    /** 按钮 */
    buttons: string[];
  };
}

// ============================================================================
// Execution Readiness (执行就绪等待策略)
// ============================================================================

/**
 * 等待配置
 */
export interface ReadinessConfig {
  /** 是否跳过等待（用于调试） */
  skipWait?: boolean;

  /** DOM 稳定性检测超时（毫秒） */
  domStabilityTimeout?: number;

  /** 目标元素等待超时（毫秒） */
  targetTimeout?: number;

  /** SPA 额外等待时间（毫秒） */
  spaExtraWait?: number;

  /** 轮询间隔（毫秒） */
  pollInterval?: number;

  /** 是否启用详细日志 */
  verbose?: boolean;
}

/**
 * 等待结果
 */
export interface ReadinessResult {
  /** 是否就绪 */
  ready: boolean;

  /** 使用的等待层级 */
  layers: string[];

  /** 等待时长（毫秒） */
  duration: number;

  /** 检测到的页面类型 */
  pageType: "spa" | "traditional" | "unknown";

  /** 错误信息（如果失败） */
  error?: string;
}

/**
 * DOM 指纹（用于检测稳定性）
 */
export interface DOMFingerprint {
  /** 元素数量 */
  elementCount: number;

  /** 关键选择器的存在状态 */
  keySelectors: Record<string, boolean>;

  /** HTML 结构哈希（简化版） */
  structureHash: string;
}

/**
 * SPA 检测结果
 */
export interface SPADetectionResult {
  /** 是否是 SPA */
  isSPA: boolean;

  /** 检测到的框架类型 */
  framework?: "vue" | "react" | "angular" | "unknown";

  /** 根节点选择器 */
  rootSelector?: string;

  /** 置信度 (0-1) */
  confidence: number;
}
