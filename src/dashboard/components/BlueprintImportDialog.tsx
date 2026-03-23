/**
 * =============================================================================
 * Blueprint Import Dialog
 * =============================================================================
 *
 * Dialog for importing Blueprint from JSON file
 */

import { useState, useRef, useEffect } from 'react';
import type {
  Blueprint,
  BlueprintConflict,
  MergeStrategy,
} from '@homura/sdk/types';
import { useBlueprintStore } from '../stores/blueprintStore';
import { useToolStore } from '../stores/toolStore';
import { detectConflicts } from '../utils/blueprintValidator';
import { ConflictResolution } from './ConflictResolution';

interface BlueprintImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function BlueprintImportDialog({
  open,
  onClose,
}: BlueprintImportDialogProps) {
  const {
    importBlueprints,
    isProcessing,
    processingMessage,
    processingProgress,
    clearPendingImports,
  } = useBlueprintStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [importedBlueprints, setImportedBlueprints] = useState<Blueprint[]>([]);
  const [conflicts, setConflictsLocal] = useState<BlueprintConflict[]>([]);
  const [resolutions, setResolutions] = useState<
    Record<string, 'skip' | 'replace' | 'rename'>
  >({});
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy | null>(
    null,
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPendingFiles([]);
      setImportedBlueprints([]);
      setConflictsLocal([]);
      setResolutions({});
      setMergeStrategy(null);
      clearPendingImports();
    }
  }, [open, clearPendingImports]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter((file) =>
      file.name.endsWith('.blueprint.json'),
    );

    if (validFiles.length === 0) {
      alert('请选择有效的 Blueprint 文件 (.blueprint.json)');
      return;
    }

    setPendingFiles(validFiles);

    // Import files
    try {
      const { importMultipleBlueprints } = await import('../utils/blueprintIO');
      const blueprints = await importMultipleBlueprints(validFiles);
      setImportedBlueprints(blueprints);

      // Detect conflicts
      const allConflicts: BlueprintConflict[] = [];
      const existingTools = useToolStore.getState().tools;
      for (const blueprint of blueprints) {
        const blueprintConflicts = detectConflicts(blueprint, existingTools);
        allConflicts.push(...blueprintConflicts);
      }

      setConflictsLocal(allConflicts);

      if (allConflicts.length === 0) {
        // No conflicts, ready to import
        // setPendingImports(blueprints);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert(error instanceof Error ? error.message : '导入失败');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleResolutionChange = (
    conflictId: string,
    resolution: 'skip' | 'replace' | 'rename',
  ) => {
    setResolutions((prev) => ({
      ...prev,
      [conflictId]: resolution,
    }));
  };

  const handleApplyAll = (resolution: 'skip' | 'replace' | 'rename') => {
    const newResolutions: Record<string, 'skip' | 'replace' | 'rename'> = {};
    for (const conflict of conflicts) {
      newResolutions[conflict.id] = resolution;
    }
    setResolutions(newResolutions);
  };

  const handleImport = async () => {
    if (importedBlueprints.length === 0) return;

    try {
      if (conflicts.length > 0) {
        // Apply custom resolutions
        await importBlueprints(importedBlueprints, 'rename_all');
      } else {
        // No conflicts, import directly
        await importBlueprints(importedBlueprints, mergeStrategy || 'skip_all');
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  if (!open) return null;

  const hasFiles = pendingFiles.length > 0;
  const hasConflicts = conflicts.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              导入 Blueprint
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              从 JSON 文件导入 Blueprint
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg
              className="w-6 h-6"
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

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {!hasFiles ? (
            /* File Drop Zone */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-zinc-700 rounded-lg p-12 text-center hover:border-violet-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg
                className="mx-auto h-12 w-12 text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-4 text-sm font-medium text-zinc-300">
                拖放 Blueprint 文件到这里，或点击选择文件
              </p>
              <p className="text-xs text-zinc-600 mt-2">
                支持 .blueprint.json 文件
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".blueprint.json"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>
          ) : (
            /* Import Preview */
            <div className="space-y-4">
              {/* File List */}
              <div className="bg-zinc-950/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">
                  选中的文件 ({pendingFiles.length})
                </h3>
                <div className="space-y-2">
                  {pendingFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-violet-500"
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
                        <span className="text-zinc-300">{file.name}</span>
                      </div>
                      <span className="text-xs text-zinc-600">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blueprint Preview */}
              {importedBlueprints.map((blueprint, index) => (
                <div key={index} className="bg-zinc-950/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2">
                    {blueprint.meta.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">版本:</span>
                      <span className="text-zinc-300">
                        {blueprint.meta.version}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">工具数量:</span>
                      <span className="text-zinc-300">
                        {blueprint.skills.length}
                      </span>
                    </div>
                    {blueprint.meta.author && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">作者:</span>
                        <span className="text-zinc-300">
                          {blueprint.meta.author}
                        </span>
                      </div>
                    )}
                    {blueprint.meta.description && (
                      <div className="col-span-2 flex justify-between">
                        <span className="text-zinc-500">描述:</span>
                        <span className="text-zinc-300 text-right">
                          {blueprint.meta.description}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Conflict Resolution */}
              {hasConflicts && (
                <div className="bg-zinc-950/50 rounded-lg p-4">
                  <ConflictResolution
                    conflicts={conflicts}
                    resolutions={resolutions}
                    onResolutionChange={handleResolutionChange}
                    onApplyAll={handleApplyAll}
                  />
                </div>
              )}

              {/* Progress Bar */}
              {isProcessing && (
                <div className="bg-zinc-950/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">
                      {processingMessage}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {processingProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950/30">
          <div className="text-sm text-zinc-500">
            {!hasFiles && '支持批量导入多个 Blueprint 文件'}
            {hasFiles &&
              !hasConflicts &&
              `${importedBlueprints.length} 个 Blueprint 准备导入`}
            {hasConflicts && `检测到 ${conflicts.length} 个冲突需要解决`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-300 disabled:opacity-50 transition-colors"
            >
              {hasFiles ? '取消' : '关闭'}
            </button>
            {hasFiles && !hasConflicts && (
              <button
                onClick={handleImport}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? '导入中...' : '导入'}
              </button>
            )}
            {hasConflicts && (
              <button
                onClick={handleImport}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? '导入中...' : '应用并导入'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
