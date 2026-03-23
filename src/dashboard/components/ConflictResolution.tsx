/**
 * =============================================================================
 * Conflict Resolution Component
 * =============================================================================
 *
 * UI for resolving Blueprint import conflicts
 */

import type { BlueprintConflict } from '@homura/sdk/types';

interface ConflictResolutionProps {
  conflicts: BlueprintConflict[];
  resolutions: Record<string, 'skip' | 'replace' | 'rename'>;
  onResolutionChange: (conflictId: string, resolution: 'skip' | 'replace' | 'rename') => void;
  onApplyAll: (resolution: 'skip' | 'replace' | 'rename') => void;
}

export function ConflictResolution({
  conflicts,
  resolutions,
  onResolutionChange,
  onApplyAll,
}: ConflictResolutionProps) {
  if (conflicts.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <svg
          className="mx-auto h-12 w-12 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="mt-2">没有冲突</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-700 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">
            冲突解决 ({conflicts.length})
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            解决导入 Blueprint 时的重复工具 ID
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onApplyAll('skip')}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
          >
            全部跳过
          </button>
          <button
            onClick={() => onApplyAll('rename')}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
          >
            全部重命名
          </button>
          <button
            onClick={() => onApplyAll('replace')}
            className="px-3 py-1.5 text-xs font-medium bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded border border-red-900/50 transition-colors"
          >
            全部替换
          </button>
        </div>
      </div>

      {/* Conflict List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {conflicts.map((conflict) => (
          <ConflictCard
            key={conflict.id}
            conflict={conflict}
            resolution={resolutions[conflict.id] || 'skip'}
            onResolutionChange={(resolution) =>
              onResolutionChange(conflict.id, resolution)
            }
          />
        ))}
      </div>
    </div>
  );
}

interface ConflictCardProps {
  conflict: BlueprintConflict;
  resolution: 'skip' | 'replace' | 'rename';
  onResolutionChange: (resolution: 'skip' | 'replace' | 'rename') => void;
}

function ConflictCard({ conflict, resolution, onResolutionChange }: ConflictCardProps) {
  const resolutionLabels = {
    skip: '跳过',
    replace: '替换',
    rename: '重命名',
  };

  const resolutionColors = {
    skip: 'bg-zinc-800 border-zinc-700 text-zinc-400',
    replace: 'bg-red-900/20 border-red-900/50 text-red-400',
    rename: 'bg-blue-900/20 border-blue-900/50 text-blue-400',
  };

  return (
    <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded">
              {conflict.id}
            </span>
            <span className="text-xs text-zinc-500">
              {conflict.type === 'duplicate_id' ? '重复 ID' : conflict.type}
            </span>
          </div>
          <p className="text-sm font-medium text-zinc-300 mt-2">
            {conflict.incoming.name}
          </p>
        </div>

        {/* Resolution Selector */}
        <select
          value={resolution}
          onChange={(e) =>
            onResolutionChange(e.target.value as 'skip' | 'replace' | 'rename')
          }
          className={`ml-4 px-3 py-1.5 text-xs font-medium rounded border ${resolutionColors[resolution]} cursor-pointer`}
        >
          <option value="skip">跳过</option>
          <option value="rename">重命名</option>
          <option value="replace">替换</option>
        </select>
      </div>

      {/* Tool Comparison */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {/* Existing Tool */}
        <div className="bg-zinc-950/50 rounded p-3 border border-zinc-800">
          <p className="text-xs font-medium text-zinc-500 mb-2">现有工具</p>
          <p className="text-sm text-zinc-300">{conflict.existing.name}</p>
          <p className="text-xs text-zinc-600 mt-1">
            参数: {Object.keys(conflict.existing.parameters).join(', ') || '无'}
          </p>
        </div>

        {/* Incoming Tool */}
        <div className="bg-zinc-950/50 rounded p-3 border border-zinc-800">
          <p className="text-xs font-medium text-zinc-500 mb-2">导入工具</p>
          <p className="text-sm text-zinc-300">{conflict.incoming.name}</p>
          <p className="text-xs text-zinc-600 mt-1">
            参数: {Object.keys(conflict.incoming.parameters).join(', ') || '无'}
          </p>
        </div>
      </div>

      {/* Resolution Description */}
      <div className="mt-3 pt-3 border-t border-zinc-800">
        <p className="text-xs text-zinc-500">
          将
          <span className="font-medium text-zinc-400 mx-1">
            {resolutionLabels[resolution]}
          </span>
          导入的工具
        </p>
      </div>
    </div>
  );
}
