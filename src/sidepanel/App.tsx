import React from 'react';
import { Header } from './components/Header';
import { LogViewer } from './components/LogViewer';
import { ToolCard } from './components/ToolCard';
import { useMissionStore } from './stores/missionStore';
import { TEST_TOOLS, TOOL_CLICK_APPROVE } from './testMission';
import type { AtomicTool, LogEntry, ExecuteToolResult } from '@shared/types';

// Tab icons
const ToolsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const LogsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export default function App() {
  const { logs, isRunning, addLog, setRunning, clearLogs } = useMissionStore();
  const [activeTab, setActiveTab] = React.useState<'tools' | 'logs'>('tools');

  // Listen for progress updates from background
  React.useEffect(() => {
    const handleMessage = (message: { type: string; payload: { context: { logs: LogEntry[] }; result: ExecuteToolResult } }) => {
      if (message.type === 'MISSION_PROGRESS') {
        const { result } = message.payload;
        addLog({
          timestamp: Date.now(),
          level: result.success ? 'info' : 'error',
          message: result.success 
            ? `✓ Action completed (${result.metadata?.duration}ms)`
            : `✗ Action failed: ${result.error?.message}`,
          data: result,
        });
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [addLog]);

  const handleRunTool = async (tool: AtomicTool, params: Record<string, string>) => {
    setRunning(true);
    clearLogs();
    setActiveTab('logs');

    addLog({
      timestamp: Date.now(),
      level: 'info',
      message: `Initiating: ${tool.name}`,
      toolId: tool.tool_id,
    });

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        throw new Error('No active tab found');
      }

      const result = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXECUTE_TOOL',
        payload: { tool, params, debug: true },
      }) as ExecuteToolResult;

      addLog({
        timestamp: Date.now(),
        level: result.success ? 'info' : 'error',
        message: result.success
          ? `Completed in ${result.metadata?.duration}ms`
          : `Failed: ${result.error?.message}`,
        data: result,
      });

      if (result.data) {
        addLog({
          timestamp: Date.now(),
          level: 'debug',
          message: `Data: ${JSON.stringify(result.data)}`,
        });
      }
    } catch (error) {
      addLog({
        timestamp: Date.now(),
        level: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setRunning(false);
    }
  };

  const handleRunTestMission = async () => {
    await handleRunTool(TOOL_CLICK_APPROVE, { student_name: 'Student Name' });
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-300 antialiased selection:bg-violet-500/30">
      <Header />

      {/* Tabs - Minimal segmented control */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5">
        <button
          onClick={() => setActiveTab('tools')}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium
            transition-all duration-200
            ${activeTab === 'tools'
              ? 'bg-violet-500/15 text-violet-400'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }
          `}
        >
          <ToolsIcon />
          <span>Tools</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium
            transition-all duration-200
            ${activeTab === 'logs'
              ? 'bg-violet-500/15 text-violet-400'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }
          `}
        >
          <LogsIcon />
          <span>Logs</span>
          {logs.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-violet-500/20 text-violet-400">
              {logs.length}
            </span>
          )}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Clear logs button */}
        {logs.length > 0 && (
          <button
            onClick={clearLogs}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'tools' ? (
          <div className="flex-1 overflow-y-auto">
            {/* Quick Action - Ghost button style */}
            <div className="px-3 py-3 border-b border-white/5">
              <button
                onClick={handleRunTestMission}
                disabled={isRunning}
                className={`
                  group w-full flex items-center justify-center gap-2 
                  px-4 py-2.5 rounded-lg text-[12px] font-medium
                  transition-all duration-300 ease-out
                  ${isRunning
                    ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                    : 'bg-zinc-900/50 border border-violet-500/20 text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/40 hover:shadow-neon'
                  }
                `}
              >
                {isRunning ? (
                  <>
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <PlayIcon />
                    <span>Run Test Mission</span>
                  </>
                )}
              </button>
              <p className="text-center text-[10px] text-zinc-600 mt-2">
                Click approve button for "Student Name" row
              </p>
            </div>

            {/* Tool Cards */}
            <div className="p-3 space-y-2">
              {TEST_TOOLS.map((tool) => (
                <ToolCard
                  key={tool.tool_id}
                  tool={tool}
                  onRun={handleRunTool}
                  disabled={isRunning}
                />
              ))}
            </div>
          </div>
        ) : (
          <LogViewer logs={logs} />
        )}
      </div>

      {/* Footer - Ultra minimal */}
      <footer className="px-3 py-1.5 border-t border-white/5 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-zinc-600 font-mono">homura.v0.1.0</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-violet-500 animate-pulse' : 'bg-zinc-700'}`} />
            <span className="text-[9px] text-zinc-600">{isRunning ? 'running' : 'idle'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
