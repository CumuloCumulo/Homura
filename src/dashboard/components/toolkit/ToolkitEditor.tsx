/**
 * =============================================================================
 * Homura Dashboard - Toolkit Editor
 * =============================================================================
 *
 * Main editor for toolkit orchestration
 */

import React, { useEffect } from 'react';
import { useToolkitStore } from '../../stores/toolkitStore';
import { useToolStore } from '../../stores/toolStore';
import { ToolkitLibrary } from './ToolkitLibrary';
import { ToolkitSequencePanel } from './ToolkitSequencePanel';
import { ToolDetailEditor } from './ToolDetailEditor';
import { LightweightTestPanel } from './LightweightTestPanel';
import { ViewButton } from '../ui';
import { ActionIcon } from '@shared/components';
import type { AtomicTool } from '@homura/sdk/types';

type EditorView = 'sequence' | 'detail' | 'test';

export function ToolkitEditor() {
  const { selectedToolkit, loadToolkits } = useToolkitStore();
  const [selectedTool, setSelectedTool] = React.useState<AtomicTool | null>(
    null,
  );
  const [editorView, setEditorView] = React.useState<EditorView>('sequence');

  // Load toolkits on mount
  useEffect(() => {
    loadToolkits();
  }, [loadToolkits]);

  // Reset selected tool when toolkit changes
  useEffect(() => {
    setSelectedTool(null);
    setEditorView('sequence');
  }, [selectedToolkit?.id]);

  return (
    <div className="flex h-full">
      {/* Left: Toolkit Library */}
      <aside className="w-72 shrink-0 border-r border-white/5 overflow-hidden">
        <ToolkitLibrary />
      </aside>

      {/* Center: Editor */}
      <main className="flex-1 flex flex-col overflow-hidden border-r border-white/5">
        {/* Toolbar */}
        <div className="shrink-0 px-4 py-3 border-b border-white/5 bg-zinc-900/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-zinc-200">
                {selectedToolkit?.name || '工具集编辑器'}
              </h2>
              {selectedToolkit?.description && (
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {selectedToolkit.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 bg-zinc-900/80 rounded-lg border border-white/5 p-0.5">
              <ViewButton
                view="sequence"
                currentView={editorView}
                onClick={() => setEditorView('sequence')}
              >
                序列
              </ViewButton>
              <ViewButton
                view="detail"
                currentView={editorView}
                onClick={() => setEditorView('detail')}
                disabled={!selectedTool}
              >
                详情
              </ViewButton>
              <ViewButton
                view="test"
                currentView={editorView}
                onClick={() => setEditorView('test')}
              >
                测试
              </ViewButton>
            </div>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-hidden">
          {editorView === 'sequence' && (
            <ToolkitSequencePanel
              toolkitId={selectedToolkit?.id || null}
              selectedTool={selectedTool}
              onToolSelect={setSelectedTool}
            />
          )}
          {editorView === 'detail' && (
            <ToolDetailEditor
              toolkitId={selectedToolkit?.id || null}
              tool={selectedTool}
            />
          )}
          {editorView === 'test' && (
            <LightweightTestPanel toolkitId={selectedToolkit?.id || null} />
          )}
        </div>
      </main>

      {/* Right: Quick Actions */}
      <aside className="w-64 shrink-0 overflow-hidden">
        <QuickActionsPanel toolkitId={selectedToolkit?.id || null} />
      </aside>
    </div>
  );
}

interface QuickActionsPanelProps {
  toolkitId: string | null;
}

function QuickActionsPanel({ toolkitId }: QuickActionsPanelProps) {
  const { tools } = useToolStore();
  const { addTool, updateToolkit, removeToolkit } = useToolkitStore();

  const handleAddTool = async (tool: AtomicTool) => {
    if (!toolkitId) return;
    // Add a copy of the tool to the toolkit
    await addTool(toolkitId, { ...tool });
  };

  const handleUpdateToolkitMeta = async (
    field: 'name' | 'description',
    value: string,
  ) => {
    if (!toolkitId) return;
    await updateToolkit(toolkitId, { [field]: value });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolkit Info */}
      <div className="p-4 border-b border-white/5">
        <h3 className="text-sm font-medium text-zinc-200 mb-3">工具集信息</h3>
        {toolkitId ? (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="工具集名称"
              onChange={(e) => handleUpdateToolkitMeta('name', e.target.value)}
              className="w-full h-8 px-3 text-xs bg-zinc-900/80 border border-white/5 rounded text-zinc-300 focus:border-violet-500/30 focus:outline-none"
            />
            <textarea
              placeholder="描述（可选）"
              rows={2}
              onChange={(e) =>
                handleUpdateToolkitMeta('description', e.target.value)
              }
              className="w-full px-3 py-2 text-xs bg-zinc-900/80 border border-white/5 rounded text-zinc-300 focus:border-violet-500/30 focus:outline-none resize-none"
            />
          </div>
        ) : (
          <p className="text-xs text-zinc-600 text-center py-4">
            选择一个工具集
          </p>
        )}
      </div>

      {/* Available Tools */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-medium text-zinc-200">可用工具</h3>
          <p className="text-[10px] text-zinc-500 mt-1">点击添加到工具集</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1.5">
            {tools.map((tool) => (
              <button
                key={tool.tool_id}
                onClick={() => handleAddTool(tool)}
                disabled={!toolkitId}
                className={`
                  w-full text-left p-2.5 rounded-lg transition-all duration-200 group
                  ${
                    !toolkitId
                      ? 'opacity-50 cursor-not-allowed'
                      : 'bg-zinc-900/50 border border-white/5 hover:border-violet-500/30 hover:bg-zinc-800/50'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <ActionIcon action={tool.selector_logic.target.action} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-zinc-300 truncate">
                      {tool.name}
                    </h4>
                    <p className="text-[9px] text-zinc-600 truncate font-mono">
                      {tool.selector_logic.target.selector}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-zinc-600 group-hover:text-violet-400"
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
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Button */}
      {toolkitId && (
        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => {
              if (confirm('确定要删除这个工具集吗？')) {
                removeToolkit(toolkitId);
              }
            }}
            className="w-full h-8 flex items-center justify-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded text-xs text-rose-400 hover:bg-rose-500/20 transition-colors"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            删除工具集
          </button>
        </div>
      )}
    </div>
  );
}
