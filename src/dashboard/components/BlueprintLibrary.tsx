/**
 * =============================================================================
 * Blueprint Library - Blueprint 库管理页面
 * =============================================================================
 *
 * 展示所有已导入的 Blueprint，支持搜索、筛选和查看详情
 */

import { useState, useMemo } from 'react';
import type { Blueprint } from '@homura/sdk/types';
import { useBlueprintStore } from '../stores/blueprintStore';

/**
 * Blueprint 库管理组件
 */
export function BlueprintLibrary() {
  const { blueprints, selectedBlueprint, selectBlueprint } =
    useBlueprintStore();
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤 Blueprint
  const filteredBlueprints = useMemo(() => {
    if (!searchQuery) return blueprints;

    const query = searchQuery.toLowerCase();
    return blueprints.filter((bp) => {
      // 搜索名称、描述、作者
      const nameMatch = bp.meta.name.toLowerCase().includes(query);
      const descMatch = bp.meta.description?.toLowerCase().includes(query);
      const authorMatch = bp.meta.author?.toLowerCase().includes(query);
      return nameMatch || descMatch || authorMatch;
    });
  }, [blueprints, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-zinc-900/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-100">Blueprint 库</h2>
          <span className="text-[10px] text-zinc-500">
            {blueprints.length} 个 Blueprint
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="搜索 Blueprint..."
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Blueprint Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredBlueprints.length === 0 ? (
          <EmptyState searchQuery={searchQuery} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredBlueprints.map((blueprint) => (
              <BlueprintCard
                key={blueprint.meta.name}
                blueprint={blueprint}
                isSelected={
                  selectedBlueprint?.meta.name === blueprint.meta.name
                }
                onSelect={() => selectBlueprint(blueprint)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Blueprint 卡片组件
 */
interface BlueprintCardProps {
  blueprint: Blueprint;
  isSelected: boolean;
  onSelect: () => void;
}

function BlueprintCard({
  blueprint,
  isSelected,
  onSelect,
}: BlueprintCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`
        group relative p-3 rounded-lg cursor-pointer transition-all duration-200
        ${
          isSelected
            ? 'bg-violet-500/10 border border-violet-500/30 shadow-neon'
            : 'bg-zinc-900/50 border border-white/5 hover:border-white/10 hover:bg-zinc-800/50'
        }
      `}
    >
      {/* Icon */}
      <div className="flex items-start gap-2.5">
        <div
          className={`
            shrink-0 w-10 h-10 rounded-md flex items-center justify-center
            ${isSelected ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-500'}
            transition-colors
          `}
        >
          <svg
            className="w-5 h-5"
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
            className={`
              text-xs font-medium truncate
              ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}
            `}
          >
            {blueprint.meta.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`
                text-[9px] font-mono px-1.5 py-0.5 rounded
                ${isSelected ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-500'}
              `}
            >
              v{blueprint.meta.version}
            </span>
            {blueprint.meta.author && (
              <span className="text-[9px] text-zinc-600">
                by {blueprint.meta.author}
              </span>
            )}
          </div>

          {/* Skills count */}
          <div className="flex items-center gap-1 mt-2">
            <svg
              className="w-3 h-3 text-zinc-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span className="text-[9px] text-zinc-600">
              {blueprint.skills.length} 个工具
            </span>
          </div>

          {/* Description */}
          {blueprint.meta.description && (
            <p className="text-[9px] text-zinc-600 truncate mt-1.5">
              {blueprint.meta.description}
            </p>
          )}
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
      )}
    </div>
  );
}

/**
 * 空状态组件
 */
interface EmptyStateProps {
  searchQuery: string;
}

function EmptyState({ searchQuery }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-4">
        {searchQuery ? (
          <svg
            className="w-8 h-8 text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        ) : (
          <svg
            className="w-8 h-8 text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        {searchQuery ? '没有找到匹配的 Blueprint' : '还没有 Blueprint'}
      </p>
      <p className="text-[10px] text-zinc-600 mt-1">
        {searchQuery
          ? '尝试其他搜索关键词'
          : '从工具库导出 Blueprint 或导入已有文件'}
      </p>
    </div>
  );
}
