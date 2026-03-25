/**
 * =============================================================================
 * Homura Dashboard - Main Application
 * =============================================================================
 *
 * Dashboard for toolkit and blueprint orchestration
 * Two tabs:
 *   1. 工具集编排 - Combine and modify atomic tools into toolkits
 *   2. 蓝图编排 - Write Rule Books + select toolkits for complete automation
 * Reference: docs/specs/dashboard-orchestration.md
 */

import React, { useEffect } from 'react';
import { ToolkitEditor } from './components/toolkit/ToolkitEditor';
import { BlueprintEditor } from './components/blueprint/BlueprintEditor';
import { RecordingImportDialog } from './components/RecordingImportDialog';
import { useToolStore } from './stores/toolStore';
import { useToolkitStore } from './stores/toolkitStore';
import { getUnimportedCount } from '@shared/storage/recordingStorage';
import type { AtomicTool } from '@homura/sdk/types';

// Storage keys for listening to recorded tools
const STORAGE_KEYS = {
  RECORDED_TOOLS: 'homura_recorded_tools',
  TOOL_UPDATE_PREFIX: 'homura_tool_update_',
} as const;

// Type for tool update data
interface ToolUpdateData {
  toolkitId: string;
  toolIndex: number;
  updatedTool: AtomicTool;
  timestamp: number;
}

interface RecordedToolsData {
  tools: AtomicTool[];
  timestamp: string;
  version: string;
}

type DashboardTab = 'toolkit' | 'blueprint';

