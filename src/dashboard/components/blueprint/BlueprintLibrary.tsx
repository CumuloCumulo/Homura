/**
 * =============================================================================
 * Homura Dashboard - Blueprint Library
 * =============================================================================
 *
 * Left panel showing all available blueprints for orchestration
 */

import React from 'react';
import { useBlueprintStore } from '../../stores/blueprintStore';
import type { Blueprint } from '@homura/sdk/types';

export function BlueprintLibrary() {
  const {
    blueprints,
    selectedBlueprint,
    searchQuery,
    selectedTags,
    selectBlueprint,
    setSearchQuery,
    setSelectedTags,
    removeBlueprint,
    getFilteredBlueprints,
  } = useBlueprintStore();

  const filteredBlueprints = getFilteredBlueprints();
  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    blueprints.forEach((bp) => bp.tags?.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [blueprints]);

  const handleCreateNew = () => {
    const { addBlueprint } = useBlueprintStore.getState();
    const newBlueprint: Blueprint = {
      meta: {
        id: `bp_${Date.now()}`,
        name: '新蓝图',
        version: '1.0.0',
        targetUrl: '',
        blueprintVersion: '1.0.0',
        skillsHash: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      skills: [],
      rules: '# Rule Book\n\n编写自动化规则...',
    };
    addBlueprint(newBlueprint);
    selectBlueprint(newBlueprint);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-100">蓝图库</h2>
          <div className="flex items-center gap-2">
            {/* Import Button */}
            <button
              onClick={() => {
                /* TODO: Import */
              }}
              className="p-1.5 rounded-md bg-zinc-900/80 border border-white/5 text-zinc-500 hover:text-violet-400 hover:border-violet-500/30 transition-colors"
              title="导入蓝图"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            </button>
            {/* Export Button */}
            <button
              onClick={() =>
                selectedBlueprint &&
                {
                  /* TODO: Export */
                }
              }
              className="p-1.5 rounded-md bg-zinc-900/80 border border-white/5 text-zinc-500 hover:text-violet-400 hover:border-violet-500/30 transition-colors disabled:opacity-50"
              title="导出蓝图"
              disabled={!selectedBlueprint}
            >
              <svg
                className="w-3.5 h-3.5"
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
            </button>
            {/* Count Badge */}
            <span className="px-2 py-0.5 text-[9px] font-medium bg-fuchsia-500/10 text-fuchsia-400 rounded border border-fuchsia-500/20">
              {blueprints.length}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <input
            type="text"
            placeholder="搜索蓝图..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-zinc-900/80 border border-white/5 rounded-md text-zinc-300 placeholder:text-zinc-600 focus:border-fuchsia-500/30 focus:outline-none transition-colors"
          />
          <svg
            className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
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
                    ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30'
                    : 'bg-zinc-800 text-zinc-500 border border-white/5 hover:border-white/10'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Blueprint List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredBlueprints.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-1.5">
            {filteredBlueprints.map((blueprint) => (
              <BlueprintCard
                key={blueprint.meta.id || blueprint.meta.name}
                blueprint={blueprint}
                isSelected={selectedBlueprint?.meta.id === blueprint.meta.id}
                onSelect={() => selectBlueprint(blueprint)}
                onDelete={() =>
                  blueprint.meta.id && removeBlueprint(blueprint.meta.id)
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Blueprint Button */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={handleCreateNew}
          className="w-full h-9 flex items-center justify-center gap-2 bg-zinc-900/80 border border-dashed border-white/10 rounded-lg text-xs text-zinc-500 hover:text-fuchsia-400 hover:border-fuchsia-500/30 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>新建蓝图</span>
        </button>
      </div>
    </div>
  );
}

interface BlueprintCardProps {
  blueprint: Blueprint;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function BlueprintCard({
  blueprint,
  isSelected,
  onSelect,
  onDelete,
}: BlueprintCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-fuchsia-500/10 border border-fuchsia-500/30'
          : 'bg-zinc-900/50 border border-white/5 hover:border-white/10 hover:bg-zinc-800/50'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div
          className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${
            isSelected
              ? 'bg-fuchsia-500/20 text-fuchsia-400'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={`text-xs font-medium truncate ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}
          >
            {blueprint.meta.name}
          </h3>
          {blueprint.meta.description && (
            <p className="text-[10px] text-zinc-500 truncate mt-0.5">
              {blueprint.meta.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] text-zinc-600">
              {blueprint.skills.length} 个工具
            </span>
            {blueprint.meta.version && (
              <>
                <span className="text-zinc-700">•</span>
                <span className="text-[9px] text-zinc-600 font-mono">
                  {blueprint.meta.version}
                </span>
              </>
            )}
          </div>
          {/* Has Rule Book indicator */}
          {blueprint.rules && blueprint.rules.trim().length > 20 && (
            <div className="flex items-center gap-1 mt-1.5">
              <svg
                className="w-3 h-3 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-[9px] text-emerald-400">Rule Book</span>
            </div>
          )}
          {/* Tags */}
          {blueprint.tags && blueprint.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {blueprint.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-[9px] rounded bg-zinc-800 text-zinc-500"
                >
                  {tag}
                </span>
              ))}
              {blueprint.tags.length > 2 && (
                <span className="text-[9px] text-zinc-600">
                  +{blueprint.tags.length - 2}
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
              d="M6 18L18 6M6 6l12 12"
            />
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
        <svg
          className="w-6 h-6 text-zinc-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <p className="text-xs text-zinc-500">还没有蓝图</p>
      <p className="text-[10px] text-zinc-600 mt-1">创建蓝图来编写自动化方案</p>
    </div>
  );
}
