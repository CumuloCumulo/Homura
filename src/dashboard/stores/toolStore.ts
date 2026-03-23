/**
 * =============================================================================
 * Homura Dashboard - Tool Store
 * =============================================================================
 *
 * State management for tool library
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AtomicTool, Blueprint, BlueprintMeta } from '@homura/sdk/types';
import type { LogEntry, Mission } from '@shared/types';
import { createBlueprint as createBlueprintUtil } from '../utils/blueprintIO';
import { calculateSkillsHash } from '@homura/sdk/utils';

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

  // Blueprint actions
  exportAsBlueprint: (
    meta: Omit<BlueprintMeta, 'skillsHash' | 'createdAt' | 'updatedAt'>,
  ) => Blueprint;
  getBlueprintFromState: () => Blueprint;
  importBlueprint: (blueprint: Blueprint, replaceExisting?: boolean) => void;
  loadFromBlueprint: (blueprint: Blueprint) => void;
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

      addTool: (tool) =>
        set((state) => ({
          tools: [...state.tools, tool],
        })),

      updateTool: (toolId, updates) =>
        set((state) => ({
          tools: state.tools.map((t) =>
            t.tool_id === toolId ? { ...t, ...updates } : t,
          ),
        })),

      removeTool: (toolId) =>
        set((state) => ({
          tools: state.tools.filter((t) => t.tool_id !== toolId),
          selectedTool:
            state.selectedTool?.tool_id === toolId ? null : state.selectedTool,
        })),

      selectTool: (tool) => set({ selectedTool: tool }),

      setRuleBook: (content) => set({ ruleBook: content }),

      setMission: (mission) => set({ currentMission: mission }),

      addLog: (log) =>
        set((state) => ({
          logs: [...state.logs, log],
        })),

      clearLogs: () => set({ logs: [] }),

      setRunning: (running) => set({ isRunning: running }),

      // Blueprint actions
      exportAsBlueprint: (meta) => {
        // Get current state using store reference
        const state = useToolStore.getState();
        const blueprint = createBlueprintUtil(
          meta,
          state.tools,
          state.ruleBook,
          undefined, // agentConfig
        );

        // Recalculate skills hash
        blueprint.meta.skillsHash = calculateSkillsHash(state.tools);

        return blueprint;
      },

      getBlueprintFromState: () => {
        // Get current state using store reference
        const state = useToolStore.getState();
        const blueprint: Blueprint = {
          meta: {
            name: 'untitled-blueprint',
            version: '1.0.0',
            description: 'Exported from Homura',
            targetUrl: '*',
            blueprintVersion: '1.0.0',
            skillsHash: calculateSkillsHash(state.tools),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          skills: state.tools,
          rules: state.ruleBook,
        };

        return blueprint;
      },

      importBlueprint: (blueprint, replaceExisting = false) => {
        set((state) => {
          const newTools = replaceExisting
            ? blueprint.skills
            : [
                ...state.tools.filter(
                  (t) =>
                    !blueprint.skills.some((bt) => bt.tool_id === t.tool_id),
                ),
                ...blueprint.skills,
              ];

          return {
            tools: newTools,
            ruleBook: blueprint.rules || state.ruleBook,
          };
        });
      },

      loadFromBlueprint: (blueprint) => {
        set(() => ({
          tools: blueprint.skills,
          ruleBook: blueprint.rules || DEFAULT_RULE_BOOK,
        }));
      },
    }),
    {
      name: 'homura-tool-store',
      partialize: (state) => ({
        tools: state.tools,
        ruleBook: state.ruleBook,
      }),
    },
  ),
);
