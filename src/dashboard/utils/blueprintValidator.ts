/**
 * =============================================================================
 * Blueprint Validator
 * =============================================================================
 *
 * Validation functions for Blueprint structure and conflicts
 */

import type {
  Blueprint,
  BlueprintMeta,
  AtomicTool,
  BlueprintValidationResult,
  BlueprintConflict,
} from '@homura/sdk/types';

/**
 * Current Blueprint format version
 */
const CURRENT_BLUEPRINT_VERSION = '1.0.0';

/**
 * Supported Blueprint versions (for backward compatibility)
 */
const SUPPORTED_BLUEPRINT_VERSIONS = ['1.0.0'];

/**
 * Validate Blueprint structure
 */
export function validateBlueprint(
  data: unknown,
): BlueprintValidationResult<Blueprint> {
  const errors: Record<string, string> = {};

  // Check if data is an object
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      error: 'Blueprint must be an object',
    };
  }

  const blueprint = data as Record<string, unknown>;

  // Validate meta
  if (!blueprint.meta) {
    errors.meta = 'meta is required';
  } else {
    const metaValidation = validateMeta(blueprint.meta as unknown);
    if (!metaValidation.valid) {
      Object.assign(errors, metaValidation.errors || {});
    }
  }

  // Validate skills
  if (!Array.isArray(blueprint.skills)) {
    errors.skills = 'skills must be an array';
  } else {
    // Validate each skill
    blueprint.skills.forEach((skill, index) => {
      const skillValidation = validateAtomicTool(skill);
      if (!skillValidation.valid) {
        errors[`skills[${index}]`] = skillValidation.error || 'Invalid skill';
      }
    });
  }

  // Validate rules
  if (typeof blueprint.rules !== 'string') {
    errors.rules = 'rules must be a string';
  }

  // Validate agentConfig (optional)
  if (blueprint.agentConfig !== undefined) {
    const agentConfigValidation = validateAgentConfig(blueprint.agentConfig);
    if (!agentConfigValidation.valid) {
      Object.assign(errors, { agentConfig: agentConfigValidation.error });
    }
  }

  // Validate maintenance (optional)
  if (blueprint.maintenance !== undefined) {
    const maintenanceValidation = validateMaintenanceInfo(
      blueprint.maintenance,
    );
    if (!maintenanceValidation.valid) {
      Object.assign(errors, { maintenance: maintenanceValidation.error });
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: blueprint as unknown as Blueprint };
}

/**
 * Validate BlueprintMeta
 */
function validateMeta(meta: unknown): BlueprintValidationResult<BlueprintMeta> {
  const errors: Record<string, string> = {};

  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return { valid: false, error: 'meta must be an object' };
  }

  const metaObj = meta as unknown as BlueprintMeta;

  // Required fields
  if (typeof metaObj.name !== 'string' || metaObj.name.trim() === '') {
    errors.name = 'name is required and must be a non-empty string';
  }

  if (typeof metaObj.version !== 'string') {
    errors.version = 'version is required and must be a string';
  } else if (!isValidSemanticVersion(metaObj.version)) {
    errors.version = 'version must follow semantic versioning (e.g., 1.0.0)';
  }

  if (
    typeof metaObj.targetUrl !== 'string' ||
    metaObj.targetUrl.trim() === ''
  ) {
    errors.targetUrl = 'targetUrl is required and must be a non-empty string';
  }

  if (typeof metaObj.blueprintVersion !== 'string') {
    errors.blueprintVersion =
      'blueprintVersion is required and must be a string';
  } else if (!SUPPORTED_BLUEPRINT_VERSIONS.includes(metaObj.blueprintVersion)) {
    errors.blueprintVersion = `blueprintVersion ${metaObj.blueprintVersion} is not supported. Supported versions: ${SUPPORTED_BLUEPRINT_VERSIONS.join(', ')}`;
  }

  if (typeof metaObj.skillsHash !== 'string') {
    errors.skillsHash = 'skillsHash is required and must be a string';
  }

  // Optional fields
  if (
    metaObj.description !== undefined &&
    typeof metaObj.description !== 'string'
  ) {
    errors.description = 'description must be a string';
  }

  if (metaObj.author !== undefined && typeof metaObj.author !== 'string') {
    errors.author = 'author must be a string';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: metaObj as unknown as BlueprintMeta };
}

/**
 * Validate AtomicTool
 */
