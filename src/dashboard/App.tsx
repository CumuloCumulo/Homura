/**
 * =============================================================================
 * Homura Dashboard - Main Application
 * =============================================================================
 * 
 * Dashboard for tool management and rule book editing
 * Reference: docs/UI-DESIGN.md
 */

import React from 'react';
import { ToolLibrary } from './components/ToolLibrary';
import { RuleBookEditor } from './components/RuleBookEditor';
import { ExecutionLog } from './components/ExecutionLog';
import { useToolStore } from './stores/toolStore';
import { TEST_TOOLS } from '@sidepanel/testMission';

export default function App() {
  const { tools, addTool } = useToolStore();

  // Load test tools if library is empty
  React.useEffect(() => {
    if (tools.length === 0) {
      TEST_TOOLS.forEach(tool => addTool(tool));
    }
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
            <h1 className="text-lg font-semibold text-zinc-100">Homura Dashboard</h1>
            <p className="text-[11px] text-zinc-500">AI 浏览器自动化编排中心</p>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-600">{tools.length} 个工具</span>
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
      </div>

      {/* Footer */}
      <footer className="shrink-0 px-6 py-2 border-t border-white/5 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-zinc-600 font-mono">homura.v0.1.0</span>
          <div className="flex items-center gap-4">
            <span className="text-[9px] text-zinc-600">
              Powered by AI × Declarative Automation
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
