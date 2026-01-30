/**
 * =============================================================================
 * Homura SidePanel - Main Application
 * =============================================================================
 * 
 * Recording assistant for element inspection and selector building
 * Reference: docs/project-vision.md, docs/UI-DESIGN.md
 */

import React from 'react';
import { Header } from './components/Header';
import { LogViewer } from './components/LogViewer';
import { InspectMode } from './components/InspectMode';
import { SelectorBuilder } from './components/SelectorBuilder';
import { RecordingPanel } from './components/RecordingPanel';
import { useRecordingStore } from './stores/recordingStore';

// Tab icons
const InspectIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
  </svg>
);

const RecordIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const BuildIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
  </svg>
);

const LogsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
  </svg>
);

export default function App() {
  const { mode, setMode, logs, clearLogs, isInspecting, isRecording } = useRecordingStore();
  const [showLogs, setShowLogs] = React.useState(false);

  // Listen for messages from content script
  React.useEffect(() => {
    const handleMessage = (message: { type: string; payload?: unknown }) => {
      if (message.type === 'ELEMENT_SELECTED') {
        // Handle element selection from content script
        useRecordingStore.getState().setAnalysis(message.payload as never);
      } else if (message.type === 'ACTION_RECORDED') {
        // Handle recorded action from content script
        useRecordingStore.getState().addRecordedAction(message.payload as never);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-300 antialiased selection:bg-violet-500/30">
      <Header />

      {/* Mode Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5">
        <TabButton
          active={mode === 'inspect'}
          onClick={() => setMode('inspect')}
          icon={<InspectIcon />}
          label="检查"
          indicator={isInspecting ? 'active' : undefined}
        />
        <TabButton
          active={mode === 'record'}
          onClick={() => setMode('record')}
          icon={<RecordIcon />}
          label="录制"
          indicator={isRecording ? 'recording' : undefined}
        />
        <TabButton
          active={mode === 'build'}
          onClick={() => setMode('build')}
          icon={<BuildIcon />}
          label="构建"
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Logs Toggle */}
        <button
          onClick={() => setShowLogs(!showLogs)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium
            transition-all duration-200
            ${showLogs
              ? 'bg-violet-500/15 text-violet-400'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }
          `}
        >
          <LogsIcon />
          <span>日志</span>
          {logs.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-violet-500/20 text-violet-400">
              {logs.length}
            </span>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {showLogs ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <span className="text-xs text-zinc-400">操作日志</span>
              {logs.length > 0 && (
                <button
                  onClick={clearLogs}
                  className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  清除
                </button>
              )}
            </div>
            <LogViewer logs={logs} />
          </div>
        ) : (
          <>
            {mode === 'inspect' && <InspectMode />}
            {mode === 'record' && <RecordingPanel />}
            {mode === 'build' && <SelectorBuilder />}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="px-3 py-1.5 border-t border-white/5 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-zinc-600 font-mono">homura.v0.1.0</span>
          <div className="flex items-center gap-1.5">
            <StatusIndicator isInspecting={isInspecting} isRecording={isRecording} />
          </div>
        </div>
      </footer>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  indicator?: 'active' | 'recording';
}

function TabButton({ active, onClick, icon, label, indicator }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium
        transition-all duration-200
        ${active
          ? 'bg-violet-500/15 text-violet-400'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
        }
      `}
    >
      {icon}
      <span>{label}</span>
      {indicator && (
        <div className={`
          absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full
          ${indicator === 'recording' ? 'bg-rose-500' : 'bg-emerald-500'}
          animate-pulse
        `} />
      )}
    </button>
  );
}

function StatusIndicator({ isInspecting, isRecording }: { isInspecting: boolean; isRecording: boolean }) {
  if (isRecording) {
    return (
      <>
        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        <span className="text-[9px] text-rose-400">录制中</span>
      </>
    );
  }
  if (isInspecting) {
    return (
      <>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[9px] text-emerald-400">检查中</span>
      </>
    );
  }
  return (
    <>
      <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
      <span className="text-[9px] text-zinc-600">空闲</span>
    </>
  );
}