function validateAtomicTool(
  tool: unknown,
): BlueprintValidationResult<AtomicTool> {
  const errors: Record<string, string> = {};

  if (!tool || typeof tool !== 'object' || Array.isArray(tool)) {
    return { valid: false, error: 'tool must be an object' };
  }

  const toolObj = tool as unknown as AtomicTool;

  // Required fields
  if (typeof toolObj.tool_id !== 'string' || toolObj.tool_id.trim() === '') {
    errors.tool_id = 'tool_id is required and must be a non-empty string';
  }

  if (typeof toolObj.name !== 'string' || toolObj.name.trim() === '') {
    errors.name = 'name is required and must be a non-empty string';
  }

  if (!toolObj.selector_logic || typeof toolObj.selector_logic !== 'object') {
    errors.selector_logic = 'selector_logic is required and must be an object';
  }

  // Optional fields
  if (
    toolObj.description !== undefined &&
    typeof toolObj.description !== 'string'
  ) {
    errors.description = 'description must be a string';
  }

  if (
    toolObj.parameters !== undefined &&
    typeof toolObj.parameters !== 'object'
  ) {
    errors.parameters = 'parameters must be an object';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: toolObj as unknown as AtomicTool };
}

/**
 * Validate AgentConfig
 */
function validateAgentConfig(
  config: unknown,
): BlueprintValidationResult<unknown> {
  const errors: Record<string, string> = {};

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { valid: false, error: 'agentConfig must be an object' };
  }

  const configObj = config as Record<string, unknown>;

  if (
    typeof configObj.maxIterations !== 'number' ||
    configObj.maxIterations <= 0
  ) {
    errors.maxIterations = 'maxIterations must be a positive number';
  }

  if (typeof configObj.timeout !== 'number' || configObj.timeout <= 0) {
    errors.timeout = 'timeout must be a positive number';
  }

  const validProviders = ['tongyi', 'openai', 'claude', 'anthropic'];
  if (
    typeof configObj.llmProvider !== 'string' ||
    !validProviders.includes(configObj.llmProvider)
  ) {
    errors.llmProvider = `llmProvider must be one of: ${validProviders.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Validate MaintenanceInfo
 */
function validateMaintenanceInfo(
  info: unknown,
): BlueprintValidationResult<unknown> {
  const errors: Record<string, string> = {};

  if (!info || typeof info !== 'object' || Array.isArray(info)) {
    return { valid: false, error: 'maintenance must be an object' };
  }

  const infoObj = info as Record<string, unknown>;

  if (typeof infoObj.lastUpdated !== 'string') {
    errors.lastUpdated = 'lastUpdated must be a string';
  }

  if (!Array.isArray(infoObj.changelog)) {
    errors.changelog = 'changelog must be an array';
  }

  if (!Array.isArray(infoObj.knownIssues)) {
    errors.knownIssues = 'knownIssues must be an array';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Validate Blueprint version
 */
export function validateBlueprintVersion(version: string): boolean {
  return SUPPORTED_BLUEPRINT_VERSIONS.includes(version);
}

/**
 * Check if version is in semantic versioning format
 */
function isValidSemanticVersion(version: string): boolean {
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
  return semverRegex.test(version);
}

/**
 * Detect conflicts between Blueprint and existing tools
 */
export function detectConflicts(
  blueprint: Blueprint,
  existingTools: AtomicTool[],
): BlueprintConflict[] {
  const conflicts: BlueprintConflict[] = [];
  const existingToolsMap = new Map<string, AtomicTool>();

  // Build map of existing tools
  for (const tool of existingTools) {
    existingToolsMap.set(tool.tool_id, tool);
  }

  // Check for duplicate tool_id
  for (const incomingTool of blueprint.skills) {
    const existingTool = existingToolsMap.get(incomingTool.tool_id);

    if (existingTool) {
      // Check if tools are actually different
      if (!areToolsEqual(existingTool, incomingTool)) {
        conflicts.push({
          type: 'duplicate_id',
          id: incomingTool.tool_id,
          existing: existingTool,
          incoming: incomingTool,
          suggestedResolution: 'replace', // Default suggestion
        });
      }
    }
  }

  return conflicts;
}

/**
 * Compare two tools for equality
 */
function areToolsEqual(tool1: AtomicTool, tool2: AtomicTool): boolean {
  return (
    tool1.tool_id === tool2.tool_id &&
    tool1.name === tool2.name &&
    tool1.description === tool2.description &&
    JSON.stringify(tool1.parameters) === JSON.stringify(tool2.parameters) &&
    JSON.stringify(tool1.selector_logic) ===
      JSON.stringify(tool2.selector_logic)
  );
}

/**
 * Calculate hash of skills for change detection
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
 * Get current Blueprint format version
 */
export function getCurrentBlueprintVersion(): string {
  return CURRENT_BLUEPRINT_VERSION;
}

/**
 * Get supported Blueprint versions
 */
export function getSupportedBlueprintVersions(): string[] {
  return [...SUPPORTED_BLUEPRINT_VERSIONS];
}
