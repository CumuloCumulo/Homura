/**
 * =============================================================================
 * Homura Dashboard - Toolkit Editor
 * =============================================================================
 *
 * Main editor for toolkit orchestration
 * - Mindful Interaction: Collapsible sidebar, progressive disclosure
 * - Space Efficiency: Maximize editing area
 */

import React, { useEffect, useState } from 'react';
import { useToolkitStore } from '../../stores/toolkitStore';
import { useToolStore } from '../../stores/toolStore';
import { ToolkitLibrary } from './ToolkitLibrary';
import { ToolkitSequencePanel } from './ToolkitSequencePanel';
import { ToolDetailEditor } from './ToolDetailEditor';
import { LightweightTestPanel } from './LightweightTestPanel';
import { ViewButton } from '../ui';
import { ActionIcon } from '@shared/components';
import type { AtomicTool } from '@homura/sdk/types';
import { sendToolkitToSidePanel } from '@dashboard/utils/toolkitOperations';

type EditorView = 'sequence' | 'detail' | 'test';

export function ToolkitEditor() {
  const { selectedToolkit, loadToolkits } = useToolkitStore();
  const [selectedTool, setSelectedTool] = React.useState<AtomicTool | null>(
    null,
  );
  const [editorView, setEditorView] = React.useState<EditorView>('sequence');
  const [isLibraryCollapsed, setIsLibraryCollapsed] = React.useState(false);

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
      {/* Left: Toolkit Library (Collapsible) */}
      <aside
        className={`shrink-0 border-r border-white/5 overflow-hidden transition-all duration-300 ease-in-out ${
          isLibraryCollapsed ? 'w-12' : 'w-72'
        }`}
      >
        <ToolkitLibrary
          isCollapsed={isLibraryCollapsed}
          onToggleCollapse={() => setIsLibraryCollapsed(!isLibraryCollapsed)}
        />
      </aside>

      {/* Center: Editor Area + Right Tool Library */}
      <main className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="shrink-0 px-4 py-3 border-b border-white/5 bg-zinc-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-zinc-200">
                  {selectedToolkit?.name || '工具集编辑器'}
                </h2>
                {selectedToolkit?.description && (
                  <p className="text-[10px] text-zinc-500 hidden sm:block">
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

          {/* Quick Actions Bar (Bottom) - Progressive Disclosure */}
          {editorView === 'sequence' && selectedToolkit && (
            <QuickActionsBar toolkitId={selectedToolkit.id} />
          )}
        </div>

        {/* Right: Tool Library Panel (仅在序列视图显示) */}
        {editorView === 'sequence' && <ToolLibraryPanel />}
      </main>
    </div>
  );
}

interface QuickActionsBarProps {
  toolkitId: string;
}

/**
 * Quick Actions Bar - 底部操作栏
 * 渐进式披露：默认只显示主要操作，展开后显示更多
 */
function QuickActionsBar({ toolkitId }: QuickActionsBarProps) {
  const { removeToolkit, getToolkitById, updateToolkit } = useToolkitStore();
  const [sendStatus, setSendStatus] = useState<
    'idle' | 'sending' | 'success' | 'error'
  >('idle');
  const [sendError, setSendError] = useState<string | null>(null);
  const [showEditMeta, setShowEditMeta] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingDesc, setEditingDesc] = useState('');
  const toolkit = getToolkitById(toolkitId);

  // Sync name/desc when toolkit changes
  useEffect(() => {
    if (toolkit) {
      setEditingName(toolkit.name || '');
      setEditingDesc(toolkit.description || '');
    }
  }, [toolkit]);

  const handleSaveMeta = async () => {
    await updateToolkit(toolkitId, {
      name: editingName,
      description: editingDesc,
    });
    setShowEditMeta(false);
  };

  const handleSendToSidePanel = async () => {
    const tk = getToolkitById(toolkitId);
    if (!tk) {
      setSendError('找不到工具集');
      setSendStatus('error');
      return;
    }

    if (tk.tools.length === 0) {
      setSendError('工具集没有包含任何工具');
      setSendStatus('error');
      return;
    }

    setSendStatus('sending');
    setSendError(null);

    try {
      await sendToolkitToSidePanel(tk);
      setSendStatus('success');
      setTimeout(() => setSendStatus('idle'), 2000);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : '发送失败');
      setSendStatus('error');
    }
  };

  const handleDeleteToolkit = () => {
    if (confirm('确定要删除这个工具集吗？')) {
      removeToolkit(toolkitId);
    }
  };

  return (
    <div className="border-t border-white/5 bg-zinc-900/50">
      {/* Compact Mode - Default */}
      {!showEditMeta && (
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Left: Toolkit Info (Editable) */}
            <div
              className="flex-1 min-w-0 cursor-pointer hover:bg-zinc-800/50 px-2 py-1 rounded transition-colors"
              onClick={() => setShowEditMeta(true)}
            >
              <h4 className="text-xs font-medium text-zinc-300 truncate">
                {toolkit?.name || '未命名工具集'}
              </h4>
              <p className="text-[9px] text-zinc-600 truncate">
                {toolkit?.tools.length || 0} 个工具
                {toolkit?.description && ` • ${toolkit.description}`}
              </p>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Send Button */}
              <button
                onClick={handleSendToSidePanel}
                disabled={sendStatus === 'sending'}
                className={`
                  h-8 px-4 flex items-center gap-1.5 rounded text-xs font-medium transition-all duration-200
                  ${
                    sendStatus === 'success'
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                      : sendStatus === 'error'
                        ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400'
                        : 'bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20'
                  }
                  ${sendStatus === 'sending' ? 'opacity-70 cursor-wait' : ''}
                `}
              >
                {sendStatus === 'sending' ? (
                  <>
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>发送中</span>
                  </>
                ) : sendStatus === 'success' ? (
                  <>
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>已发送</span>
                  </>
                ) : (
                  <>
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span>发送到 SidePanel</span>
                  </>
                )}
              </button>

              {/* More Actions */}
              <div className="relative group">
                <button className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded transition-colors">
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
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                    />
                  </svg>
                </button>
                {/* Dropdown Menu */}
                <div className="absolute right-0 bottom-full mb-1 w-40 bg-zinc-900 border border-white/10 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button
                    onClick={() => setShowEditMeta(true)}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors rounded-t-lg"
                  >
                    编辑信息
                  </button>
                  <button
                    onClick={handleDeleteToolkit}
                    className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 transition-colors rounded-b-lg"
                  >
                    删除工具集
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {sendStatus === 'error' && sendError && (
            <p className="text-[9px] text-rose-400 mt-2 text-center">
              {sendError}
            </p>
          )}
        </div>
      )}

      {/* Edit Meta Mode */}
      {showEditMeta && (
        <div className="px-4 py-3">
          <div className="space-y-2">
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              placeholder="工具集名称"
              className="w-full h-8 px-3 text-xs bg-zinc-900/80 border border-white/5 rounded text-zinc-300 focus:border-violet-500/30 focus:outline-none"
              autoFocus
            />
            <input
              type="text"
              value={editingDesc}
              onChange={(e) => setEditingDesc(e.target.value)}
              placeholder="描述（可选）"
              className="w-full h-8 px-3 text-xs bg-zinc-900/80 border border-white/5 rounded text-zinc-300 focus:border-violet-500/30 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowEditMeta(false);
                  setEditingName(toolkit?.name || '');
                  setEditingDesc(toolkit?.description || '');
                }}
                className="h-7 px-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveMeta}
                className="h-7 px-3 bg-violet-500/10 border border-violet-500/20 rounded text-xs text-violet-400 hover:bg-violet-500/20 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TOOL LIBRARY PANEL (Right Side)
