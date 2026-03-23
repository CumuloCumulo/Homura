/**
 * =============================================================================
 * Homura Dashboard - Main Application
 * =============================================================================
 *
 * Dashboard for tool management and rule book editing
 * Reference: docs/UI-DESIGN.md
 */

import React, { useState } from 'react';
import { ToolLibrary } from './components/ToolLibrary';
import { RuleBookEditor } from './components/RuleBookEditor';
import { ExecutionLog } from './components/ExecutionLog';
import { BlueprintExportDialog } from './components/BlueprintExportDialog';
import { BlueprintImportDialog } from './components/BlueprintImportDialog';
import { BlueprintLibrary } from './components/BlueprintLibrary';
import { BlueprintDetailView } from './components/BlueprintDetailView';
import { useToolStore } from './stores/toolStore';
import { useBlueprintStore } from './stores/blueprintStore';
import { TEST_TOOLS } from '@sidepanel/testMission';

type DashboardView = 'tools' | 'blueprints';

export default function App() {
  const { tools, addTool } = useToolStore();
  const { selectedBlueprint } = useBlueprintStore();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [currentView, setCurrentView] = useState<DashboardView>('tools');

  // Load test tools if library is empty
  React.useEffect(() => {
    if (tools.length === 0) {
      TEST_TOOLS.forEach((tool) => addTool(tool));
    }
  }, []);

  // Listen for custom events to open dialogs
  React.useEffect(() => {
    const handleOpenExport = () => setExportDialogOpen(true);
    const handleOpenImport = () => setImportDialogOpen(true);

    window.addEventListener('open-export-dialog', handleOpenExport);
    window.addEventListener('open-import-dialog', handleOpenImport);

    return () => {
      window.removeEventListener('open-export-dialog', handleOpenExport);
      window.removeEventListener('open-import-dialog', handleOpenImport);
    };
  }, []);

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
            <p className="text-[11px] text-zinc-500">AI 浏览器自动化编排中心</p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-zinc-900/80 rounded-lg border border-white/5 p-0.5">
            <button
              onClick={() => setCurrentView('tools')}
              className={`
                px-3 py-1.5 text-xs font-medium rounded transition-colors
                ${
                  currentView === 'tools'
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-zinc-500 hover:text-zinc-400'
                }
              `}
            >
              工具库
            </button>
            <button
              onClick={() => setCurrentView('blueprints')}
              className={`
                px-3 py-1.5 text-xs font-medium rounded transition-colors
                ${
                  currentView === 'blueprints'
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-zinc-500 hover:text-zinc-400'
                }
              `}
            >
              Blueprint 库
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-600">
              {currentView === 'tools'
                ? `${tools.length} 个工具`
                : `${selectedBlueprint ? '已选择' : '未选择'}`}
            </span>
            <div className="w-px h-4 bg-white/10" />
            <a
              href="#"
              className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                // Open sidepanel
                chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
              }}
            >
              打开录制器
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {currentView === 'tools' ? (
          <>
            {/* Left: Tool Library */}
            <aside className="w-72 shrink-0 border-r border-white/5 overflow-hidden">
              <ToolLibrary />
            </aside>

            {/* Center: Rule Book + Logs */}
            <main className="flex-1 flex flex-col overflow-hidden">
              {/* Rule Book Editor */}
              <div className="flex-1 overflow-hidden">
                <RuleBookEditor />
              </div>

              {/* Execution Log */}
              <div className="shrink-0 h-48 border-t border-white/5">
                <ExecutionLog />
              </div>
            </main>
          </>
        ) : (
          <>
            {/* Left: Blueprint Library */}
            <aside className="w-80 shrink-0 border-r border-white/5 overflow-hidden">
              <BlueprintLibrary />
            </aside>

            {/* Right: Blueprint Detail */}
            <main className="flex-1 overflow-hidden">
              <BlueprintDetailView />
            </main>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="shrink-0 px-6 py-2 border-t border-white/5 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-zinc-600 font-mono">
            homura.v0.1.0
          </span>
          <div className="flex items-center gap-4">
            <span className="text-[9px] text-zinc-600">
              Powered by AI × Declarative Automation
            </span>
          </div>
        </div>
      </footer>

      {/* Dialogs */}
      <BlueprintExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      />
      <BlueprintImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
      />
    </div>
  );
}
