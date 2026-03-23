/**
 * =============================================================================
 * Blueprint Store
 * =============================================================================
 *
 * State management for Blueprint library
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Blueprint,
  BlueprintConflict,
  MergeStrategy,
} from '@homura/sdk/types';

interface BlueprintStore {
  /** All Blueprints in the library */
  blueprints: Blueprint[];

  /** Currently selected Blueprint */
  selectedBlueprint: Blueprint | null;

  /** Search query for filtering */
  searchQuery: string;

  /** Selected tags for filtering */
  selectedTags: string[];

  /** Export dialog state */
  exportDialogOpen: boolean;

  /** Import dialog state */
  importDialogOpen: boolean;

  /** Pending imports (waiting for conflict resolution) */
  pendingImports: Blueprint[];

  /** Detected conflicts */
  conflicts: BlueprintConflict[];

  /** Is processing export/import */
  isProcessing: boolean;

  /** Processing progress (0-100) */
  processingProgress: number;

  /** Processing message */
  processingMessage: string;

  // ========== Actions ==========

  /** Add a Blueprint to the library */
  addBlueprint: (blueprint: Blueprint) => void;

  /** Update a Blueprint */
  updateBlueprint: (id: string, updates: Partial<Blueprint>) => void;

  /** Remove a Blueprint */
  removeBlueprint: (id: string) => void;

  /** Select a Blueprint */
  selectBlueprint: (blueprint: Blueprint | null) => void;

  /** Get Blueprint by ID */
  getBlueprintById: (id: string) => Blueprint | undefined;

  /** Get Blueprint by name and version */
  getBlueprintByNameAndVersion: (
    name: string,
    version: string,
  ) => Blueprint | undefined;

  /** Set export dialog open state */
  setExportDialogOpen: (open: boolean) => void;

  /** Set import dialog open state */
  setImportDialogOpen: (open: boolean) => void;

  /** Set pending imports */
  setPendingImports: (imports: Blueprint[]) => void;

  /** Set conflicts */
  setConflicts: (conflicts: BlueprintConflict[]) => void;

  /** Resolve conflicts */
  resolveConflicts: (
    resolutions: Record<string, 'skip' | 'replace' | 'rename'>,
  ) => void;

  /** Clear pending imports */
  clearPendingImports: () => void;

  /** Set processing state */
  setProcessing: (
    isProcessing: boolean,
    message?: string,
    progress?: number,
  ) => void;

  /** Set search query */
  setSearchQuery: (query: string) => void;

  /** Set selected tags */
  setSelectedTags: (tags: string[]) => void;

  /** Get filtered blueprints */
  getFilteredBlueprints: () => Blueprint[];

  /** Load blueprints from storage */
  loadBlueprints: () => Promise<void>;

  /** Import Blueprints with conflict resolution */
  importBlueprints: (
    blueprints: Blueprint[],
    mergeStrategy: MergeStrategy,
  ) => Promise<void>;

  /** Export Blueprint */
  exportBlueprint: (blueprint: Blueprint) => Promise<void>;

  /** Export multiple Blueprints */
  exportMultipleBlueprints: (blueprints: Blueprint[]) => Promise<void>;
}

