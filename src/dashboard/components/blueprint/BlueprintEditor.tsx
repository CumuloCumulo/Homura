/**
 * =============================================================================
 * Homura Dashboard - Blueprint Editor
 * =============================================================================
 *
 * Main editor for blueprint orchestration
 */

import React, { useEffect } from 'react';
import { useBlueprintStore } from '../../stores/blueprintStore';
import { useToolkitStore } from '../../stores/toolkitStore';
import { BlueprintLibrary } from './BlueprintLibrary';
import { RuleBookEditor } from './RuleBookEditor';
import { ToolkitSelector } from './ToolkitSelector';
import { BlueprintTestPanel } from './BlueprintTestPanel';
import { ViewButton } from '../ui';
import type { Blueprint } from '@homura/sdk/types';

type EditorView = 'meta' | 'rules' | 'tools' | 'test';

export function BlueprintEditor() {
  const { selectedBlueprint, loadBlueprints } = useBlueprintStore();
  const [editorView, setEditorView] = React.useState<EditorView>('meta');

  // Load blueprints on mount
  useEffect(() => {
    loadBlueprints();
  }, [loadBlueprints]);

  // Reset view when blueprint changes
  useEffect(() => {
    setEditorView('meta');
  }, [selectedBlueprint?.meta.id]);

  return (
    <div className="flex h-full">
      {/* Left: Blueprint Library */}
      <aside className="w-72 shrink-0 border-r border-white/5 overflow-hidden">
        <BlueprintLibrary />
      </aside>

      {/* Center: Editor */}
      <main className="flex-1 flex flex-col overflow-hidden border-r border-white/5">
        {/* Toolbar */}
        <div className="shrink-0 px-4 py-3 border-b border-white/5 bg-zinc-900/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-zinc-200">
                {selectedBlueprint?.meta.name || '蓝图编辑器'}
              </h2>
              {selectedBlueprint?.meta.description && (
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {selectedBlueprint.meta.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 bg-zinc-900/80 rounded-lg border border-white/5 p-0.5">
              <ViewButton
                view="meta"
                currentView={editorView}
                onClick={() => setEditorView('meta')}
                color="fuchsia"
              >
                元数据
              </ViewButton>
              <ViewButton
                view="rules"
                currentView={editorView}
                onClick={() => setEditorView('rules')}
                color="fuchsia"
              >
                Rule Book
              </ViewButton>
              <ViewButton
                view="tools"
                currentView={editorView}
                onClick={() => setEditorView('tools')}
                color="fuchsia"
              >
                工具集
              </ViewButton>
              <ViewButton
                view="test"
                currentView={editorView}
                onClick={() => setEditorView('test')}
                color="fuchsia"
              >
                测试
              </ViewButton>
            </div>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-hidden">
          {editorView === 'meta' && (
            <MetaEditor blueprint={selectedBlueprint} />
          )}
          {editorView === 'rules' && (
            <RuleBookEditor
              content={selectedBlueprint?.rules || ''}
              onChange={(content) => handleUpdateRules(content)}
            />
          )}
          {editorView === 'tools' && (
            <ToolsEditor blueprint={selectedBlueprint} />
          )}
          {editorView === 'test' && (
            <BlueprintTestPanel
              blueprintId={selectedBlueprint?.meta.id || null}
            />
          )}
        </div>
      </main>

      {/* Right: Quick Info */}
      <aside className="w-64 shrink-0 overflow-hidden">
        <QuickInfoPanel blueprint={selectedBlueprint} />
      </aside>
    </div>
  );
}

function handleUpdateRules(content: string) {
  const { updateBlueprint, selectedBlueprint } = useBlueprintStore.getState();
  if (!selectedBlueprint?.meta.id) return;
  updateBlueprint(selectedBlueprint.meta.id, {
    rules: content,
  });
}

interface MetaEditorProps {
  blueprint: Blueprint | null;
}

function MetaEditor({ blueprint }: MetaEditorProps) {
  const { updateBlueprint } = useBlueprintStore();
  const [name, setName] = React.useState(blueprint?.meta.name || '');
  const [description, setDescription] = React.useState(
    blueprint?.meta.description || '',
  );
  const [tags, setTags] = React.useState<string[]>(blueprint?.tags || []);
  const [tagInput, setTagInput] = React.useState('');
  const [hasChanges, setHasChanges] = React.useState(false);

  useEffect(() => {
    setName(blueprint?.meta.name || '');
    setDescription(blueprint?.meta.description || '');
    setTags(blueprint?.tags || []);
    setHasChanges(false);
  }, [blueprint]);

  const handleSave = async () => {
    if (!blueprint?.meta.id) return;
    await updateBlueprint(blueprint.meta.id, {
      meta: {
        ...blueprint.meta,
        name,
        description,
      },
      tags,
    });
    setHasChanges(false);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
      setHasChanges(true);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
    setHasChanges(true);
  };

  if (!blueprint) {
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-sm text-zinc-400">选择或创建一个蓝图</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Save button */}
      <div className="p-4 border-b border-white/5 flex items-center justify-end">
        {hasChanges && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setName(blueprint?.meta.name || '');
                setDescription(blueprint?.meta.description || '');
                setTags(blueprint?.tags || []);
                setHasChanges(false);
              }}
              className="px-3 py-1.5 text-xs bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition-colors"
            >
              重置
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-xs bg-fuchsia-500/20 text-fuchsia-400 rounded hover:bg-fuchsia-500/30 transition-colors"
            >
              保存
            </button>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Name */}
        <div>
          <label className="text-[10px] text-zinc-500 mb-1.5 block">
            蓝图名称
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setHasChanges(true);
            }}
            className="w-full h-9 px-3 text-xs bg-zinc-900/80 border border-white/5 rounded text-zinc-300 focus:border-fuchsia-500/30 focus:outline-none"
            placeholder="输入蓝图名称..."
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] text-zinc-500 mb-1.5 block">描述</label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setHasChanges(true);
            }}
            rows={3}
            className="w-full px-3 py-2 text-xs bg-zinc-900/80 border border-white/5 rounded text-zinc-300 focus:border-fuchsia-500/30 focus:outline-none resize-none"
            placeholder="描述这个蓝图的用途..."
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-[10px] text-zinc-500 mb-1.5 block">标签</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              className="flex-1 h-8 px-3 text-xs bg-zinc-900/80 border border-white/5 rounded text-zinc-300 focus:border-fuchsia-500/30 focus:outline-none"
              placeholder="添加标签..."
            />
            <button
              onClick={handleAddTag}
              className="px-3 h-8 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition-colors text-xs"
            >
              添加
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-fuchsia-500/10 text-fuchsia-400 rounded border border-fuchsia-500/20 text-[10px]"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-fuchsia-300"
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
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Version Info */}
        <div className="p-3 bg-zinc-900/50 rounded border border-white/5">
          <div className="text-[10px] text-zinc-600">
            <div className="flex justify-between">
              <span>版本:</span>
              <span className="font-mono text-zinc-500">
                {blueprint.meta.version}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span>创建时间:</span>
              <span className="font-mono text-zinc-500">
                {blueprint.meta.createdAt
                  ? new Date(blueprint.meta.createdAt).toLocaleDateString()
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span>更新时间:</span>
              <span className="font-mono text-zinc-500">
                {blueprint.meta.updatedAt
                  ? new Date(blueprint.meta.updatedAt).toLocaleDateString()
                  : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ToolsEditorProps {
  blueprint: Blueprint | null;
}

function ToolsEditor({ blueprint }: ToolsEditorProps) {
  const { updateBlueprint } = useBlueprintStore();
  const [selectedToolkitId, setSelectedToolkitId] = React.useState<
    string | null
  >(blueprint?.toolkitId || null);

  useEffect(() => {
    setSelectedToolkitId(blueprint?.toolkitId || null);
  }, [blueprint?.toolkitId]);

  const handleToolkitSelect = async (toolkitId: string | null) => {
    setSelectedToolkitId(toolkitId);
    if (!blueprint?.meta.id) return;
    await updateBlueprint(blueprint.meta.id, {
      toolkitId: toolkitId || undefined,
    });
  };

  if (!blueprint) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-sm text-zinc-400">选择或创建一个蓝图</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <ToolkitSelector
          selectedToolkitId={selectedToolkitId}
          onSelect={handleToolkitSelect}
        />

        {/* Linked Toolkit Info */}
        {selectedToolkitId && (
          <LinkedToolkitInfo toolkitId={selectedToolkitId} />
        )}

        {/* Direct Tools (if any) */}
        {blueprint.skills.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-zinc-300 mb-3">
              直接关联的工具
            </h4>
            <div className="space-y-2">
              {blueprint.skills.map((skill) => (
                <div
                  key={skill.tool_id}
                  className="p-3 bg-zinc-900/50 border border-white/5 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-300">{skill.name}</span>
                    <span className="text-[9px] text-zinc-600 font-mono">
                      {skill.tool_id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface LinkedToolkitInfoProps {
  toolkitId: string;
}

function LinkedToolkitInfo({ toolkitId }: LinkedToolkitInfoProps) {
  const { toolkits } = useToolkitStore();
  const toolkit = toolkits.find((t) => t.id === toolkitId);

  if (!toolkit) {
    return (
      <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded">
        <p className="text-xs text-rose-400">关联的工具集不存在</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-900/50 border border-white/5 rounded space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-zinc-300">{toolkit.name}</h4>
        <span className="text-[9px] text-emerald-400">已关联</span>
      </div>
      {toolkit.description && (
        <p className="text-[10px] text-zinc-500">{toolkit.description}</p>
      )}
      <div className="flex items-center gap-3 text-[9px] text-zinc-600">
        <span>{toolkit.tools.length} 个工具</span>
        <span>•</span>
        <span className="font-mono">{toolkit.version}</span>
      </div>
      <div className="pt-2 border-t border-white/5">
        <p className="text-[9px] text-zinc-600 mb-2">工具序列:</p>
        <div className="space-y-1">
          {toolkit.tools.map((tool, index) => (
            <div
              key={tool.tool_id}
              className="flex items-center gap-2 text-[10px]"
            >
              <span className="w-4 h-4 rounded bg-zinc-800 flex items-center justify-center text-zinc-600">
                {index + 1}
              </span>
              <span className="text-zinc-400">{tool.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface QuickInfoPanelProps {
  blueprint: Blueprint | null;
}

function QuickInfoPanel({ blueprint }: QuickInfoPanelProps) {
  const { removeBlueprint } = useBlueprintStore();
  const { toolkits } = useToolkitStore();

  if (!blueprint) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-xs text-zinc-600">选择一个蓝图</p>
      </div>
    );
  }

  const linkedToolkit = blueprint.toolkitId
    ? toolkits.find((t) => t.id === blueprint.toolkitId)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Blueprint Info */}
      <div className="p-4 border-b border-white/5">
        <h3 className="text-sm font-medium text-zinc-200 mb-3">蓝图信息</h3>
        <div className="space-y-2 text-[10px]">
          <div className="flex justify-between">
            <span className="text-zinc-600">ID:</span>
            <span className="font-mono text-zinc-500 truncate max-w-[120px]">
              {blueprint.meta.id}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">版本:</span>
            <span className="font-mono text-zinc-500">
              {blueprint.meta.version}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">工具数:</span>
            <span className="text-zinc-500">{blueprint.skills.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">Rule Book:</span>
            <span
              className={
                blueprint.rules && blueprint.rules.trim().length > 20
                  ? 'text-emerald-400'
                  : 'text-zinc-600'
              }
            >
              {blueprint.rules && blueprint.rules.trim().length > 20
                ? '已配置'
                : '未配置'}
            </span>
          </div>
          {linkedToolkit && (
            <div className="flex justify-between">
              <span className="text-zinc-600">工具集:</span>
              <span className="text-violet-400 truncate max-w-[100px]">
                {linkedToolkit.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Export/Import - TODO */}
      <div className="p-4 border-b border-white/5 space-y-2">
        <button
          onClick={() => {
            /* TODO: Export */
          }}
          className="w-full h-8 flex items-center justify-center gap-2 bg-zinc-900/80 border border-white/5 rounded text-xs text-zinc-400 hover:text-zinc-300 hover:border-white/10 transition-colors"
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
          导出蓝图
        </button>
        <button
          onClick={() => {
            /* TODO: Import */
          }}
          className="w-full h-8 flex items-center justify-center gap-2 bg-zinc-900/80 border border-white/5 rounded text-xs text-zinc-400 hover:text-zinc-300 hover:border-white/10 transition-colors"
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
          导入蓝图
        </button>
      </div>

      {/* Delete */}
      {blueprint.meta.id && (
        <div className="p-4 mt-auto">
          <button
            onClick={() => {
              if (confirm(`确定要删除蓝图"${blueprint.meta.name}"吗？`)) {
                removeBlueprint(blueprint.meta.id!);
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
            删除蓝图
          </button>
        </div>
      )}
    </div>
  );
}
