/**
 * =============================================================================
 * Homura Dashboard - Tool Store
 * =============================================================================
 * 
 * State management for tool library
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AtomicTool, LogEntry, Mission } from '@shared/types';

interface ToolStore {
  /** All tools in the library */
  tools: AtomicTool[];
  /** Currently selected tool */
  selectedTool: AtomicTool | null;
  /** Current mission */
  currentMission: Mission | null;
  /** Rule book content (markdown) */
  ruleBook: string;
  /** Execution logs */
  logs: LogEntry[];
  /** Is mission running */
  isRunning: boolean;
  
  // Actions
  addTool: (tool: AtomicTool) => void;
  updateTool: (toolId: string, updates: Partial<AtomicTool>) => void;
  removeTool: (toolId: string) => void;
  selectTool: (tool: AtomicTool | null) => void;
  setRuleBook: (content: string) => void;
  setMission: (mission: Mission | null) => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  setRunning: (running: boolean) => void;
}

// Default rule book template
const DEFAULT_RULE_BOOK = `# 自动化规则

## 目标
描述这个自动化任务的目标...

## 规则
1. **第一步**：使用【工具名称】执行操作
2. **判断**：如果满足条件 A，执行...
3. **异常处理**：如果失败，调用【人工介入】

## 变量
- \`{{student_name}}\`: 学生姓名
`;

export const useToolStore = create<ToolStore>()(
  persist(
    (set) => ({
      tools: [],
      selectedTool: null,
      currentMission: null,
      ruleBook: DEFAULT_RULE_BOOK,
      logs: [],
      isRunning: false,

      addTool: (tool) => set((state) => ({
        tools: [...state.tools, tool],
      })),

      updateTool: (toolId, updates) => set((state) => ({
        tools: state.tools.map(t => 
          t.tool_id === toolId ? { ...t, ...updates } : t
        ),
      })),

      removeTool: (toolId) => set((state) => ({
        tools: state.tools.filter(t => t.tool_id !== toolId),
        selectedTool: state.selectedTool?.tool_id === toolId ? null : state.selectedTool,
      })),

      selectTool: (tool) => set({ selectedTool: tool }),

      setRuleBook: (content) => set({ ruleBook: content }),

      setMission: (mission) => set({ currentMission: mission }),

      addLog: (log) => set((state) => ({
        logs: [...state.logs, log],
      })),

      clearLogs: () => set({ logs: [] }),

      setRunning: (running) => set({ isRunning: running }),
    }),
    {
      name: 'homura-tool-store',
      partialize: (state) => ({
        tools: state.tools,
        ruleBook: state.ruleBook,
      }),
    }
  )
);