export const useBlueprintStore = create<BlueprintStore>()(
  persist(
    (set, get) => ({
      // Initial state
      blueprints: [],
      selectedBlueprint: null,
      searchQuery: '',
      selectedTags: [],
      exportDialogOpen: false,
      importDialogOpen: false,
      pendingImports: [],
      conflicts: [],
      isProcessing: false,
      processingProgress: 0,
      processingMessage: '',

      // Actions
      addBlueprint: (blueprint) =>
        set((state) => ({
          blueprints: [...state.blueprints, blueprint],
        })),

      updateBlueprint: (id, updates) =>
        set((state) => ({
          blueprints: state.blueprints.map((bp) =>
            bp.meta.id === id ? { ...bp, ...updates } : bp,
          ),
          selectedBlueprint:
            state.selectedBlueprint?.meta.id === id
              ? { ...state.selectedBlueprint, ...updates }
              : state.selectedBlueprint,
        })),

      removeBlueprint: (id) =>
        set((state) => ({
          blueprints: state.blueprints.filter((bp) => bp.meta.id !== id),
          selectedBlueprint:
            state.selectedBlueprint?.meta.id === id
              ? null
              : state.selectedBlueprint,
        })),

      selectBlueprint: (blueprint) => set({ selectedBlueprint: blueprint }),

      getBlueprintById: (id) => {
        return get().blueprints.find((bp) => bp.meta.id === id);
      },

      getBlueprintByNameAndVersion: (name, version) => {
        return get().blueprints.find(
          (bp) => bp.meta.name === name && bp.meta.version === version,
        );
      },

      setExportDialogOpen: (open) => set({ exportDialogOpen: open }),

      setImportDialogOpen: (open) => set({ importDialogOpen: open }),

      setPendingImports: (imports) => set({ pendingImports: imports }),

      setConflicts: (conflicts) => set({ conflicts }),

      resolveConflicts: (resolutions) =>
        set((state) => {
          // Apply resolutions to pending imports
          let resolvedBlueprints = [...state.pendingImports];

          for (const [toolId, resolution] of Object.entries(resolutions)) {
            const conflict = state.conflicts.find((c) => c.id === toolId);
            if (!conflict) continue;

            if (resolution === 'skip') {
              // Remove the tool from blueprint
              resolvedBlueprints = resolvedBlueprints.map((bp) => ({
                ...bp,
                skills: bp.skills.filter((s) => s.tool_id !== toolId),
              }));
            } else if (resolution === 'rename') {
              // Generate new ID
              resolvedBlueprints = resolvedBlueprints.map((bp) => ({
                ...bp,
                skills: bp.skills.map((s) =>
                  s.tool_id === toolId
                    ? { ...s, tool_id: `${s.tool_id}_imported_${Date.now()}` }
                    : s,
                ),
              }));
            }
            // 'replace' means keep as-is
          }

          // Add resolved blueprints to library
          return {
            blueprints: [...state.blueprints, ...resolvedBlueprints],
            pendingImports: [],
            conflicts: [],
            importDialogOpen: false,
          };
        }),

      clearPendingImports: () =>
        set({
          pendingImports: [],
          conflicts: [],
        }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setSelectedTags: (tags) => set({ selectedTags: tags }),

      getFilteredBlueprints: () => {
        const state = get();
        return state.blueprints.filter((blueprint) => {
          const matchesSearch =
            !state.searchQuery ||
            blueprint.meta.name
              .toLowerCase()
              .includes(state.searchQuery.toLowerCase()) ||
            blueprint.meta.description
              ?.toLowerCase()
              .includes(state.searchQuery.toLowerCase());

          const matchesTags =
            state.selectedTags.length === 0 ||
            blueprint.tags?.some((tag) => state.selectedTags.includes(tag));

          return matchesSearch && matchesTags;
        });
      },

      loadBlueprints: async () => {
        // Load from Chrome storage or zustand persist
        // This is a no-op since zustand persist handles loading
        // But we can add additional logic here if needed
      },

      setProcessing: (isProcessing, message = '', progress = 0) =>
        set({
          isProcessing,
          processingMessage: message,
          processingProgress: progress,
        }),

      importBlueprints: async (blueprints, mergeStrategy) => {
        const { detectConflicts } = await import('../utils/blueprintValidator');

        set({
          isProcessing: true,
          processingMessage: '正在导入 Blueprint...',
          processingProgress: 0,
        });

        try {
          // Detect conflicts
          const allConflicts: BlueprintConflict[] = [];
          for (const blueprint of blueprints) {
            const conflicts = detectConflicts(
              blueprint,
              get().blueprints.flatMap((bp) => bp.skills),
            );
            allConflicts.push(...conflicts);
          }

          if (allConflicts.length > 0 && mergeStrategy === 'skip_all') {
            // Skip all conflicts
            set({
              isProcessing: false,
              processingMessage: '',
              processingProgress: 0,
            });
            return;
          }

          if (allConflicts.length > 0 && mergeStrategy === 'rename_all') {
            // Rename all conflicts
            for (const blueprint of blueprints) {
              for (const conflict of allConflicts) {
                const skill = blueprint.skills.find(
                  (s) => s.tool_id === conflict.id,
                );
                if (skill) {
                  skill.tool_id = `${skill.tool_id}_imported_${Date.now()}`;
                }
              }
            }
          }

          // Add blueprints to library
          set((state) => ({
            blueprints: [...state.blueprints, ...blueprints],
            isProcessing: false,
            processingMessage: '',
            processingProgress: 100,
            importDialogOpen: false,
          }));
        } catch (error) {
          set({
            isProcessing: false,
            processingMessage:
              error instanceof Error ? error.message : '导入失败',
            processingProgress: 0,
          });
          throw error;
        }
      },

      exportBlueprint: async (blueprint) => {
        const { exportBlueprint: _exportFunc } =
          await import('../utils/blueprintIO');

        set({
          isProcessing: true,
          processingMessage: '正在导出 Blueprint...',
          processingProgress: 0,
        });

        try {
          await _exportFunc(blueprint);

          set({
            isProcessing: false,
            processingMessage: '导出成功',
            processingProgress: 100,
            exportDialogOpen: false,
          });

          // Reset message after 2 seconds
          setTimeout(() => {
            set({ processingMessage: '' });
          }, 2000);
        } catch (error) {
          set({
            isProcessing: false,
            processingMessage:
              error instanceof Error ? error.message : '导出失败',
            processingProgress: 0,
          });
          throw error;
        }
      },

      exportMultipleBlueprints: async (blueprints) => {
        const { exportMultipleBlueprints: _exportFunc } =
          await import('../utils/blueprintIO');

        set({
          isProcessing: true,
          processingMessage: `正在导出 ${blueprints.length} 个 Blueprint...`,
          processingProgress: 0,
        });

        try {
          for (let i = 0; i < blueprints.length; i++) {
            await _exportFunc([blueprints[i]]);
            set({
              processingProgress: Math.round(
                ((i + 1) / blueprints.length) * 100,
              ),
            });
          }

          set({
            isProcessing: false,
            processingMessage: '导出成功',
            processingProgress: 100,
            exportDialogOpen: false,
          });

          setTimeout(() => {
            set({ processingMessage: '' });
          }, 2000);
        } catch (error) {
          set({
            isProcessing: false,
            processingMessage:
              error instanceof Error ? error.message : '导出失败',
            processingProgress: 0,
          });
          throw error;
        }
      },
    }),
    {
      name: 'homura-blueprint-store',
      partialize: (state) => ({
        blueprints: state.blueprints,
      }),
    },
  ),
);
