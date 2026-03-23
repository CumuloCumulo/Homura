/**
 * =============================================================================
 * Homura Dashboard - Tool Detail Editor
 * =============================================================================
 *
 * Panel for editing tool parameters and selector
 */

import { useState, useEffect } from 'react';
import { useToolkitStore } from '../../stores/toolkitStore';
import type { AtomicTool } from '@homura/sdk/types';

interface ToolDetailEditorProps {
  toolkitId: string | null;
  tool: AtomicTool | null;
}

export function ToolDetailEditor({ toolkitId, tool }: ToolDetailEditorProps) {
  const { updateTool } = useToolkitStore();
  const [editingTool, setEditingTool] = useState<AtomicTool | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditingTool(tool ? { ...tool } : null);
    setHasChanges(false);
  }, [tool]);

  const handleSave = async () => {
    if (!editingTool || !toolkitId) return;
    await updateTool(toolkitId, editingTool.tool_id, {
      name: editingTool.name,
      description: editingTool.description,
      parameters: editingTool.parameters,
      selector_logic: editingTool.selector_logic,
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    setEditingTool(tool ? { ...tool } : null);
    setHasChanges(false);
  };

  const handleParameterChange = (key: string, value: string) => {
    if (!editingTool) return;
    setEditingTool({
      ...editingTool,
      parameters: {
        ...editingTool.parameters,
        [key]: {
          ...editingTool.parameters[key],
          default: value,
        },
      },
    });
    setHasChanges(true);
  };

  const handleSelectorChange = (selector: string) => {
    if (!editingTool) return;
    setEditingTool({
      ...editingTool,
      selector_logic: {
        ...editingTool.selector_logic,
        target: {
          ...editingTool.selector_logic.target,
          selector,
        },
      },
    });
    setHasChanges(true);
  };

  if (!editingTool) {
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
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </div>
        <p className="text-sm text-zinc-400">选择一个工具进行编辑</p>
        <p className="text-xs text-zinc-600 mt-1">点击工具序列中的工具</p>
      </div>
    );
  }

  const action = editingTool.selector_logic.target.action;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-zinc-800 text-zinc-500">
                {action}
              </span>
              <span className="text-sm font-medium text-zinc-200">
                {editingTool.name}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              ID: {editingTool.tool_id}
            </p>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition-colors"
              >
                重置
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-xs bg-violet-500/20 text-violet-400 rounded hover:bg-violet-500/30 transition-colors"
              >
                保存
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Basic Info */}
        <Section title="基本信息">
          <FormField
            label="工具名称"
            value={editingTool.name}
            onChange={(value) => {
              setEditingTool({ ...editingTool, name: value });
              setHasChanges(true);
            }}
          />
          <FormField
            label="描述"
            value={editingTool.description || ''}
            onChange={(value) => {
              setEditingTool({ ...editingTool, description: value });
              setHasChanges(true);
            }}
            textarea
          />
        </Section>

        {/* Selector */}
        <Section title="选择器">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-zinc-500 mb-1.5 block">
                目标选择器
              </label>
              <input
                type="text"
                value={editingTool.selector_logic.target.selector}
                onChange={(e) => handleSelectorChange(e.target.value)}
                className="w-full h-8 px-3 text-xs bg-zinc-900/80 border border-white/5 rounded text-zinc-300 font-mono focus:border-violet-500/30 focus:outline-none"
              />
            </div>
            <div className="p-3 bg-zinc-900/50 rounded border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-500">
                  作用域 (Scope)
                </span>
                {editingTool.selector_logic.scope && (
                  <span className="text-[9px] text-violet-400">已设置</span>
                )}
              </div>
              {editingTool.selector_logic.scope && (
                <div className="text-[10px] text-zinc-600 font-mono truncate">
                  {editingTool.selector_logic.scope.selector}
                </div>
              )}
            </div>
            {editingTool.selector_logic.anchor && (
              <div className="p-3 bg-zinc-900/50 rounded border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-zinc-500">
                    锚点 (Anchor)
                  </span>
                  <span className="text-[9px] text-emerald-400">
                    {editingTool.selector_logic.anchor.matchMode || 'exact'}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-600 font-mono truncate">
                  {editingTool.selector_logic.anchor.value}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Parameters */}
        <Section title="参数">
          {Object.keys(editingTool.parameters).length === 0 ? (
            <div className="text-center py-6 text-zinc-600 text-xs">
              此工具没有参数
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(editingTool.parameters).map(([key, param]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-zinc-400 font-mono">{`{{${key}}}`}</label>
                    <span
                      className={`text-[9px] ${param.required ? 'text-rose-400' : 'text-zinc-600'}`}
                    >
                      {param.required ? '必需' : '可选'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={String(param.default ?? '')}
                    placeholder={param.description || '默认值'}
                    onChange={(e) => handleParameterChange(key, e.target.value)}
                    className="w-full h-8 px-3 text-xs bg-zinc-900/80 border border-white/5 rounded text-zinc-300 focus:border-violet-500/30 focus:outline-none"
                  />
                  {param.description && (
                    <p className="text-[9px] text-zinc-600 mt-1">
                      {param.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div>
      <h4 className="text-xs font-medium text-zinc-300 mb-3 flex items-center gap-2">
        <span className="w-1 h-3 bg-violet-500 rounded"></span>
        {title}
      </h4>
      {children}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
}

function FormField({ label, value, onChange, textarea }: FormFieldProps) {
  return (
    <div>
      <label className="text-[10px] text-zinc-500 mb-1.5 block">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-xs bg-zinc-900/80 border border-white/5 rounded text-zinc-300 focus:border-violet-500/30 focus:outline-none resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-8 px-3 text-xs bg-zinc-900/80 border border-white/5 rounded text-zinc-300 focus:border-violet-500/30 focus:outline-none"
        />
      )}
    </div>
  );
}
