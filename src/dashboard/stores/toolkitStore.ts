/**
 * =============================================================================
 * Toolkit Store
 * =============================================================================
 *
 * State management for Toolkit library
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Toolkit } from '@homura/sdk/types';
import {
  saveToolkitToStorage,
  getToolkitsFromStorage,
  deleteToolkitFromStorage,
  deleteToolkitsFromStorage,
} from '@shared/storage/toolkitStorage';
import {
  addToolToToolkit,
  removeToolFromToolkit,
  moveToolInToolkit,
  updateToolInToolkit,
} from '../utils/toolkitOperations';

interface ToolkitStore {
  /** All Toolkits in the library */
  toolkits: Toolkit[];

  /** Currently selected Toolkit */
  selectedToolkit: Toolkit | null;

  /** Export dialog state */
  exportDialogOpen: boolean;

  /** Import dialog state */
  importDialogOpen: boolean;

  /** Is processing export/import */
  isProcessing: boolean;

  /** Processing progress (0-100) */
  processingProgress: number;

  /** Processing message */
  processingMessage: string;

  /** Search query */
  searchQuery: string;

  /** Selected tags filter */
  selectedTags: string[];

  // ========== Actions ==========

  /** Load toolkits from storage */
  loadToolkits: () => Promise<void>;

  /** Add a Toolkit to the library */
  addToolkit: (toolkit: Toolkit) => Promise<void>;

  /** Update a Toolkit */
  updateToolkit: (id: string, updates: Partial<Toolkit>) => Promise<void>;

  /** Remove a Toolkit */
  removeToolkit: (id: string) => Promise<void>;

  /** Remove multiple Toolkits */
  removeToolkits: (ids: string[]) => Promise<void>;

  /** Select a Toolkit */
  selectToolkit: (toolkit: Toolkit | null) => void;

  /** Get Toolkit by ID */
  getToolkitById: (id: string) => Toolkit | undefined;

  /** Add tool to toolkit */
  addTool: (
    toolkitId: string,
    tool: import('@homura/sdk/types').AtomicTool,
    index?: number,
  ) => Promise<void>;

  /** Remove tool from toolkit */
  removeTool: (toolkitId: string, toolId: string) => Promise<void>;

  /** Move tool in toolkit */
  moveTool: (
    toolkitId: string,
    fromIndex: number,
    toIndex: number,
  ) => Promise<void>;

  /** Update tool in toolkit */
  updateTool: (
    toolkitId: string,
    toolId: string,
    updates: Partial<import('@homura/sdk/types').AtomicTool>,
  ) => Promise<void>;

  /** Set export dialog open state */
  setExportDialogOpen: (open: boolean) => void;

  /** Set import dialog open state */
  setImportDialogOpen: (open: boolean) => void;

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

  /** Export Toolkit */
  exportToolkit: (toolkit: Toolkit) => Promise<void>;

  /** Export multiple Toolkits */
  exportToolkits: (toolkits: Toolkit[]) => Promise<void>;

  /** Import Toolkits */
  importToolkits: (data: string) => Promise<void>;

  /** Get filtered toolkits */
  getFilteredToolkits: () => Toolkit[];
}

