/**
 * =============================================================================
 * Homura Dashboard - Toolkit Library
 * =============================================================================
 *
 * Left panel showing all available toolkits
 * - Collapsible: Supports collapsed (icons only) and expanded modes
 * - Mindful Interaction: Progressive disclosure
 */

import React from 'react';
import { useToolkitStore } from '../../stores/toolkitStore';
import type { Toolkit } from '@homura/sdk/types';

interface ToolkitLibraryProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ToolkitLibrary({
  isCollapsed = false,
  onToggleCollapse,
}: ToolkitLibraryProps) {
  const {
    toolkits,
    selectedToolkit,
    searchQuery,
    selectedTags,
    selectToolkit,
    setSearchQuery,
    setSelectedTags,
    removeToolkit,
    setExportDialogOpen,
    setImportDialogOpen,
    getFilteredToolkits,
  } = useToolkitStore();

  const filteredToolkits = getFilteredToolkits();
  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    toolkits.forEach((tk) => tk.tags?.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [toolkits]);

  const handleCreateNew = () => {
    const { addToolkit } = useToolkitStore.getState();
    const newToolkit: Toolkit = {
      id: `tk_${Date.now()}`,
      name: '新工具集',
      tools: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    addToolkit(newToolkit);
    selectToolkit(newToolkit);
  };

  // Collapsed mode - Icon only sidebar
  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full py-3">
        {/* Collapse Toggle */}
        <div className="flex justify-center mb-3">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
            title="展开工具集库"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Toolkit Icons */}
        <div className="flex-1 overflow-y-auto space-y-1 px-1">
          {filteredToolkits.map((toolkit) => (
            <button
              key={toolkit.id}
              onClick={() => selectToolkit(toolkit)}
              className={`w-full p-2 rounded-lg transition-all duration-200 ${
                selectedToolkit?.id === toolkit.id
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
              title={toolkit.name}
            >
              <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {/* Tool count indicator */}
              {toolkit.tools.length > 0 && (
                <span className="block text-[8px] text-center mt-0.5 opacity-60">
                  {toolkit.tools.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Add Button */}
        <div className="px-1 pt-2 border-t border-white/5">
          <button
            onClick={handleCreateNew}
            className="w-full p-2 rounded-lg text-zinc-500 hover:text-violet-400 hover:bg-zinc-800/50 transition-colors"
            title="新建工具集"
          >
            <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Expanded mode - Full sidebar
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-100">工具集库</h2>
          <div className="flex items-center gap-2">
            {/* Collapse Toggle */}
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-md bg-zinc-900/80 border border-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="收起"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            {/* Import Button */}
            <button
              onClick={() => setImportDialogOpen(true)}
              className="p-1.5 rounded-md bg-zinc-900/80 border border-white/5 text-zinc-500 hover:text-violet-400 hover:border-violet-500/30 transition-colors"
              title="导入工具集"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
            {/* Export Button */}
            <button
              onClick={() => selectedToolkit && setExportDialogOpen(true)}
              className="p-1.5 rounded-md bg-zinc-900/80 border border-white/5 text-zinc-500 hover:text-violet-400 hover:border-violet-500/30 transition-colors disabled:opacity-50"
              title="导出工具集"
              disabled={!selectedToolkit}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            {/* Count Badge */}
            <span className="px-2 py-0.5 text-[9px] font-medium bg-violet-500/10 text-violet-400 rounded border border-violet-500/20">
              {toolkits.length}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <input
            type="text"
            placeholder="搜索工具集..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-zinc-900/80 border border-white/5 rounded-md text-zinc-300 placeholder:text-zinc-600 focus:border-violet-500/30 focus:outline-none transition-colors"
          />
          <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  if (selectedTags.includes(tag)) {
                    setSelectedTags(selectedTags.filter((t) => t !== tag));
                  } else {
                    setSelectedTags([...selectedTags, tag]);
                  }
                }}
                className={`px-2 py-0.5 text-[9px] rounded transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : 'bg-zinc-800 text-zinc-500 border border-white/5 hover:border-white/10'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Toolkit List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredToolkits.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-1.5">
            {filteredToolkits.map((toolkit) => (
              <ToolkitCard
                key={toolkit.id}
                toolkit={toolkit}
                isSelected={selectedToolkit?.id === toolkit.id}
                onSelect={() => selectToolkit(toolkit)}
                onDelete={() => removeToolkit(toolkit.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Toolkit Button */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={handleCreateNew}
          className="w-full h-9 flex items-center justify-center gap-2 bg-zinc-900/80 border border-dashed border-white/10 rounded-lg text-xs text-zinc-500 hover:text-violet-400 hover:border-violet-500/30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>新建工具集</span>
        </button>
      </div>
    </div>
  );
}

interface ToolkitCardProps {
  toolkit: Toolkit;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ToolkitCard({
  toolkit,
  isSelected,
  onSelect,
  onDelete,
}: ToolkitCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-violet-500/10 border border-violet-500/30'
          : 'bg-zinc-900/50 border border-white/5 hover:border-white/10 hover:bg-zinc-800/50'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div
          className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${
            isSelected
              ? 'bg-violet-500/20 text-violet-400'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={`text-xs font-medium truncate ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}
          >
            {toolkit.name}
          </h3>
          {toolkit.description && (
            <p className="text-[10px] text-zinc-500 truncate mt-0.5">
              {toolkit.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] text-zinc-600">
              {toolkit.tools.length} 个工具
            </span>
            {toolkit.version && (
              <>
                <span className="text-zinc-700">•</span>
                <span className="text-[9px] text-zinc-600 font-mono">
                  {toolkit.version}
                </span>
              </>
            )}
          </div>
          {/* Tags */}
          {toolkit.tags && toolkit.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {toolkit.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-[9px] rounded bg-zinc-800 text-zinc-500"
                >
                  {tag}
                </span>
              ))}
              {toolkit.tags.length > 2 && (
                <span className="text-[9px] text-zinc-600">
                  +{toolkit.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <p className="text-xs text-zinc-500">还没有工具集</p>
      <p className="text-[10px] text-zinc-600 mt-1">创建工具集来组合原子工具</p>
    </div>
  );
}
