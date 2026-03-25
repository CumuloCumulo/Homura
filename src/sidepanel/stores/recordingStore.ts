/**
 * =============================================================================
 * Homura SidePanel - Recording Store
 * =============================================================================
 *
 * State management for the recording/inspection functionality
 */

import { create } from 'zustand';
import type {
  ElementAnalysis,
  SelectorDraft,
  RecordedAction,
  PathSelector,
} from '@shared/selectorBuilder/types';
import type { LogEntry } from '@shared/types';
import type {
  UnifiedSelector,
  AtomicTool,
  SelectorLogic,
} from '@homura/sdk/types';
import { convertSelectorLogicToUnified } from '@shared/selectorBuilder/generator';

export type RecordingMode = 'inspect' | 'record';

// AI Strategy Types
export type AIStatus = 'idle' | 'analyzing' | 'decided';
export type AIStrategy = 'path_selector' | 'scope_anchor_target' | null;
export type ViewMode = 'path' | 'structure';

interface RecordingStore {
  /** Current mode */
  mode: RecordingMode;
  /** Is inspection active (listening to mouse events) */
  isInspecting: boolean;
  /** Is recording active */
  isRecording: boolean;
  /** Currently hovered element (in inspect mode) */
  hoveredElement: HTMLElement | null;
  /** Selected element for building */
  selectedElement: HTMLElement | null;
  /** Current element analysis */
  analysis: ElementAnalysis | null;
  /** Draft selector being built - @deprecated Use unifiedSelector instead */
  selectorDraft: SelectorDraft | null;
  /**
   * Unified selector - the single source of truth for selector data
   * Replaces fragmented selectorDraft + pathSelectorResult
   */
  unifiedSelector: UnifiedSelector | null;
  /** Recorded actions */
  recordedActions: RecordedAction[];
  /** Logs */
  logs: LogEntry[];
  /** AI is processing */
  isProcessing: boolean;

  // ==========================================================================
  // AI Strategy State
  // ==========================================================================

  /** AI decision status */
  aiStatus: AIStatus;
  /** AI chosen strategy */
  aiStrategy: AIStrategy;
  /** AI reasoning for the decision */
  aiReasoning?: string;
  /** User override of the view mode */
  userModeOverride?: ViewMode;
  /** AI-generated path selector result - @deprecated Use unifiedSelector.pathData instead */
  pathSelectorResult?: PathSelector;
  /** Container type detected by AI */
  containerType?: string;

  // ==========================================================================
  // Tool Editing State (for Test → Inspect workflow)
  // ==========================================================================

  /** Toolkit ID being edited (from test mode) */
  editingToolkitId: string | null;
  /** Index of tool being edited within the toolkit */
  editingToolIndex: number | null;
  /** The tool being edited (loaded from test mode) */
  editingTool: AtomicTool | null;
  /** Original unified selector before editing (for cancel) */
  originalSelector: UnifiedSelector | null;
  /** Sync status: idle, syncing, success, error */
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  /** Sync error message */
  syncError?: string;

  // Actions
  setMode: (mode: RecordingMode) => void;
  setInspecting: (active: boolean) => void;
  setRecording: (active: boolean) => void;
  setHoveredElement: (element: HTMLElement | null) => void;
  setSelectedElement: (element: HTMLElement | null) => void;
  setAnalysis: (analysis: ElementAnalysis | null) => void;
  /** @deprecated Use setUnifiedSelector instead */
  setSelectorDraft: (draft: SelectorDraft | null) => void;
  /** Set the unified selector (primary method) */
  setUnifiedSelector: (selector: UnifiedSelector | null) => void;
  /** Update specific fields of the unified selector */
  updateUnifiedSelector: (updates: Partial<UnifiedSelector>) => void;
  addRecordedAction: (action: RecordedAction) => void;
  setRecordedActions: (actions: RecordedAction[]) => void;
  deleteRecordedAction: (id: string) => void;
  updateRecordedAction: (id: string, updates: Partial<RecordedAction>) => void;
  clearRecordedActions: () => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  setProcessing: (processing: boolean) => void;
  reset: () => void;

  // AI Strategy Actions
  setAIStatus: (status: AIStatus) => void;
  setAIStrategy: (strategy: AIStrategy, reasoning?: string) => void;
  setUserModeOverride: (mode: ViewMode | undefined) => void;
  /** @deprecated Use setUnifiedSelector instead */
  setPathSelectorResult: (result: PathSelector | undefined) => void;
  setContainerType: (type: string | undefined) => void;
  resetAIState: () => void;