export const useToolkitStore = create<ToolkitStore>()(
  persist(
    (set, get) => ({
      // Initial state
      toolkits: [],
      selectedToolkit: null,
      exportDialogOpen: false,
      importDialogOpen: false,
      isProcessing: false,
      processingProgress: 0,
      processingMessage: '',
      searchQuery: '',
      selectedTags: [],

      // Actions
      loadToolkits: async () => {
        const toolkits = await getToolkitsFromStorage();
        set({ toolkits });
      },

      addToolkit: async (toolkit) => {
        await saveToolkitToStorage(toolkit);
        set((state) => ({
          toolkits: [...state.toolkits, toolkit],
        }));
      },

      updateToolkit: async (id, updates) => {
        const toolkit = get().toolkits.find((t) => t.id === id);
        if (!toolkit) return;

        const updated = {
          ...toolkit,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        await saveToolkitToStorage(updated);
        set((state) => ({
          toolkits: state.toolkits.map((t) => (t.id === id ? updated : t)),
          selectedToolkit:
            state.selectedToolkit?.id === id ? updated : state.selectedToolkit,
        }));
      },

      removeToolkit: async (id) => {
        await deleteToolkitFromStorage(id);
        set((state) => ({
          toolkits: state.toolkits.filter((t) => t.id !== id),
          selectedToolkit:
            state.selectedToolkit?.id === id ? null : state.selectedToolkit,
        }));
      },

      removeToolkits: async (ids) => {
        await deleteToolkitsFromStorage(ids);
        set((state) => ({
          toolkits: state.toolkits.filter((t) => !ids.includes(t.id)),
          selectedToolkit: ids.includes(state.selectedToolkit?.id ?? '')
            ? null
            : state.selectedToolkit,
        }));
      },

      selectToolkit: (toolkit) => set({ selectedToolkit: toolkit }),

      getToolkitById: (id) => {
        return get().toolkits.find((t) => t.id === id);
      },

      addTool: async (toolkitId, tool, index) => {
        const toolkit = get().toolkits.find((t) => t.id === toolkitId);
        if (!toolkit) return;

        const updated = addToolToToolkit(toolkit, tool, index);
        await saveToolkitToStorage(updated);
        set((state) => ({
          toolkits: state.toolkits.map((t) =>
            t.id === toolkitId ? updated : t,
          ),
          selectedToolkit:
            state.selectedToolkit?.id === toolkitId
              ? updated
              : state.selectedToolkit,
        }));
      },

      removeTool: async (toolkitId, toolId) => {
        const toolkit = get().toolkits.find((t) => t.id === toolkitId);
        if (!toolkit) return;

        const updated = removeToolFromToolkit(toolkit, toolId);
        await saveToolkitToStorage(updated);
        set((state) => ({
          toolkits: state.toolkits.map((t) =>
            t.id === toolkitId ? updated : t,
          ),
          selectedToolkit:
            state.selectedToolkit?.id === toolkitId
              ? updated
              : state.selectedToolkit,
        }));
      },

      moveTool: async (toolkitId, fromIndex, toIndex) => {
        const toolkit = get().toolkits.find((t) => t.id === toolkitId);
        if (!toolkit) return;

        const updated = moveToolInToolkit(toolkit, fromIndex, toIndex);
        await saveToolkitToStorage(updated);
        set((state) => ({
          toolkits: state.toolkits.map((t) =>
            t.id === toolkitId ? updated : t,
          ),
          selectedToolkit:
            state.selectedToolkit?.id === toolkitId
              ? updated
              : state.selectedToolkit,
        }));
      },

      updateTool: async (toolkitId, toolId, updates) => {
        const toolkit = get().toolkits.find((t) => t.id === toolkitId);
        if (!toolkit) return;

        const updated = updateToolInToolkit(toolkit, toolId, updates);
        await saveToolkitToStorage(updated);
        set((state) => ({
          toolkits: state.toolkits.map((t) =>
            t.id === toolkitId ? updated : t,
          ),
          selectedToolkit:
            state.selectedToolkit?.id === toolkitId
              ? updated
              : state.selectedToolkit,
        }));
      },

      setExportDialogOpen: (open) => set({ exportDialogOpen: open }),

      setImportDialogOpen: (open) => set({ importDialogOpen: open }),

      setProcessing: (isProcessing, message = '', progress = 0) =>
        set({
          isProcessing,
          processingMessage: message,
          processingProgress: progress,
        }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setSelectedTags: (tags) => set({ selectedTags: tags }),

      exportToolkit: async (toolkit) => {
        const { exportToolkitData } = await import('../utils/toolkitIO');

        set({
          isProcessing: true,
          processingMessage: '正在导出工具集...',
          processingProgress: 0,
        });

        try {
          await exportToolkitData(toolkit);

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

      exportToolkits: async (toolkits) => {
        const { exportMultipleToolkits } = await import('../utils/toolkitIO');

        set({
          isProcessing: true,
          processingMessage: `正在导出 ${toolkits.length} 个工具集...`,
          processingProgress: 0,
        });

        try {
          await exportMultipleToolkits(toolkits);

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

      importToolkits: async (data) => {
        const { importToolkitData } = await import('../utils/toolkitIO');

        set({
          isProcessing: true,
          processingMessage: '正在导入工具集...',
          processingProgress: 0,
        });

        try {
          const imported = await importToolkitData(data);

          // Save all imported toolkits
          for (const toolkit of imported) {
            await saveToolkitToStorage(toolkit);
          }

          // Reload from storage
          const all = await getToolkitsFromStorage();
          set({
            toolkits: all,
            isProcessing: false,
            processingMessage: '导入成功',
            processingProgress: 100,
            importDialogOpen: false,
          });

          setTimeout(() => {
            set({ processingMessage: '' });
          }, 2000);
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

      getFilteredToolkits: () => {
        const { toolkits, searchQuery, selectedTags } = get();
        let filtered = [...toolkits];

        // Apply search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (tk) =>
              tk.name.toLowerCase().includes(query) ||
              tk.description?.toLowerCase().includes(query),
          );
        }

        // Apply tag filter
        if (selectedTags.length > 0) {
          filtered = filtered.filter((tk) =>
            selectedTags.some((tag) => tk.tags?.includes(tag)),
          );
        }

        return filtered;
      },
    }),
    {
      name: 'homura-toolkit-store',
      partialize: (state) => ({
        toolkits: state.toolkits,
        searchQuery: state.searchQuery,
        selectedTags: state.selectedTags,
      }),
    },
  ),
);
