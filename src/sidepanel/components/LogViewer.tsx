import React from 'react';
import type { LogEntry } from '@shared/types';

interface LogViewerProps {
  logs: LogEntry[];
}

export function LogViewer({ logs }: LogViewerProps) {
  const logEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
        {/* Empty state illustration */}
        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center">
          <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <div>
          <p className="text-xs text-zinc-500">No execution logs</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">Run a tool to see activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {logs.map((log, index) => (
        <LogEntryItem key={index} log={log} index={index} />
      ))}
      <div ref={logEndRef} />
    </div>
  );
}

function LogEntryItem({ log, index }: { log: LogEntry; index: number }) {
  const levelConfig = {
    info: {
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      ),
      color: 'text-violet-400',
      bg: 'bg-violet-500/5',
      border: 'border-violet-500/10',
    },
    warn: {
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: 'text-amber-400',
      bg: 'bg-amber-500/5',
      border: 'border-amber-500/10',
    },
    error: {
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      color: 'text-rose-400',
      bg: 'bg-rose-500/5',
      border: 'border-rose-500/10',
    },
    debug: {
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      ),
      color: 'text-zinc-500',
      bg: 'bg-zinc-500/5',
      border: 'border-zinc-500/10',
    },
  };

  const config = levelConfig[log.level];
  const time = new Date(log.timestamp).toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });

  return (
    <div 
      className={`
        animate-slide-down flex items-start gap-2 px-2.5 py-2 rounded-md
        ${config.bg} border ${config.border}
      `}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Icon */}
      <div className={`shrink-0 mt-0.5 ${config.color}`}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className={`text-[11px] font-mono leading-relaxed break-all ${config.color}`}>
          {log.message}
        </p>
        <span className="text-[9px] text-zinc-600 font-mono">{time}</span>
      </div>
    </div>
  );
}