  // Tool Editing Actions
  /** Start editing a tool from test mode */
  startEditingTool: (
    toolkitId: string,
    toolIndex: number,
    tool: AtomicTool,
  ) => void;
  /** Finish editing and sync to dashboard */
  finishEditing: () => Promise<void>;
  /** Cancel editing and return to test mode */
  cancelEditing: () => void;
  /** Set sync status */
  setSyncStatus: (
    status: 'idle' | 'syncing' | 'success' | 'error',
    error?: string,
  ) => void;
}

export const useRecordingStore = create<RecordingStore>((set) => ({
  mode: 'inspect',
  isInspecting: false,
  isRecording: false,
  hoveredElement: null,
  selectedElement: null,
  analysis: null,
  selectorDraft: null,
  unifiedSelector: null,
  recordedActions: [],
  logs: [],
  isProcessing: false,

  // AI Strategy State - Initial values
  aiStatus: 'idle',
  aiStrategy: null,
  aiReasoning: undefined,
  userModeOverride: undefined,
  pathSelectorResult: undefined,
  containerType: undefined,

  // Tool Editing State - Initial values
  editingToolkitId: null,
  editingToolIndex: null,
  editingTool: null,
  originalSelector: null,
  syncStatus: 'idle',
  syncError: undefined,

  setMode: (mode) => set({ mode }),
  setInspecting: (active) => set({ isInspecting: active }),
  setRecording: (active) => set({ isRecording: active }),
  setHoveredElement: (element) => set({ hoveredElement: element }),
  setSelectedElement: (element) => set({ selectedElement: element }),
  setAnalysis: (analysis) =>
    set({
      analysis,
      selectorDraft: null,
      unifiedSelector: null,
      // Reset AI state when analysis changes
      aiStatus: 'idle',
      aiStrategy: null,
      aiReasoning: undefined,
      userModeOverride: undefined,
      pathSelectorResult: undefined,
    }),
  setSelectorDraft: (draft) => set({ selectorDraft: draft }),
  setUnifiedSelector: (selector) =>
    set({
      unifiedSelector: selector,
      // Keep selectorDraft in sync for backward compatibility
      // This can be removed once all components migrate to UnifiedSelector
      aiStrategy:
        selector?.strategy === 'path'
          ? 'path_selector'
          : selector?.strategy === 'scope_anchor_target'
            ? 'scope_anchor_target'
            : null,
    }),
  updateUnifiedSelector: (updates) =>
    set((state) => ({
      unifiedSelector: state.unifiedSelector
        ? { ...state.unifiedSelector, ...updates }
        : null,
    })),
  addRecordedAction: (action) =>
    set((state) => ({
      recordedActions: [...state.recordedActions, action],
    })),
  setRecordedActions: (actions) => set({ recordedActions: actions }),
  deleteRecordedAction: (id) =>
    set((state) => ({
      recordedActions: state.recordedActions.filter(
        (action) => action.id !== id,
      ),
    })),
  updateRecordedAction: (id, updates) =>
    set((state) => ({
      recordedActions: state.recordedActions.map((action) =>
        action.id === id ? { ...action, ...updates } : action,
      ),
    })),
  clearRecordedActions: () => set({ recordedActions: [] }),
  addLog: (log) =>
    set((state) => ({
      logs: [...state.logs, log],
    })),
  clearLogs: () => set({ logs: [] }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  reset: () =>
    set({
      isInspecting: false,
      isRecording: false,
      hoveredElement: null,
      selectedElement: null,
      analysis: null,
      selectorDraft: null,
      unifiedSelector: null,
      recordedActions: [],
      // Reset AI state
      aiStatus: 'idle',
      aiStrategy: null,
      aiReasoning: undefined,
      userModeOverride: undefined,
      pathSelectorResult: undefined,
      containerType: undefined,
    }),

  // AI Strategy Actions
  setAIStatus: (status) => set({ aiStatus: status }),
  setAIStrategy: (strategy, reasoning) =>
    set({
      aiStrategy: strategy,
      aiReasoning: reasoning,
      aiStatus: 'decided',
    }),
  setUserModeOverride: (mode) => set({ userModeOverride: mode }),
  setPathSelectorResult: (result) => set({ pathSelectorResult: result }),
  setContainerType: (type) => set({ containerType: type }),
  resetAIState: () =>
    set({
      aiStatus: 'idle',
      aiStrategy: null,
      aiReasoning: undefined,
      userModeOverride: undefined,
      pathSelectorResult: undefined,
      unifiedSelector: null,
    }),

  // Tool Editing Actions
  startEditingTool: (
    toolkitId: string,
    toolIndex: number,
    tool: AtomicTool,
  ) => {
    // Convert AtomicTool.selector_logic to UnifiedSelector for editing
    const unifiedSelector = convertSelectorLogicToUnified(
      tool.selector_logic,
      tool.description ? 0.8 : 0.7,
    );

    // Store original selector for cancel functionality
    set({
      editingToolkitId: toolkitId,
      editingToolIndex: toolIndex,
      editingTool: tool,
      originalSelector: unifiedSelector,
      unifiedSelector,
      // Also sync selectorDraft for backward compatibility
      selectorDraft: {
        target: {
          selector: tool.selector_logic.target.selector,
          action: tool.selector_logic.target.action,
        },
        scope: tool.selector_logic.scope
          ? {
              selector: tool.selector_logic.scope.selector,
              type: tool.selector_logic.scope.type,
              matchCount: 0,
            }
          : undefined,
        anchor: tool.selector_logic.anchor
          ? {
              selector: tool.selector_logic.anchor.selector,
              type: tool.selector_logic.anchor.type,
              value: tool.selector_logic.anchor.value,
              matchMode: tool.selector_logic.anchor.matchMode || 'contains',
            }
          : undefined,
        confidence: 0.7,
        validated: false,
      },
      syncStatus: 'idle',
      syncError: undefined,
    });
  },

  finishEditing: async () => {
    const state = useRecordingStore.getState();
    if (
      !state.editingToolkitId ||
      !state.editingToolIndex === null ||
      !state.unifiedSelector
    ) {
      console.error('[RecordingStore] Cannot finish editing: missing state');
      return;
    }

    // Convert UnifiedSelector back to SelectorLogic
    const selectorLogic: SelectorLogic = {
      target: {
        selector:
          state.unifiedSelector.structureData?.target.selector ||
          state.unifiedSelector.fullSelector,
        action: state.unifiedSelector.action.type,
        actionParams: state.unifiedSelector.action.params,
      },
    };

    if (
      state.unifiedSelector.strategy === 'scope_anchor_target' &&
      state.unifiedSelector.structureData
    ) {
      selectorLogic.scope = {
        type: state.unifiedSelector.structureData.scope.type,
        selector: state.unifiedSelector.structureData.scope.selector,
      };

      if (state.unifiedSelector.structureData.anchor) {
        selectorLogic.anchor = {
          type: state.unifiedSelector.structureData.anchor.type,
          selector: state.unifiedSelector.structureData.anchor.selector,
          value: state.unifiedSelector.structureData.anchor.value,
          matchMode: state.unifiedSelector.structureData.anchor.matchMode,
        };
      }
    }

    // Create updated tool
    const updatedTool: AtomicTool = {
      ...state.editingTool!,
      selector_logic: selectorLogic,
    };

    set({ syncStatus: 'syncing' });

    try {
      // Send to Dashboard for sync
      const response = await chrome.runtime.sendMessage({
        type: 'TOOL_UPDATED',
        payload: {
          toolkitId: state.editingToolkitId,
          toolIndex: state.editingToolIndex,
          updatedTool,
        },
      });

      if (response?.success) {
        set({ syncStatus: 'success' });
        // Clear editing state after successful sync
        setTimeout(() => {
          set({
            editingToolkitId: null,
            editingToolIndex: null,
            editingTool: null,
            originalSelector: null,
            syncStatus: 'idle',
          });
        }, 1000);
      } else {
        set({
          syncStatus: 'error',
          syncError: response?.error || '同步失败',
        });
      }
    } catch (error) {
      console.error('[RecordingStore] Sync error:', error);
      set({
        syncStatus: 'error',
        syncError: error instanceof Error ? error.message : '同步失败',
      });
    }
  },

  cancelEditing: () => {
    set({
      editingToolkitId: null,
      editingToolIndex: null,
      editingTool: null,
      originalSelector: null,
      syncStatus: 'idle',
      syncError: undefined,
      unifiedSelector: null,
      selectorDraft: null,
    });
  },

  setSyncStatus: (
    status: 'idle' | 'syncing' | 'success' | 'error',
    error?: string,
  ) =>
    set({
      syncStatus: status,
      syncError: error,
    }),
}));
