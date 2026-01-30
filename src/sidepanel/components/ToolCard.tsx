import React from 'react';
import type { AtomicTool, PrimitiveAction } from '@shared/types';

interface ToolCardProps {
  tool: AtomicTool;
  onRun: (tool: AtomicTool, params: Record<string, string>) => void;
  disabled?: boolean;
}

// Icons as simple SVG components
const Icons: Record<PrimitiveAction, React.ReactNode> = {
  CLICK: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
    </svg>
  ),
  INPUT: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  EXTRACT_TEXT: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  WAIT_FOR: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  NAVIGATE: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
};

const PlayIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg 
    className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

export function ToolCard({ tool, onRun, disabled }: ToolCardProps) {
  const [params, setParams] = React.useState<Record<string, string>>({});
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  const action = tool.selector_logic.target.action;
  const paramEntries = Object.entries(tool.parameters);
  const hasParams = paramEntries.length > 0;

  const handleParamChange = (key: string, value: string) => {
    setParams((prev: Record<string, string>) => ({ ...prev, [key]: value }));
  };

  const handleRun = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRun(tool, params);
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      className={`
        group rounded-lg overflow-hidden transition-all duration-300 ease-out
        ${isExpanded 
          ? 'bg-zinc-800/60 border border-violet-500/20 shadow-neon' 
          : 'bg-zinc-900/50 border border-white/5 hover:border-white/10 hover:bg-zinc-800/40'
        }
      `}
    >
      {/* Collapsed Header - Always visible */}
      <div 
        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none"
        onClick={handleToggle}
      >
        {/* Icon */}
        <div className={`
          shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors
          ${isExpanded 
            ? 'bg-violet-500/20 text-violet-400' 
            : 'bg-zinc-800/80 text-zinc-400 group-hover:text-zinc-300'
          }
        `}>
          {Icons[action]}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <span className={`
            text-[13px] font-medium truncate block transition-colors
            ${isExpanded ? 'text-zinc-100' : 'text-zinc-300 group-hover:text-zinc-100'}
          `}>
            {tool.name}
          </span>
        </div>

        {/* Action Badge - Ultra compact */}
        <ActionBadge action={action} />

        {/* Expand indicator */}
        <div className="shrink-0 text-zinc-500">
          <ChevronIcon expanded={isExpanded} />
        </div>

        {/* Quick Run Button */}
        <button
          onClick={handleRun}
          disabled={disabled}
          className={`
            shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-all
            ${disabled 
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
              : 'bg-violet-600/80 text-white hover:bg-violet-500 hover:shadow-neon active:scale-95'
            }
          `}
          title="Run"
        >
          {disabled ? (
            <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <PlayIcon />
          )}
        </button>
      </div>

      {/* Expanded Content */}
      <div className={`collapse-content ${isExpanded ? 'expanded' : ''}`}>
        <div>
          <div className="px-3 pb-3 pt-1 space-y-3 animate-fade-in">
            {/* Description */}
            {tool.description && (
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                {tool.description}
              </p>
            )}

            {/* Selector Logic - Compact code view */}
            <div className="p-2 rounded-md bg-black/40 inner-shadow space-y-1.5 font-mono text-[10px]">
              {tool.selector_logic.scope && (
                <div className="flex items-start gap-2">
                  <span className="text-blue-400/70 shrink-0 w-12">scope</span>
                  <code className="text-zinc-400 break-all">{tool.selector_logic.scope.selector}</code>
                </div>
              )}
              {tool.selector_logic.anchor && (
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400/70 shrink-0 w-12">anchor</span>
                  <code className="text-zinc-400 break-all">{tool.selector_logic.anchor.value}</code>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="text-violet-400/70 shrink-0 w-12">target</span>
                <code className="text-zinc-400 break-all">{tool.selector_logic.target.selector}</code>
              </div>
            </div>

            {/* Parameters - Underline input style */}
            {hasParams && (
              <div className="space-y-2.5">
                {paramEntries.map(([key, param]) => (
                  <div key={key} className="group/input">
                    <label className="flex items-center gap-1 text-[10px] text-zinc-500 mb-1">
                      <span>{key}</span>
                      {param.required && <span className="text-rose-400/80">*</span>}
                    </label>
                    <input
                      type="text"
                      value={params[key] || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleParamChange(key, e.target.value)}
                      placeholder={param.description}
                      className="
                        w-full h-8 px-0 text-[12px] font-mono
                        bg-transparent border-b border-zinc-800 
                        text-zinc-200 placeholder:text-zinc-700
                        focus:border-violet-500/50 focus:outline-none
                        transition-colors
                      "
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Run Button - Full width when expanded */}
            <button
              onClick={handleRun}
              disabled={disabled}
              className={`
                w-full h-8 rounded-md text-[11px] font-medium tracking-wide uppercase
                transition-all duration-200
                ${disabled 
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 text-white hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-neon active:scale-[0.98]'
                }
              `}
            >
              {disabled ? 'Running...' : 'Execute'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: PrimitiveAction }) {
  const colors: Record<PrimitiveAction, string> = {
    CLICK: 'text-amber-400/80',
    INPUT: 'text-violet-400/80',
    EXTRACT_TEXT: 'text-cyan-400/80',
    WAIT_FOR: 'text-yellow-400/80',
    NAVIGATE: 'text-emerald-400/80',
  };

  return (
    <span className={`
      shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium tracking-wider
      bg-white/5 ${colors[action]}
    `}>
      {action.replace('_', '')}
    </span>
  );
}
