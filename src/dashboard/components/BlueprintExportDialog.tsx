/**
 * =============================================================================
 * Blueprint Export Dialog
 * =============================================================================
 *
 * Dialog for exporting Blueprint to JSON file
 */

import { useState, useEffect } from 'react';
import type { Blueprint, BlueprintMeta } from '@homura/sdk/types';
import { useToolStore } from '../stores/toolStore';
import { useBlueprintStore } from '../stores/blueprintStore';

interface BlueprintExportDialogProps {
  open: boolean;
  onClose: () => void;
  initialBlueprint?: Blueprint;
}

export function BlueprintExportDialog({
  open,
  onClose,
  initialBlueprint,
}: BlueprintExportDialogProps) {
  const { tools, ruleBook, exportAsBlueprint } = useToolStore();
  const { exportBlueprint, isProcessing, processingMessage } = useBlueprintStore();

  const [meta, setMeta] = useState<Partial<BlueprintMeta>>({
    name: '',
    version: '1.0.0',
    description: '',
    author: '',
    targetUrl: '*',
    blueprintVersion: '1.0.0',
  });

  const [preview, setPreview] = useState<Blueprint | null>(null);

  // Initialize with initial blueprint or current state
  useEffect(() => {
    if (initialBlueprint) {
      setMeta(initialBlueprint.meta);
      setPreview(initialBlueprint);
    } else if (open) {
      setMeta((prev) => ({
        ...prev,
        name: prev.name || 'my-blueprint',
      }));
    }
  }, [initialBlueprint, open]);

  // Generate preview when meta changes
  useEffect(() => {
    if (open) {
      const blueprint = exportAsBlueprint(meta as Omit<BlueprintMeta, 'skillsHash' | 'createdAt' | 'updatedAt'>);
      setPreview(blueprint);
    }
  }, [meta, open, exportAsBlueprint]);

  const handleExport = async () => {
    if (!preview) return;

    try {
      await exportBlueprint(preview);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (!open) return null;

  const skillsCount = tools.length;
  const rulesLength = ruleBook.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">导出 Blueprint</h2>
            <p className="text-sm text-zinc-500 mt-1">
              将当前工具库和规则书导出为 Blueprint 文件
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Meta Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={meta.name}
                  onChange={(e) => setMeta({ ...meta, name: e.target.value })}
                  placeholder="my-blueprint"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  版本 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={meta.version}
                  onChange={(e) => setMeta({ ...meta, version: e.target.value })}
                  placeholder="1.0.0"
                  pattern="^\d+\.\d+\.\d+$"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                描述
              </label>
              <textarea
                value={meta.description}
                onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                placeholder="描述这个 Blueprint 的用途..."
                rows={3}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  作者
                </label>
                <input
                  type="text"
                  value={meta.author}
                  onChange={(e) => setMeta({ ...meta, author: e.target.value })}
                  placeholder="Your Name"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  目标网址
                </label>
                <input
                  type="text"
                  value={meta.targetUrl}
                  onChange={(e) => setMeta({ ...meta, targetUrl: e.target.value })}
                  placeholder="https://example.com/*"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Preview */}
            {preview && (
              <div className="bg-zinc-950/50 rounded-lg border border-zinc-800 p-4">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">预览</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">文件名:</span>
                    <span className="text-zinc-300 font-mono">
                      {meta.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-v{meta.version}.blueprint.json
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">工具数量:</span>
                    <span className="text-zinc-300">{skillsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">规则长度:</span>
                    <span className="text-zinc-300">{rulesLength} 字符</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950/30">
          <div className="text-sm text-zinc-500">
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {processingMessage}
              </span>
            ) : (
              `将导出到 Downloads 文件夹`
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-300 disabled:opacity-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={!meta.name || !meta.version || isProcessing}
              className="px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? '导出中...' : '导出'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
