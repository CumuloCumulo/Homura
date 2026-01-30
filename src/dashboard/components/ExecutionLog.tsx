/**
 * =============================================================================
 * Homura Dashboard - Execution Log
 * =============================================================================
 * 
 * Bottom panel showing execution logs
 */

import React from 'react';
import { useToolStore } from '../stores/toolStore';
import type { LogEntry } from '@shared/types';

export function ExecutionLog() {
  const { logs, clearLogs, isRunning } = useToolStore();
  const [isExpanded, setIsExpanded] = React.useState(true);
  const logEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (logs.length > 0) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className={`
      flex flex-col bg-zinc-950 transition-all duration-300
      ${isExpanded ? 'h-full' : 'h-10'}
    `}>
      {/* Header */}
      <div 
        className="
          flex items-center justify-between px-4 py-2 
          border-b border-white/5 cursor-pointer
          hover:bg-zinc-900/50
        "
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg 
            className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          <span className="text-xs font-medium text-zinc-400">执行日志</span>
          {logs.length > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-violet-500/20 text-violet-400">
              {logs.length}
            </span>
          )}
          {isRunning && (
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-[10px] text-violet-400">运行中</span>
            </div>
          )}
        </div>

        {logs.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearLogs();
            }}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            清除
          </button>
        )}
      </div>

      {/* Log Content */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-2">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-zinc-600">
              运行任务后将在此显示日志
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <LogItem key={index} log={log} />
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LogItem({ log }: { log: LogEntry }) {
  const config = {
    info: {
      icon: '→',
      color: 'text-violet-400',
      bg: 'bg-violet-500/5',
    },
    warn: {
      icon: '⚠',
      color: 'text-amber-400',
      bg: 'bg-amber-500/5',
    },
    error: {
      icon: '✕',
      color: 'text-rose-400',
      bg: 'bg-rose-500/5',
    },
    debug: {
      icon: '•',
      color: 'text-zinc-500',
      bg: 'bg-zinc-500/5',
    },
  }[log.level];

  const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className={`flex items-start gap-2 px-2 py-1.5 rounded ${config.bg}`}>
      <span className={`shrink-0 text-xs ${config.color}`}>{config.icon}</span>
      <span className={`flex-1 text-xs font-mono ${config.color}`}>{log.message}</span>
      <span className="shrink-0 text-[9px] text-zinc-600 font-mono">{time}</span>
    </div>
  );
}
