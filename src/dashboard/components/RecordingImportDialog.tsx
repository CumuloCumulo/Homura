/**
 * =============================================================================
 * Homura Dashboard - Recording Import Dialog
 * =============================================================================
 *
 * Dialog for importing recorded actions from SidePanel into tool library
 */

import { useState, useEffect } from 'react';
import { useToolStore } from '../stores/toolStore';
import {
  getRecordingsFromStorage,
  deleteRecordingFromStorage,
  markRecordingAsImported,
  type RecordingData,
} from '@shared/storage/recordingStorage';
import { convertRecordingToTools } from '../utils/recordingConverter';

// =============================================================================
// ICONS
// =============================================================================

const CloseIcon = () => (
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
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const CheckIcon = () => (
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
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const TrashIcon = () => (
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
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const DownloadIcon = () => (
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
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface RecordingImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecordingImportDialog({
  isOpen,
  onClose,
}: RecordingImportDialogProps) {
  const { tools, addTool } = useToolStore();
  const [recordings, setRecordings] = useState<RecordingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 加载录制列表
  useEffect(() => {
    if (isOpen) {
      loadRecordings();
    }
  }, [isOpen]);

  const loadRecordings = async () => {
    setLoading(true);
    try {
      const data = await getRecordingsFromStorage();
      // 只显示未导入的录制
      setRecordings(data.filter((r) => !r.imported));
    } catch (error) {
      console.error('Failed to load recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === recordings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(recordings.map((r) => r.id)));
    }
  };

  const handleDelete = async (id: string) => {
    await deleteRecordingFromStorage(id);
    await loadRecordings();
    if (selectedIds.has(id)) {
      const newSelected = new Set(selectedIds);
      newSelected.delete(id);
      setSelectedIds(newSelected);
    }
  };

  const handleImport = async (id: string) => {
    setImporting(id);
    try {
      const recording = recordings.find((r) => r.id === id);
      if (!recording) return;

      // 转换为工具
      const result = convertRecordingToTools(recording.actions);

      // 添加到工具库
      for (const tool of result.tools) {
        // 检查 ID 冲突
        if (tools.some((t) => t.tool_id === tool.tool_id)) {
          // 生成新 ID
          tool.tool_id = `${tool.tool_id}_${Date.now()}`;
        }
        addTool(tool);
      }

      // 标记为已导入
      await markRecordingAsImported(id);

      // 刷新列表
      await loadRecordings();

      // 清除选中状态
      const newSelected = new Set(selectedIds);
      newSelected.delete(id);
      setSelectedIds(newSelected);
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setImporting(null);
    }
  };

  const handleImportSelected = async () => {
    for (const id of selectedIds) {
      await handleImport(id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[600px] max-h-[80vh] bg-zinc-900 border border-white/10 rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <DownloadIcon />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">导入录制</h2>
              <p className="text-[10px] text-zinc-500">
                {recordings.length} 个待导入录制
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recordings.length === 0 ? (
            <EmptyState onClose={onClose} />
          ) : (
            <div className="space-y-3">
              {/* Select All */}
              {recordings.length > 1 && (
                <button
                  onClick={handleSelectAll}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800/50 border border-white/5 text-xs text-zinc-400 hover:text-zinc-300 hover:border-white/10 transition-colors"
                >
                  {selectedIds.size === recordings.length ? '取消全选' : '全选'}
                </button>
              )}

              {/* Recording Cards */}
              {recordings.map((recording) => (
                <RecordingCard
                  key={recording.id}
                  recording={recording}
                  isSelected={selectedIds.has(recording.id)}
                  isExpanded={expandedId === recording.id}
                  isImporting={importing === recording.id}
                  onToggleSelect={() => handleToggleSelect(recording.id)}
                  onToggleExpand={() =>
                    setExpandedId(
                      expandedId === recording.id ? null : recording.id,
                    )
                  }
                  onImport={() => handleImport(recording.id)}
                  onDelete={() => handleDelete(recording.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {recordings.length > 0 && selectedIds.size > 0 && (
          <div className="px-5 py-4 border-t border-white/5">
            <button
              onClick={handleImportSelected}
              className="w-full h-10 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg text-sm font-medium text-white hover:from-violet-500 hover:to-fuchsia-500 transition-all"
            >
              导入选中的 {selectedIds.size} 个录制
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// RECORDING CARD
// =============================================================================

interface RecordingCardProps {
  recording: RecordingData;
  isSelected: boolean;
  isExpanded: boolean;
  isImporting: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onImport: () => void;
  onDelete: () => void;
}

function RecordingCard({
  recording,
  isSelected,
  isExpanded,
  isImporting,
  onToggleSelect,
  onToggleExpand,
  onImport,
  onDelete,
}: RecordingCardProps) {
  return (
    <div
      className={`
        rounded-lg border transition-all duration-200
        ${isSelected ? 'bg-violet-500/10 border-violet-500/30' : 'bg-zinc-800/50 border-white/5'}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={onToggleSelect}
          className={`
            shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all
            ${
              isSelected
                ? 'bg-violet-500 border-violet-500'
                : 'border-zinc-600 hover:border-zinc-500'
            }
          `}
        >
          {isSelected && <CheckIcon />}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0" onClick={onToggleExpand}>
          <h3 className="text-sm font-medium text-zinc-200 truncate">
            {recording.name}
          </h3>
          <p className="text-[10px] text-zinc-500 flex items-center gap-2">
            <span>{recording.actions.length} 个操作</span>
            <span>•</span>
            <span>
              {new Date(recording.createdAt).toLocaleString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onImport();
            }}
            disabled={isImporting}
            className="p-1.5 rounded text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-50"
            title="导入"
          >
            {isImporting ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <DownloadIcon />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="删除"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-3 pt-0 border-t border-white/5">
          <div className="pt-3 space-y-2">
            {recording.actions.map((action, index) => (
              <ActionPreview key={action.id} action={action} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ACTION PREVIEW
// =============================================================================

interface ActionPreviewProps {
  action: {
    type: string;
    name?: string;
    value?: string;
    url?: string;
    elementAnalysis?: {
      minimalSelector?: string;
    };
  } & {
    unifiedSelector?: {
      fullSelector?: string;
    };
  };
  index: number;
}

const actionIcons: Record<string, string> = {
  click: '👆',
  input: '⌨️',
  select: '📋',
  scroll: '📜',
  navigate: '🌐',
};

function ActionPreview({ action, index }: ActionPreviewProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-900/50">
      <span className="w-5 text-center text-xs">{index + 1}</span>
      <span>{actionIcons[action.type] || '•'}</span>
      <span className="text-[10px] text-zinc-400 truncate flex-1">
        {action.name || action.type}
      </span>
      {action.value && (
        <code className="text-[9px] text-violet-400 font-mono truncate max-w-[150px]">
          "{action.value}"
        </code>
      )}
      {action.url && (
        <code className="text-[9px] text-blue-400 font-mono truncate max-w-[150px]">
          {action.url}
        </code>
      )}
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center mb-4">
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
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-zinc-300 mb-1">
        没有待导入的录制
      </h3>
      <p className="text-xs text-zinc-500 mb-4">
        在 SidePanel 录制操作后保存到 Dashboard
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-zinc-800 border border-white/5 rounded-lg text-xs text-zinc-400 hover:text-zinc-300 hover:border-white/10 transition-colors"
      >
        关闭
      </button>
    </div>
  );
}
