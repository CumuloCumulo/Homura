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
  RecordedAction 
} from '@shared/selectorBuilder';
import type { LogEntry } from '@shared/types';

export type RecordingMode = 'inspect' | 'record' | 'build';

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
  /** Draft selector being built */
  selectorDraft: SelectorDraft | null;
  /** Recorded actions */
  recordedActions: RecordedAction[];
  /** Logs */
  logs: LogEntry[];
  /** AI is processing */
  isProcessing: boolean;

  // Actions
  setMode: (mode: RecordingMode) => void;
  setInspecting: (active: boolean) => void;
  setRecording: (active: boolean) => void;
  setHoveredElement: (element: HTMLElement | null) => void;
  setSelectedElement: (element: HTMLElement | null) => void;
  setAnalysis: (analysis: ElementAnalysis | null) => void;
  setSelectorDraft: (draft: SelectorDraft | null) => void;
  addRecordedAction: (action: RecordedAction) => void;
  setRecordedActions: (actions: RecordedAction[]) => void;
  deleteRecordedAction: (id: string) => void;
  updateRecordedAction: (id: string, updates: Partial<RecordedAction>) => void;
  clearRecordedActions: () => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  setProcessing: (processing: boolean) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingStore>((set) => ({
  mode: 'inspect',
  isInspecting: false,
  isRecording: false,
  hoveredElement: null,
  selectedElement: null,
  analysis: null,
  selectorDraft: null,
  recordedActions: [],
  logs: [],
  isProcessing: false,

  setMode: (mode) => set({ mode }),
  setInspecting: (active) => set({ isInspecting: active }),
  setRecording: (active) => set({ isRecording: active }),
  setHoveredElement: (element) => set({ hoveredElement: element }),
  setSelectedElement: (element) => set({ selectedElement: element }),
  setAnalysis: (analysis) => set({ analysis }),
  setSelectorDraft: (draft) => set({ selectorDraft: draft }),
  addRecordedAction: (action) => set((state) => ({
    recordedActions: [...state.recordedActions, action],
  })),
  setRecordedActions: (actions) => set({ recordedActions: actions }),
  deleteRecordedAction: (id) => set((state) => ({
    recordedActions: state.recordedActions.filter((action) => action.id !== id),
  })),
  updateRecordedAction: (id, updates) => set((state) => ({
    recordedActions: state.recordedActions.map((action) =>
      action.id === id ? { ...action, ...updates } : action
    ),
  })),
  clearRecordedActions: () => set({ recordedActions: [] }),
  addLog: (log) => set((state) => ({
    logs: [...state.logs, log],
  })),
  clearLogs: () => set({ logs: [] }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  reset: () => set({
    isInspecting: false,
    isRecording: false,
    hoveredElement: null,
    selectedElement: null,
    analysis: null,
    selectorDraft: null,
    recordedActions: [],
  }),
}));