export default function App() {
  const { replaceRecordedTools } = useToolStore();
  const { loadToolkits } = useToolkitStore();
  const [currentTab, setCurrentTab] = React.useState<DashboardTab>('toolkit');
  const [recordingImportOpen, setRecordingImportOpen] = React.useState(false);
  const [unimportedCount, setUnimportedCount] = React.useState(0);

  // Load toolkits on mount
  useEffect(() => {
    loadToolkits();
  }, [loadToolkits]);

  // Listen for custom events to open dialogs
  useEffect(() => {
    const handleOpenRecordingImport = () => setRecordingImportOpen(true);
    window.addEventListener(
      'open-recording-import-dialog',
      handleOpenRecordingImport,
    );
    return () => {
      window.removeEventListener(
        'open-recording-import-dialog',
        handleOpenRecordingImport,
      );
    };
  }, []);

  // Check for unimported recordings
  useEffect(() => {
    const checkUnimported = async () => {
      const count = await getUnimportedCount();
      setUnimportedCount(count);
    };
    checkUnimported();

    // Poll for updates (in case user saves from SidePanel)
    const interval = setInterval(checkUnimported, 2000);
    return () => clearInterval(interval);
  }, []);

  // Note: On mount, we check for existing recorded tools to handle the case
  // where Dashboard opens AFTER recording is complete.
  // We use replaceRecordedTools to ensure "最近录制" only shows the latest batch.

  // Check for existing recorded tools on mount
  useEffect(() => {
    const checkRecordedTools = async () => {
      const result = await chrome.storage.local.get(
        STORAGE_KEYS.RECORDED_TOOLS,
      );
      const data = result[STORAGE_KEYS.RECORDED_TOOLS] as
        | RecordedToolsData
        | undefined;

      if (data?.tools && data.tools.length > 0) {
        console.log('[Dashboard] Found existing tools in storage:', data.tools);
        replaceRecordedTools(data.tools);
        console.log(`[Dashboard] Loaded ${data.tools.length} existing tools`);
      }
    };
    checkRecordedTools();
  }, []); // Empty deps - only run on mount

  // Listen for recorded tools from SidePanel
  // Uses replaceRecordedTools to ensure "最近录制" only shows the latest batch
  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      console.log('[Dashboard] Storage changed:', { areaName, changes });

      if (areaName === 'local' && changes[STORAGE_KEYS.RECORDED_TOOLS]) {
        const newData = changes[STORAGE_KEYS.RECORDED_TOOLS].newValue as
          | RecordedToolsData
          | undefined;
        console.log('[Dashboard] Received tools data:', newData);

        if (newData?.tools) {
          // Replace all recorded tools with new ones
          // This ensures "最近录制" only shows the latest recording
          replaceRecordedTools(newData.tools);
          console.log(
            `[Dashboard] Replaced recorded tools with ${newData.tools.length} new tools`,
          );
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    console.log('[Dashboard] Storage listener registered');
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [replaceRecordedTools]);

  // Listen for tool updates from SidePanel
  // When a tool is edited in SidePanel test mode, it syncs back to Dashboard
  const updateToolByIndex = useToolkitStore((state) => state.updateToolByIndex);
  const updateTool = useToolStore((state) => state.updateTool);

  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName !== 'local') return;

      // Check for tool update keys
      for (const key of Object.keys(changes)) {
        if (key.startsWith(STORAGE_KEYS.TOOL_UPDATE_PREFIX)) {
          const updateData = changes[key].newValue as
            | ToolUpdateData
            | undefined;

          if (updateData?.updatedTool) {
            console.log('[Dashboard] Tool update received:', {
              toolkitId: updateData.toolkitId,
              toolIndex: updateData.toolIndex,
              toolName: updateData.updatedTool.name,
            });

            // 1. Update tool in toolkit (by index)
            updateToolByIndex(
              updateData.toolkitId,
              updateData.toolIndex,
              updateData.updatedTool,
            );

            // 2. Also update tool in tool library (by tool_id)
            updateTool(updateData.updatedTool.tool_id, updateData.updatedTool);

            // 3. Clean up the storage key to avoid duplicate processing
            chrome.storage.local.remove(key);

            console.log('[Dashboard] Tool synced successfully');
          }
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    console.log('[Dashboard] Tool update listener registered');
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [updateToolByIndex, updateTool]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-300 antialiased selection:bg-violet-500/30">
      {/* Header */}
      <header className="shrink-0 px-6 py-4 border-b border-white/5 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600/80 to-fuchsia-600/80 flex items-center justify-center shadow-neon">
            <span className="text-white font-bold text-sm">H</span>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-breathing" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">
              Homura Dashboard
            </h1>
            <p className="text-[11px] text-zinc-500">分层编排架构</p>
          </div>

          {/* Tab Toggle */}
          <div className="flex items-center gap-1 bg-zinc-900/80 rounded-lg border border-white/5 p-0.5">
            <TabButton
              tab="toolkit"
              currentTab={currentTab}
              onClick={() => setCurrentTab('toolkit')}
            >
              工具集编排
            </TabButton>
            <TabButton
              tab="blueprint"
              currentTab={currentTab}
              onClick={() => setCurrentTab('blueprint')}
            >
              蓝图编排
            </TabButton>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Status */}
          <div className="flex items-center gap-3">
            {/* Recording Import Notification */}
            {unimportedCount > 0 && (
              <button
                onClick={() => setRecordingImportOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>{unimportedCount} 个待导入录制</span>
              </button>
            )}

            {/* Layer indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900/80 border border-white/5 rounded text-[10px] text-zinc-500">
              <span>
                {currentTab === 'toolkit'
                  ? 'Layer 2: 工具集组合'
                  : 'Layer 3: 蓝图编排'}
              </span>
            </div>

            <div className="w-px h-4 bg-white/10" />

            <a
              href="#"
              className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
              }}
            >
              打开录制器
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'toolkit' ? <ToolkitEditor /> : <BlueprintEditor />}
      </div>

      {/* Footer */}
      <footer className="shrink-0 px-6 py-2 border-t border-white/5 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-[9px] text-zinc-600 font-mono">
              homura.v0.1.0
            </span>
            <span className="text-[9px] text-zinc-700">
              Layer 1: 原子工具 → Layer 2: 工具集 → Layer 3: 蓝图
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[9px] text-zinc-600">
              Powered by AI × Declarative Automation
            </span>
          </div>
        </div>
      </footer>

      {/* Dialogs */}
      <RecordingImportDialog
        isOpen={recordingImportOpen}
        onClose={() => setRecordingImportOpen(false)}
      />
    </div>
  );
}

interface TabButtonProps {
  tab: DashboardTab;
  currentTab: DashboardTab;
  onClick: () => void;
  children: string;
}

function TabButton({ tab, currentTab, onClick, children }: TabButtonProps) {
  const isActive = currentTab === tab;
  const color = tab === 'toolkit' ? 'violet' : 'fuchsia';

  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 text-xs font-medium rounded transition-colors
        ${
          isActive
            ? `bg-${color}-500/20 text-${color}-400`
            : 'text-zinc-500 hover:text-zinc-400'
        }
      `}
    >
      {children}
    </button>
  );
}
