/**
 * =============================================================================
 * Blueprint Detail View - Blueprint 详情视图
 * =============================================================================
 *
 * 显示 Blueprint 的完整信息，包括元信息、工具列表和 Rule Book
 */

import React from 'react';
import type { Blueprint, PrimitiveAction } from '@homura/sdk/types';
import { useBlueprintStore } from '../stores/blueprintStore';
import { useToolStore } from '../stores/toolStore';

// Action type icons（复用 ToolLibrary 的图标）
const ActionIcons: Record<PrimitiveAction, React.ReactNode> = {
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

/**
 * Blueprint 详情视图组件
 */
export function BlueprintDetailView() {
  const { selectedBlueprint, removeBlueprint, exportBlueprint } =
    useBlueprintStore();
  const { loadFromBlueprint } = useToolStore();

  // 未选中 Blueprint 时显示空状态
  if (!selectedBlueprint) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-zinc-950 text-center">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-xs text-zinc-500">选择一个 Blueprint 查看详情</p>
      </div>
    );
  }

  const handleLoadTools = () => {
    loadFromBlueprint(selectedBlueprint);
  };

  const handleExport = async () => {
    await exportBlueprint(selectedBlueprint);
  };

  const handleDelete = () => {
    if (confirm(`确定要删除 Blueprint "${selectedBlueprint.meta.name}" 吗？`)) {
      removeBlueprint(selectedBlueprint.meta.name);
    }
  };

  const handleExecute = () => {
    // TODO: 实现 Blueprint 执行功能
    alert('Blueprint 执行功能将在后续版本实现');
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-white/5 bg-zinc-900/50">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-zinc-100 truncate">
              {selectedBlueprint.meta.name}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-mono text-zinc-500">
                v{selectedBlueprint.meta.version}
              </span>
              {selectedBlueprint.meta.author && (
                <span className="text-[10px] text-zinc-600">
                  作者: {selectedBlueprint.meta.author}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadTools}
              className="p-1.5 rounded-md bg-zinc-900/80 border border-white/5 text-zinc-500 hover:text-violet-400 hover:border-violet-500/30 transition-colors"
              title="加载到工具库"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
            <button
              onClick={handleExport}
              className="p-1.5 rounded-md bg-zinc-900/80 border border-white/5 text-zinc-500 hover:text-violet-400 hover:border-violet-500/30 transition-colors"
              title="导出"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-md bg-zinc-900/80 border border-white/5 text-zinc-500 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
              title="删除"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {selectedBlueprint.meta.description && (
          <p className="text-xs text-zinc-500 mt-3">{selectedBlueprint.meta.description}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Meta Info */}
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-xs font-semibold text-zinc-400 mb-3">元信息</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-zinc-600">目标网址:</span>
              <span className="ml-2 text-zinc-400 font-mono">
                {selectedBlueprint.meta.targetUrl}
              </span>
            </div>
            <div>
              <span className="text-zinc-600">Blueprint 版本:</span>
              <span className="ml-2 text-zinc-400 font-mono">
                {selectedBlueprint.meta.blueprintVersion}
              </span>
            </div>
            {selectedBlueprint.meta.createdAt && (
              <div>
                <span className="text-zinc-600">创建时间:</span>
                <span className="ml-2 text-zinc-400">
                  {new Date(selectedBlueprint.meta.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {selectedBlueprint.meta.updatedAt && (
              <div>
                <span className="text-zinc-600">更新时间:</span>
                <span className="ml-2 text-zinc-400">
                  {new Date(selectedBlueprint.meta.updatedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Skills List */}
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-xs font-semibold text-zinc-400 mb-3">
            包含的工具 ({selectedBlueprint.skills.length})
          </h3>
          <div className="space-y-2">
            {selectedBlueprint.skills.map((skill) => (
              <SkillItem key={skill.tool_id} skill={skill} />
            ))}
          </div>
        </div>

        {/* Rule Book */}
        <div className="px-6 py-4">
          <h3 className="text-xs font-semibold text-zinc-400 mb-3">Rule Book</h3>
          <div className="p-3 bg-zinc-900/50 rounded-lg border border-white/5">
            <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono">
              {selectedBlueprint.rules || '<暂无 Rule Book>'}
            </pre>
          </div>
        </div>
      </div>

      {/* Footer - Execute Button */}
      <div className="shrink-0 px-6 py-4 border-t border-white/5 bg-zinc-900/50">
        <button
          onClick={handleExecute}
          className="w-full h-10 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">执行 Blueprint</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Skill 工具项组件
 */
interface SkillItemProps {
  skill: Blueprint['skills'][number];
}

function SkillItem({ skill }: SkillItemProps) {
  const action = skill.selector_logic.target.action;

  return (
    <div className="flex items-center gap-3 p-2.5 bg-zinc-900/50 rounded-lg border border-white/5">
      {/* Icon */}
      <div className="shrink-0 w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-500">
        {ActionIcons[action]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-medium text-zinc-300">{skill.name}</h4>
          <span className="text-[9px] font-mono text-zinc-600">{skill.tool_id}</span>
        </div>
        {skill.description && (
          <p className="text-[10px] text-zinc-600 truncate mt-0.5">{skill.description}</p>
        )}

        {/* Parameters */}
        {Object.keys(skill.parameters).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.keys(skill.parameters).slice(0, 3).map((param) => (
              <span
                key={param}
                className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-zinc-800 text-zinc-600"
              >
                {'{{' + param + '}}'}
              </span>
            ))}
            {Object.keys(skill.parameters).length > 3 && (
              <span className="text-[9px] text-zinc-600">
                +{Object.keys(skill.parameters).length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
