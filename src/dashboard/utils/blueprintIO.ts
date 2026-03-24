/**
 * =============================================================================
 * Blueprint IO Utilities
 * =============================================================================
 *
 * Export and import functionality for Blueprint files
 */

import type {
  Blueprint,
  BlueprintMeta,
  AtomicTool,
  AgentConfig,
} from '@homura/sdk/types';
import { validateBlueprint, calculateSkillsHash } from './blueprintValidator';

/**
 * Generate Blueprint filename
 * Format: {name}-v{version}.blueprint.json
 */
export function generateBlueprintFilename(meta: BlueprintMeta): string {
  // Sanitize name: replace spaces and special chars with hyphens
  const sanitizedName = meta.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${sanitizedName}-v${meta.version}.blueprint.json`;
}

/**
 * Export a Blueprint to a JSON file
 * @param blueprint - The Blueprint to export
 * @returns Download ID of the file
 */
export async function exportBlueprint(blueprint: Blueprint): Promise<number> {
  // Validate Blueprint before export
  const validation = validateBlueprint(blueprint);
  if (!validation.valid) {
    throw new Error(`Invalid Blueprint: ${JSON.stringify(validation.errors)}`);
  }

  // Recalculate skills hash to ensure consistency
  blueprint.meta.skillsHash = calculateSkillsHash(blueprint.skills);

  // Update timestamp
  blueprint.meta.updatedAt = new Date().toISOString();

  // Generate filename
  const filename = generateBlueprintFilename(blueprint.meta);

  // Convert to JSON string
  const jsonString = JSON.stringify(blueprint, null, 2);

  // Create blob
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Download using Chrome Downloads API
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.downloads) {
      // Fallback for development/testing
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      resolve(0); // Dummy download ID
      return;
    }

    chrome.downloads.download(
      {
        url: url,
        filename: filename,
        saveAs: true, // Allow user to choose location
      },
      (downloadId) => {
        URL.revokeObjectURL(url);

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(downloadId ?? 0);
        }
      },
    );
  });
}

/**
 * Export multiple Blueprints to separate JSON files
 * @param blueprints - Array of Blueprints to export
 * @returns Array of download IDs
 */
export async function exportMultipleBlueprints(
  blueprints: Blueprint[],
): Promise<number[]> {
  const downloadIds: number[] = [];

  for (const blueprint of blueprints) {
    const downloadId = await exportBlueprint(blueprint);
    downloadIds.push(downloadId);
  }

  return downloadIds;
}

/**
 * Import a Blueprint from a JSON file
 * @param file - File object from file picker
 * @returns Imported Blueprint
 */
export async function importBlueprint(file: File): Promise<Blueprint> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          throw new Error('Failed to read file');
        }

        const jsonString = event.target.result as string;
        const data = JSON.parse(jsonString);

        // Validate Blueprint structure
        const validation = validateBlueprint(data);
        if (!validation.valid) {
          reject(
            new Error(
              `Invalid Blueprint file: ${JSON.stringify(validation.errors)}`,
            ),
          );
          return;
        }

        resolve(validation.data!);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse Blueprint file: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          ),
        );
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Import multiple Blueprints from JSON files
 * @param files - Array of File objects from file picker
 * @returns Array of imported Blueprints
 */
export async function importMultipleBlueprints(
  files: File[],
): Promise<Blueprint[]> {
  const blueprints: Blueprint[] = [];
  const errors: Array<{ file: string; error: string }> = [];

  for (const file of files) {
    try {
      const blueprint = await importBlueprint(file);
      blueprints.push(blueprint);
    } catch (error) {
      errors.push({
        file: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (errors.length > 0) {
    console.warn('Some Blueprint files failed to import:', errors);
  }

  return blueprints;
}

/**
 * Create a Blueprint from current state
 * @param meta - Blueprint metadata
 * @param skills - Array of AtomicTools
 * @param rules - Rule Book (Markdown)
 * @param agentConfig - Optional agent configuration
 * @returns Complete Blueprint object
 */
export function createBlueprint(
  meta: Omit<BlueprintMeta, 'skillsHash' | 'createdAt' | 'updatedAt'>,
  skills: AtomicTool[],
  rules: string,
  agentConfig?: AgentConfig,
): Blueprint {
  const now = new Date().toISOString();

  return {
    meta: {
      ...meta,
      skillsHash: calculateSkillsHash(skills), // Will be recalculated properly
      createdAt: now,
      updatedAt: now,
    },
    skills,
    rules,
    agentConfig,
  };
}

/**
 * Clone a Blueprint (deep copy)
 * @param blueprint - Blueprint to clone
 * @returns Cloned Blueprint
 */
export function cloneBlueprint(blueprint: Blueprint): Blueprint {
  return JSON.parse(JSON.stringify(blueprint));
}

/**
 * Merge two Blueprints
 * @param base - Base Blueprint
 * @param update - Update Blueprint
 * @returns Merged Blueprint
 */
export function mergeBlueprints(base: Blueprint, update: Blueprint): Blueprint {
  return {
    meta: {
      ...base.meta,
      ...update.meta,
      // Keep base metadata unless explicitly overridden
      name: update.meta.name || base.meta.name,
      version: update.meta.version || base.meta.version,
    },
    skills: [...base.skills, ...update.skills],
    rules: update.rules || base.rules,
    agentConfig: update.agentConfig || base.agentConfig || undefined,
    maintenance: update.maintenance || base.maintenance,
  };
}

/**
 * Check if Blueprint file is valid
 * @param file - File to check
 * @returns True if file appears to be a valid Blueprint
 */
export function isValidBlueprintFile(file: File): boolean {
  // Check file extension
  if (!file.name.endsWith('.blueprint.json')) {
    return false;
  }

  // Check file size (limit to 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    return false;
  }

  return true;
}

/**
 * Get Blueprint file info
 * @param file - File object
 * @returns File information
 */
export function getBlueprintFileInfo(file: File): {
  name: string;
  size: number;
  sizeFormatted: string;
  lastModified: string;
} {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return {
    name: file.name,
    size: file.size,
    sizeFormatted: formatBytes(file.size),
    lastModified: new Date(file.lastModified).toISOString(),
  };
}
