/**
 * =============================================================================
 * Homura Dashboard - Toolkit Sequence Panel
 * =============================================================================
 *
 * Panel showing the sequence of tools in a toolkit with drag-drop reordering
 */

import React from 'react';
import { useToolkitStore } from '../../stores/toolkitStore';
import type { AtomicTool, PrimitiveAction } from '@homura/sdk/types';

interface ToolkitSequencePanelProps {
  toolkitId: string | null;
  onToolSelect: (tool: AtomicTool | null) => void;
  selectedTool: AtomicTool | null;
}

const actionIcons: Record<PrimitiveAction, React.ReactNode> = {
  CLICK: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
      />
    </svg>
  ),
  INPUT: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  ),
  EXTRACT_TEXT: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  WAIT_FOR: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  NAVIGATE: (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  ),
};

export function ToolkitSequencePanel({
  toolkitId,
  onToolSelect,
  selectedTool,
}: ToolkitSequencePanelProps) {
  const { toolkits } = useToolkitStore();
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const toolkit = toolkitId ? toolkits.find((t) => t.id === toolkitId) : null;

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    if (
      draggedIndex !== null &&
      dragOverIndex !== null &&
      draggedIndex !== dragOverIndex
    ) {
      const { moveTool } = useToolkitStore.getState();
      await moveTool(toolkitId!, draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = async (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      const { moveTool } = useToolkitStore.getState();
      await moveTool(toolkitId!, draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleRemoveTool = async (toolId: string) => {
    if (!toolkitId) return;
    const { removeTool } = useToolkitStore.getState();
    await removeTool(toolkitId, toolId);
    if (selectedTool?.tool_id === toolId) {
      onToolSelect(null);
    }
  };

  if (!toolkit) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-4">
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
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <p className="text-sm text-zinc-400">选择或创建一个工具集</p>
        <p className="text-xs text-zinc-600 mt-1">工具集将在这里显示</p>
      </div>
    );
  }

  if (toolkit.tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-dashed border-white/10 flex items-center justify-center mb-4">
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
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
        <p className="text-sm text-zinc-400">工具集是空的</p>
        <p className="text-xs text-zinc-600 mt-1">从左侧添加工具开始构建</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <h3 className="text-sm font-medium text-zinc-200">工具序列</h3>
        <p className="text-[10px] text-zinc-500 mt-1">
          按执行顺序排列 • 拖拽可重新排序
        </p>
      </div>

      {/* Tool List */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {toolkit.tools.map((tool, index) => (
            <ToolSequenceItem
              key={tool.tool_id}
              tool={tool}
              index={index}
              isSelected={selectedTool?.tool_id === tool.tool_id}
              isDragging={draggedIndex === index}
              isDragOver={dragOverIndex === index}
              onSelect={() => onToolSelect(tool)}
              onRemove={() => handleRemoveTool(tool.tool_id)}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 bg-zinc-900/30">
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>{toolkit.tools.length} 个工具</span>
          <span>预计执行时间 ~{toolkit.tools.length * 2}s</span>
        </div>
      </div>
    </div>
  );
}

interface ToolSequenceItemProps {
  tool: AtomicTool;
  index: number;
  isSelected: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

function ToolSequenceItem({
  tool,
  index,
  isSelected,
  isDragging,
  isDragOver,
  onSelect,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ToolSequenceItemProps) {
  const action = tool.selector_logic.target.action;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`
        group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200
        ${isDragging ? 'opacity-50' : ''}
        ${isDragOver ? 'border-2 border-dashed border-violet-500/50' : ''}
        ${
          isSelected
            ? 'bg-violet-500/10 border border-violet-500/30'
            : 'bg-zinc-900/50 border border-white/5 hover:border-white/10 hover:bg-zinc-800/50'
        }
      `}
    >
      {/* Drag Handle */}
      <div className="shrink-0 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400">
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
            d="M4 8h16M4 16h16"
          />
        </svg>
      </div>

      {/* Step Number */}
      <div className="shrink-0 w-6 h-6 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] text-zinc-500 font-mono">
        {index + 1}
      </div>

      {/* Action Icon */}
      <div
        className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${
          isSelected
            ? 'bg-violet-500/20 text-violet-400'
            : 'bg-zinc-800 text-zinc-400'
        }`}
      >
        {actionIcons[action] || actionIcons.CLICK}
      </div>

      {/* Tool Info */}
      <div className="flex-1 min-w-0">
        <h4
          className={`text-xs font-medium truncate ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}
        >
          {tool.name}
        </h4>
        {tool.description && (
          <p className="text-[10px] text-zinc-500 truncate">
            {tool.description}
          </p>
        )}
        {/* Selector preview */}
        <div className="text-[9px] text-zinc-600 font-mono truncate mt-1">
          {tool.selector_logic.target.selector}
        </div>
      </div>

      {/* Parameters count */}
      {Object.keys(tool.parameters).length > 0 && (
        <div className="shrink-0 px-2 py-1 rounded bg-zinc-800 text-[9px] text-zinc-500">
          {Object.keys(tool.parameters).length} 参数
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
