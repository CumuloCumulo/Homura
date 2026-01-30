/**
 * Mission State Management with Zustand
 */

import { create, type StateCreator } from 'zustand';
import type { LogEntry, Mission } from '@shared/types';

interface MissionState {
  /** Current mission */
  currentMission: Mission | null;
  /** Is a mission currently running */
  isRunning: boolean;
  /** Execution logs */
  logs: LogEntry[];
  /** Current step */
  currentStep: number;
  /** Total steps */
  totalSteps: number;
  /** Debug mode enabled */
  debugMode: boolean;
  
  // Actions
  setMission: (mission: Mission | null) => void;
  setRunning: (running: boolean) => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  setProgress: (current: number, total: number) => void;
  setDebugMode: (enabled: boolean) => void;
  reset: () => void;
}

const storeCreator: StateCreator<MissionState> = (set) => ({
  currentMission: null,
  isRunning: false,
  logs: [],
  currentStep: 0,
  totalSteps: 0,
  debugMode: true,
  
  setMission: (mission: Mission | null) => set({ currentMission: mission }),
  setRunning: (running: boolean) => set({ isRunning: running }),
  addLog: (log: LogEntry) => set((state: MissionState) => ({ logs: [...state.logs, log] })),
  clearLogs: () => set({ logs: [] }),
  setProgress: (current: number, total: number) => set({ currentStep: current, totalSteps: total }),
  setDebugMode: (enabled: boolean) => set({ debugMode: enabled }),
  reset: () => set({
    currentMission: null,
    isRunning: false,
    logs: [],
    currentStep: 0,
    totalSteps: 0,
  }),
});

export const useMissionStore = create<MissionState>(storeCreator);
