/**
 * =============================================================================
 * Homura Dashboard - Tool Library
 * =============================================================================
 * 
 * Left panel showing all available tools
 */

import React from 'react';
import { useToolStore } from '../stores/toolStore';
import type { AtomicTool, PrimitiveAction } from '@shared/types';

// Action type icons
const ActionIcons: Record<PrimitiveAction, React.ReactNode> = {
  CLICK: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
    </svg>
  ),
  INPUT: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  EXTRACT_TEXT: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  WAIT_FOR: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  NAVIGATE: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
};

export function ToolLibrary() {
  const { tools, selectedTool, selectTool, removeTool } = useToolStore();
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <h2 className="text-sm font-semibold text-zinc-100 mb-3">工具库</h2>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="搜索工具..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              w-full h-8 pl-8 pr-3 text-xs
              bg-zinc-900/80 border border-white/5 rounded-md
              text-zinc-300 placeholder:text-zinc-600
              focus:border-violet-500/30 focus:outline-none
              transition-colors
            "
          />
          <svg 
            className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Tool List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredTools.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-1.5">
            {filteredTools.map(tool => (
              <ToolItem
                key={tool.tool_id}
                tool={tool}
                isSelected={selectedTool?.tool_id === tool.tool_id}
                onSelect={() => selectTool(tool)}
                onDelete={() => removeTool(tool.tool_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Tool Button */}
      <div className="p-3 border-t border-white/5">
        <button
          className="
            w-full h-9 flex items-center justify-center gap-2
            bg-zinc-900/80 border border-dashed border-white/10 rounded-lg
            text-xs text-zinc-500 hover:text-violet-400 hover:border-violet-500/30
            transition-colors
          "
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>添加工具</span>
        </button>
      </div>
    </div>
  );
}

interface ToolItemProps {
  tool: AtomicTool;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ToolItem({ tool, isSelected, onSelect, onDelete }: ToolItemProps) {
  const action = tool.selector_logic.target.action;

  return (
    <div
      onClick={onSelect}
      className={`
        group relative p-2.5 rounded-lg cursor-pointer transition-all duration-200
        ${isSelected
          ? 'bg-violet-500/10 border border-violet-500/30'
          : 'bg-zinc-900/50 border border-white/5 hover:border-white/10 hover:bg-zinc-800/50'
        }
      `}
    >
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div className={`
          shrink-0 w-8 h-8 rounded-md flex items-center justify-center
          ${isSelected ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-400'}
        `}>
          {ActionIcons[action]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`
            text-xs font-medium truncate
            ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}
          `}>
            {tool.name}
          </h3>
          {tool.description && (
            <p className="text-[10px] text-zinc-500 truncate mt-0.5">
              {tool.description}
            </p>
          )}
          
          {/* Parameters preview */}
          {Object.keys(tool.parameters).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {Object.keys(tool.parameters).slice(0, 2).map(param => (
                <span
                  key={param}
                  className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-zinc-800 text-zinc-500"
                >
                  {`{{${param}}}`}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="
            absolute top-2 right-2 opacity-0 group-hover:opacity-100
            w-5 h-5 flex items-center justify-center rounded
            text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10
            transition-all
          "
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <p className="text-xs text-zinc-500">还没有工具</p>
      <p className="text-[10px] text-zinc-600 mt-1">
        使用 SidePanel 录制创建工具
      </p>
    </div>
  );
}
