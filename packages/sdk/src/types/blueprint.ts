/**
 * =============================================================================
 * Blueprint Type Definitions
 * =============================================================================
 *
 * Blueprint is the core data format for Homura automation.
 * It contains Skills (atomic tools), Rule Books, and configuration.
 */

import type { AtomicTool } from './execution.js';
import type {
  SelectorLogic,
  SelectorScope,
  SelectorAnchor,
  SelectorTarget,
} from './selector.js';

/**
 * Blueprint: Complete automation package
 *
 * A Blueprint contains everything needed to automate a workflow:
 * - Meta information (name, version, description)
 * - Skills collection (reusable atomic tools) - DEPRECATED: Use toolkitId instead
 * - Toolkit reference (preferred over direct skills)
 * - Rule Book (natural language rules for AI Agent)
 * - Agent Config (execution configuration)
 * - Maintenance Info (health check and changelog)
 */
export interface Blueprint {
  /** Unique identifier (for Dashboard management) */
  meta: BlueprintMeta & { id?: string };

  /** Skills collection (atomic tools) - DEPRECATED: Use toolkitId instead */
  skills: AtomicTool[];

  /** Toolkit reference (preferred over skills for better reusability) */
  toolkitId?: string;

  /** Rule Book (Markdown format) */
  rules: string;

  /** Optional: Tags for categorization and filtering */
  tags?: string[];

  /** Optional: Agent configuration */
  agentConfig?: AgentConfig;

  /** Optional: Maintenance information */
  maintenance?: MaintenanceInfo;
}

/**
 * Blueprint Meta information
 */
export interface BlueprintMeta {
  /** Blueprint name, e.g., "student-audit-blueprint" */
  name: string;

  /** Semantic version, e.g., "1.0.0" */
  version: string;

  /** Human-readable description */
  description?: string;

  /** Author */
  author?: string;

  /** Target URL pattern, e.g., "https://school.example.com/*" */
  targetUrl: string;

  /** Blueprint format version, e.g., "1.0.0" */
  blueprintVersion: string;

  /** Hash of skills for change detection */
  skillsHash: string;

  /** Creation time (ISO 8601) */
  createdAt?: string;

  /** Last update time (ISO 8601) */
  updatedAt?: string;
}

/**
 * Agent Configuration
 */
export interface AgentConfig {
  /** Maximum iteration count */
  maxIterations: number;

  /** Timeout (milliseconds) */
  timeout: number;

  /** LLM provider */
  llmProvider: 'tongyi' | 'openai' | 'claude' | 'anthropic';

  /** Optional: API Key (overrides environment variable) */
  apiKey?: string;

  /** Optional: Model name */
  model?: string;

  /** LLM temperature parameter */
  temperature?: number;
}

/**
 * Maintenance Information
 */
export interface MaintenanceInfo {
  /** Last update time */
  lastUpdated: string;

  /** Changelog */
  changelog: string[];

  /** Known issues */
  knownIssues: string[];

  /** Optional: Health check results */
  healthCheck?: HealthCheckInfo;
}

/**
 * Health Check Information
 */
export interface HealthCheckInfo {
  /** Last health check time */
  lastCheck: string;

  /** Healthy skill IDs */
  healthySkills: string[];

  /** Broken skill IDs */
  brokenSkills: string[];
}

/**
 * Extended Atomic Tool with metadata (for Blueprint)
 */
export interface BlueprintTool extends AtomicTool {
  /** Tool metadata */
  metadata?: ToolMetadata;
}

/**
 * Tool Metadata
 */
export interface ToolMetadata {
  /** Creation time */
  createdAt?: string;

  /** Last update time */
  updatedAt?: string;

  /** Source of the tool */
  source?: 'recorded' | 'ai_generated' | 'manual';

  /** Confidence score (0-1) */
  confidence?: number;

  /** Test results */
  testResults?: TestResult[];
}

/**
 * Test Result
 */
export interface TestResult {
  /** Timestamp */
  timestamp: string;

  /** URL where test was run */
  url: string;

  /** Whether test passed */
  success: boolean;

  /** Number of matched elements */
  matchCount?: number;

  /** Error message if failed */
  error?: string;
}

/**
 * Selector Logic (re-export for convenience)
 */
export type { SelectorLogic, SelectorScope, SelectorAnchor, SelectorTarget };

/**
 * Conflict detected during Blueprint import
 */
export interface BlueprintConflict {
  /** Conflict type */
  type: 'duplicate_id' | 'version_mismatch' | 'schema_incompatibility';

  /** Conflict ID */
  id: string;

  /** Existing tool */
  existing: AtomicTool;

  /** Incoming tool */
  incoming: AtomicTool;

  /** Suggested resolution */
  suggestedResolution: ConflictResolution;
}

/**
 * Conflict resolution options
 */
export type ConflictResolution =
  | 'skip' // Skip the incoming tool
  | 'replace' // Replace existing with incoming
  | 'rename'; // Rename incoming tool's ID

/**
 * Merge strategy for Blueprint import
 */
export type MergeStrategy =
  | 'skip_all' // Skip all conflicts
  | 'replace_all' // Replace all conflicts
  | 'rename_all'; // Rename all conflicts

/**
 * Blueprint ValidationResult
 */
export interface BlueprintValidationResult<T> {
  /** Whether validation passed */
  valid: boolean;

  /** Validated data (if valid) */
  data?: T;

  /** Error message (if invalid) */
  error?: string;

  /** Validation errors by field */
  errors?: Record<string, string>;
}