// =============================================================================

type ToolTab = 'recorded' | 'saved';

/**
 * 工具库面板 - 显示可用的工具列表
 * 显示在编辑器右侧，支持搜索和添加工具
 * 支持按来源分类：最近录制 | 长期保存
 */
function ToolLibraryPanel() {
  const { tools, removeTool, saveTool } = useToolStore();
  const { selectedToolkit, addTool } = useToolkitStore();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<ToolTab>('recorded');

  // Filter tools by tab and search query
  const filteredTools = React.useMemo(() => {
    let tabFiltered = tools;
    if (activeTab === 'recorded') {
      tabFiltered = tools.filter((tool) => tool.source === 'recorded');
    } else {
      // 'saved' tab: manual + imported (excluding recorded)
      tabFiltered = tools.filter((tool) => tool.source !== 'recorded');
    }

    if (!searchQuery.trim()) {
      return tabFiltered;
    }
    const query = searchQuery.toLowerCase();
    return tabFiltered.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description?.toLowerCase().includes(query) ||
        tool.tool_id.toLowerCase().includes(query),
    );
  }, [tools, searchQuery, activeTab]);

  // Count tools per tab
  const recordedCount = tools.filter((t) => t.source === 'recorded').length;
  const savedCount = tools.filter((t) => t.source !== 'recorded').length;

  const handleAddTool = (tool: AtomicTool) => {
    if (!selectedToolkit) return;
    addTool(selectedToolkit.id, { ...tool });
  };

  const handleRemoveTool = (toolId: string) => {
    if (confirm('确定要删除这个工具吗？')) {
      removeTool(toolId);
    }
  };

  const handleSaveTool = (toolId: string) => {
    saveTool(toolId);
  };

  return (
    <aside className="w-64 shrink-0 border-l border-white/5 bg-zinc-900/30 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-white/5">
        <h3 className="text-xs font-semibold text-zinc-300 mb-2">工具库</h3>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 mb-2">
          <ToolTabButton
            tab="recorded"
            activeTab={activeTab}
            onClick={() => setActiveTab('recorded')}
            count={recordedCount}
            icon={<RecordedIcon />}
          >
            最近录制
          </ToolTabButton>
          <ToolTabButton
            tab="saved"
            activeTab={activeTab}
            onClick={() => setActiveTab('saved')}
            count={savedCount}
            icon={<SavedIcon />}
          >
            长期保存
          </ToolTabButton>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="搜索工具..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-7 pl-7 pr-2 text-[10px] bg-zinc-900/80 border border-white/5 rounded text-zinc-300 placeholder:text-zinc-600 focus:border-violet-500/30 focus:outline-none transition-colors"
          />
          <svg
            className="absolute left-2 top-1.5 w-3 h-3 text-zinc-500"
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

      {/* Tool List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredTools.length === 0 ? (
          <EmptyState searchQuery={searchQuery} activeTab={activeTab} />
        ) : (
          <div className="space-y-1.5">
            {filteredTools.map((tool) => (
              <ToolLibraryCard
                key={tool.tool_id}
                tool={tool}
                onAdd={handleAddTool}
                onRemove={handleRemoveTool}
                onSave={handleSaveTool}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-white/5 text-center">
        <p className="text-[9px] text-zinc-600">
          共 {tools.length} 个工具
          {searchQuery && ` (显示 ${filteredTools.length} 个)`}
        </p>
      </div>
    </aside>
  );
}

// =============================================================================
// TOOL LIBRARY CARD
// =============================================================================

interface ToolLibraryCardProps {
  tool: AtomicTool;
  onAdd: (tool: AtomicTool) => void;
  onRemove: (toolId: string) => void;
  onSave: (toolId: string) => void;
}

function ToolLibraryCard({
  tool,
  onAdd,
  onRemove,
  onSave,
}: ToolLibraryCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const isRecorded = tool.source === 'recorded';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative p-2 rounded bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all"
    >
      <div className="flex items-start gap-2">
        {/* Icon */}
        <ActionIcon
          action={tool.selector_logic.target.action}
          className="shrink-0 w-7 h-7 rounded bg-zinc-800 flex items-center justify-center text-[10px]"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-[10px] font-medium text-zinc-300 truncate">
            {tool.name}
          </h4>
          {tool.description && (
            <p className="text-[9px] text-zinc-600 truncate mt-0.5">
              {tool.description}
            </p>
          )}
          <code className="block text-[8px] font-mono text-zinc-700 truncate mt-1">
            {tool.selector_logic.target.selector}
          </code>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Save button (only for recorded tools) */}
          {isRecorded && (
            <button
              onClick={() => onSave(tool.tool_id)}
              className="shrink-0 p-1 text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors"
              title="保存到长期库"
            >
              <BookmarkIcon />
            </button>
          )}

          <button
            onClick={() => onAdd(tool)}
            className="shrink-0 p-1 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
            title="添加到当前工具集"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>

          {/* Delete button (only show on hover) */}
          <button
            onClick={() => onRemove(tool.tool_id)}
            className={`shrink-0 p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            title="删除工具"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TAB BUTTON COMPONENT
// =============================================================================

interface ToolTabButtonProps {
  tab: ToolTab;
  activeTab: ToolTab;
  onClick: () => void;
  count: number;
  icon: React.ReactNode;
  children: string;
}

function ToolTabButton({
  tab,
  activeTab,
  onClick,
  count,
  icon,
  children,
}: ToolTabButtonProps) {
  const isActive = activeTab === tab;

  return (
    <button
      onClick={onClick}
      className={`
        flex-1 h-7 flex items-center justify-center gap-1.5 px-2 rounded text-[10px] font-medium transition-all duration-200
        ${
          isActive
            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
            : 'text-zinc-500 hover:text-zinc-400 hover:bg-white/5'
        }
      `}
    >
      {icon}
      <span>{children}</span>
      <span
        className={`text-[8px] px-1 rounded ${isActive ? 'bg-violet-500/30' : 'bg-white/5'}`}
      >
        {count}
      </span>
    </button>
  );
}

// =============================================================================
// ICON COMPONENTS
// =============================================================================

function RecordedIcon() {
  return (
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
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function SavedIcon() {
  return (
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
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  );
}

function BookmarkIcon() {
  return (
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
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  );
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

interface EmptyStateProps {
  searchQuery: string;
  activeTab: ToolTab;
}

function EmptyState({ searchQuery, activeTab }: EmptyStateProps) {
  const config =
    activeTab === 'recorded'
      ? {
          icon: <RecordedIcon />,
          title: searchQuery ? '没有找到匹配的工具' : '暂无录制工具',
          subtitle: searchQuery
            ? undefined
            : '在 SidePanel 录制操作后会自动添加',
        }
      : {
          icon: <SavedIcon />,
          title: searchQuery ? '没有找到匹配的工具' : '暂无保存工具',
          subtitle: searchQuery
            ? undefined
            : '点击「最近录制」中的「保存」按钮添加',
        };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-8">
      <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-2 text-zinc-600">
        {config.icon}
      </div>
      <p className="text-[10px] text-zinc-500">{config.title}</p>
      {config.subtitle && (
        <p className="text-[9px] text-zinc-600 mt-1">{config.subtitle}</p>
      )}
    </div>
  );
}
