/**
 * =============================================================================
 * Homura SidePanel - Recording Panel (Enhanced)
 * =============================================================================
 * 
 * Features:
 * - Delete recorded actions
 * - Editable name/description for each action
 * - Reorder actions (up/down)
 * - Expandable selector configuration (Scope + Anchor + Target)
 * - Inline selector editing
 * 
 * Design: Following UI-DESIGN.md principles
 * - Progressive disclosure (collapsed by default)
 * - Space efficient (compact padding, small text)
 * - Calm interface (gentle animations)
 */

import React from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { useRecordingStore } from '../stores/recordingStore';
import { sendToContentScript } from '../utils/ensureContentScript';
import type { RecordedAction, SelectorDraft, ElementAnalysis, AnchorCandidate } from '@shared/selectorBuilder';
import type { UnifiedSelector } from '@shared/types';
import { QuickActionPanel } from './QuickActionPanel';

// =============================================================================
// ICONS
// =============================================================================

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg 
    className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} 
    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const DragHandleIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
  </svg>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RecordingPanel() {
  const { 
    isRecording, 
    setRecording, 
    recordedActions, 
    clearRecordedActions,
    setRecordedActions,
    deleteRecordedAction,
    updateRecordedAction,
    addLog,
    isProcessing,
    setProcessing
  } = useRecordingStore();

  // Restore recording state on mount (e.g., when sidepanel reopens)
  React.useEffect(() => {
    const checkRecordingState = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' });
        if (response?.state?.isRecording && !isRecording) {
          setRecording(true);
          addLog({
            timestamp: Date.now(),
            level: 'info',
            message: '已恢复录制状态',
          });
        }
      } catch (error) {
        console.log('[Homura] Could not check recording state:', error);
      }
    };
    checkRecordingState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const handleStartRecording = async () => {
    try {
      // Get current tab ID for cross-page tracking
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab');
      
      // Notify background to track recording state (enables cross-page recording)
      await chrome.runtime.sendMessage({ 
        type: 'SET_RECORDING_STATE', 
        payload: { isRecording: true, tabId: tab.id } 
      });
      
      // Start recording in content script
      await sendToContentScript({ type: 'START_RECORDING' });
      setRecording(true);
      clearRecordedActions();
      addLog({
        timestamp: Date.now(),
        level: 'info',
        message: '开始录制（支持跨页面）',
      });
    } catch (error) {
      addLog({
        timestamp: Date.now(),
        level: 'error',
        message: `启动录制失败: ${error}`,
      });
    }
  };

  const handleStopRecording = async () => {
    try {
      // Stop tracking in background
      await chrome.runtime.sendMessage({ 
        type: 'SET_RECORDING_STATE', 
        payload: { isRecording: false } 
      });
      
      await sendToContentScript({ type: 'STOP_RECORDING' });
      setRecording(false);
      addLog({
        timestamp: Date.now(),
        level: 'info',
        message: `录制结束，共 ${recordedActions.length} 个操作`,
      });
    } catch (error) {
      console.error('Stop recording error:', error);
      // Ensure background state is cleared even if content script fails
      try {
        await chrome.runtime.sendMessage({ 
          type: 'SET_RECORDING_STATE', 
          payload: { isRecording: false } 
        });
      } catch {}
      setRecording(false);
    }
  };

  const handleGenerateTool = async () => {
    if (recordedActions.length === 0) {
      addLog({
        timestamp: Date.now(),
        level: 'error',
        message: '没有可用的录制操作',
      });
      return;
    }

    setProcessing(true);
    addLog({
      timestamp: Date.now(),
      level: 'info',
      message: '正在使用 AI 生成工具...',
    });

    try {
      const result = await sendToContentScript<{ success: boolean; tool?: { name: string }; error?: string }>({
        type: 'AI_GENERATE_TOOL',
        payload: { actions: recordedActions },
      });

      if (result.success && result.tool) {
        addLog({
          timestamp: Date.now(),
          level: 'info',
          message: `工具生成成功: ${result.tool.name}`,
        });
      } else {
        addLog({
          timestamp: Date.now(),
          level: 'error',
          message: `生成失败: ${result.error}`,
        });
      }
    } catch (error) {
      addLog({
        timestamp: Date.now(),
        level: 'error',
        message: `AI 请求失败: ${error}`,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Control Panel */}
      <div className="p-3 border-b border-white/5">
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            className="
              w-full h-10 flex items-center justify-center gap-2
              bg-rose-600/80 rounded-lg text-sm font-medium text-white
              hover:bg-rose-500 hover:shadow-lg
              transition-all duration-200
            "
          >
            <div className="w-3 h-3 rounded-full bg-white" />
            <span>开始录制</span>
          </button>
        ) : (
          <button
            onClick={handleStopRecording}
            className="
              w-full h-10 flex items-center justify-center gap-2
              bg-zinc-800 border border-rose-500/30 rounded-lg 
              text-sm font-medium text-rose-400
              hover:bg-rose-500/10
              transition-all duration-200
            "
          >
            <div className="w-3 h-3 rounded bg-rose-500 animate-pulse" />
            <span>停止录制</span>
          </button>
        )}
      </div>

      {/* Recorded Actions */}
      <ActionList 
        actions={recordedActions}
        isRecording={isRecording}
        onDelete={deleteRecordedAction}
        onUpdate={updateRecordedAction}
        onReorder={setRecordedActions}
        onLog={addLog}
      />

      {/* Generate Button */}
      {recordedActions.length > 0 && !isRecording && (
        <div className="p-3 border-t border-white/5">
          <button
            onClick={handleGenerateTool}
            disabled={isProcessing}
            className="
              w-full h-9 flex items-center justify-center gap-2
              bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 
              rounded-lg text-xs font-medium text-white
              hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-neon
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
          >
            {isProcessing ? (
              <>
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                <span>AI 生成中...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>AI 生成工具</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ACTION LIST - Container with Framer Motion Reorder
// =============================================================================

interface ActionListProps {
  actions: RecordedAction[];
  isRecording: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<RecordedAction>) => void;
  onReorder: (actions: RecordedAction[]) => void;
  onLog: (log: { timestamp: number; level: 'info' | 'error'; message: string }) => void;
}

function ActionList({ actions, isRecording, onDelete, onUpdate, onReorder, onLog }: ActionListProps) {
  if (actions.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-3">
        <EmptyState isRecording={isRecording} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <Reorder.Group
        axis="y"
        values={actions}
        onReorder={onReorder}
        className="space-y-2"
      >
        {actions.map((action, index) => (
          <ReorderableActionCard
            key={action.id}
            action={action}
            index={index}
            onDelete={() => onDelete(action.id)}
            onUpdate={(updates) => onUpdate(action.id, updates)}
            onLog={onLog}
          />
        ))}
      </Reorder.Group>
    </div>
  );
}

// =============================================================================
// REORDERABLE ACTION CARD - Wrapper with Framer Motion Reorder.Item
// =============================================================================

interface ReorderableActionCardProps {
  action: RecordedAction;
  index: number;
  onDelete: () => void;
  onUpdate: (updates: Partial<RecordedAction>) => void;
  onLog: (log: { timestamp: number; level: 'info' | 'error'; message: string }) => void;
}

function ReorderableActionCard({ action, index, onDelete, onUpdate, onLog }: ReorderableActionCardProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={action}
      dragListener={false}
      dragControls={dragControls}
      layout
      layoutId={action.id}
      className="list-none"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ 
        layout: { duration: 0.2, ease: 'easeOut' },
        opacity: { duration: 0.15 },
        scale: { duration: 0.15 },
      }}
      whileDrag={{ 
        scale: 1.02, 
        boxShadow: '0 10px 30px -10px rgba(139, 92, 246, 0.3)',
        zIndex: 50,
        cursor: 'grabbing',
      }}
      dragElastic={0}
    >
      <ActionCard
        action={action}
        index={index}
        onDelete={onDelete}
        onUpdate={onUpdate}
        onLog={onLog}
        dragControls={dragControls}
      />
    </Reorder.Item>
  );
}

// =============================================================================
// ACTION CARD - Expandable card with full selector editing
// =============================================================================

interface ActionCardProps {
  action: RecordedAction;
  index: number;
  onDelete: () => void;
  onUpdate: (updates: Partial<RecordedAction>) => void;
  onLog: (log: { timestamp: number; level: 'info' | 'error'; message: string }) => void;
  dragControls: ReturnType<typeof useDragControls>;
}

const actionIcons: Record<string, string> = {
  click: '👆',
  input: '⌨️',
  select: '📋',
  scroll: '📜',
};

/** Get default action name based on type (stable, doesn't change on reorder) */
function getDefaultActionName(type: string): string {
  const names: Record<string, string> = {
    click: '点击',
    input: '输入',
    select: '选择',
    scroll: '滚动',
  };
  return names[type] || '操作';
}

function ActionCard({ 
  action, 
  index, 
  onDelete, 
  onUpdate,
  onLog,
  dragControls,
}: ActionCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isEditingName, setIsEditingName] = React.useState(false);
  
  // Default name based on action type (not index, so it doesn't change on reorder)
  const defaultName = getDefaultActionName(action.type);
  const [localName, setLocalName] = React.useState(action.name || defaultName);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync local name when action.name changes
  React.useEffect(() => {
    setLocalName(action.name || defaultName);
  }, [action.name, defaultName]);

  // Focus input when editing starts
  React.useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameSubmit = () => {
    const trimmedName = localName.trim();
    if (trimmedName && trimmedName !== action.name) {
      onUpdate({ name: trimmedName });
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setLocalName(action.name || defaultName);
      setIsEditingName(false);
    }
  };

  return (
    <div 
      className={`
        group rounded-lg overflow-hidden
        ${isExpanded 
          ? 'bg-zinc-800/60 border border-violet-500/20 shadow-[0_0_15px_-3px_rgba(139,92,246,0.15)]' 
          : 'bg-zinc-900/50 border border-white/5 hover:border-white/10'
        }
      `}
    >
      {/* Header - Always visible */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag Handle - triggers Framer Motion drag */}
        <div 
          className="shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-1 text-zinc-600 hover:text-zinc-400 transition-colors touch-none select-none"
          title="拖拽排序"
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
        >
          <DragHandleIcon />
        </div>

        {/* Icon */}
        <span className={`
          shrink-0 w-6 h-6 flex items-center justify-center rounded text-xs
          transition-colors duration-200
          ${isExpanded ? 'bg-violet-500/20' : 'bg-zinc-800'}
        `}>
          {actionIcons[action.type] || '•'}
        </span>

        {/* Name - Editable */}
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <input
              ref={inputRef}
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleKeyDown}
              className="
                w-full h-6 px-1.5 text-xs font-medium
                bg-black/30 border border-violet-500/30 rounded
                text-zinc-200 focus:outline-none focus:border-violet-500/50
              "
            />
          ) : (
            <div 
              className="flex items-center gap-1.5 cursor-pointer group/name"
              onClick={() => setIsEditingName(true)}
            >
              <span className="text-xs font-medium text-zinc-300 truncate">
                {localName}
              </span>
              <span className="text-zinc-600 opacity-0 group-hover/name:opacity-100 transition-opacity">
                <EditIcon />
              </span>
            </div>
          )}
          <code className="block text-[9px] font-mono text-zinc-600 truncate mt-0.5">
            {action.elementAnalysis.minimalSelector}
          </code>
        </div>

        {/* Action Badge */}
        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-amber-400/80 uppercase">
          {action.type}
        </span>

        {/* Expand Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="shrink-0 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          title={isExpanded ? '收起' : '展开选择器配置'}
        >
          <ChevronIcon expanded={isExpanded} />
        </button>

        {/* Delete Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 p-1 text-zinc-600 hover:text-rose-400 transition-colors"
          title="删除"
        >
          <DeleteIcon />
        </button>

        {/* Index Badge */}
        <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-zinc-800 text-[9px] text-zinc-500">
          {index + 1}
        </span>
      </div>

      {/* Expanded Content - Selector Configuration + Quick Actions */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 space-y-2.5 animate-fade-in border-t border-white/5">
          {/* Input Value (if applicable) */}
          {action.value && (
            <div className="flex items-center gap-2 text-[10px] p-2 rounded bg-violet-500/5 border border-violet-500/10">
              <span className="text-zinc-500">输入值:</span>
              <code className="text-violet-400 font-mono">"{action.value}"</code>
            </div>
          )}

          {/* Quick Action Panel - Test recorded action */}
          <QuickActionPanel
            analysis={action.elementAnalysis}
            selectorDraft={action.selectorDraft}
            unifiedSelector={action.unifiedSelector}
            onLog={onLog}
            compact
          />

          {/* Selector Logic Editor */}
          <SelectorEditor 
            analysis={action.elementAnalysis}
            draft={action.selectorDraft}
            unifiedSelector={action.unifiedSelector}
            onChange={(draft) => onUpdate({ selectorDraft: draft })}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SELECTOR EDITOR - Inline Scope + Anchor + Target editor
// =============================================================================

interface SelectorEditorProps {
  analysis: ElementAnalysis;
  draft?: SelectorDraft;
  unifiedSelector?: UnifiedSelector;
  onChange: (draft: SelectorDraft) => void;
}

function SelectorEditor({ analysis, draft, unifiedSelector, onChange }: SelectorEditorProps) {
  // Initialize draft from UnifiedSelector, existing draft, or analysis
  const [localDraft, setLocalDraft] = React.useState<SelectorDraft>(() => {
    if (draft) return draft;
    
    // If we have a UnifiedSelector with structureData, use it
    if (unifiedSelector?.structureData) {
      const { scope, anchor, target } = unifiedSelector.structureData;
      return {
        scope: {
          selector: scope.selector,
          type: 'container_list',
          matchCount: 0,
        },
        anchor: anchor ? {
          selector: anchor.selector,
          type: 'text_match' as const, // Use SelectorDraft anchor type
          value: anchor.value || '',
          matchMode: anchor.matchMode || 'contains',
        } : undefined,
        target: {
          selector: target.selector,
          action: 'CLICK',
        },
        confidence: unifiedSelector.confidence,
        validated: false,
      };
    }
    
    // If UnifiedSelector has pathData, create minimal draft
    if (unifiedSelector?.pathData) {
      return {
        target: {
          selector: unifiedSelector.fullSelector,
          action: 'CLICK',
        },
        confidence: unifiedSelector.confidence,
        validated: false,
      };
    }
    
    // Build initial draft from element analysis
    // Note: Use serializable fields (containerSelector, containerTagName) 
    // because HTMLElement objects cannot be serialized through Chrome messaging
    const firstAnchor = analysis.anchorCandidates?.[0];
    const hasContainer = analysis.containerSelector || analysis.containerTagName;
    
    return {
      scope: hasContainer ? {
        selector: analysis.containerSelector || analysis.containerTagName || '',
        type: 'container_list',
        matchCount: 0,
      } : undefined,
      anchor: firstAnchor ? {
        selector: firstAnchor.selector,
        type: firstAnchor.type,
        value: firstAnchor.text || firstAnchor.attribute?.value || '',
        matchMode: 'contains' as const,
      } : undefined,
      target: {
        selector: analysis.relativeSelector || analysis.minimalSelector,
        action: 'CLICK',
      },
      confidence: 0.8,
      validated: false,
    };
  });

  // Notify parent of changes
  const handleDraftChange = React.useCallback((newDraft: SelectorDraft) => {
    setLocalDraft(newDraft);
    onChange(newDraft);
  }, [onChange]);

  const handleApplyAnchor = (candidate: AnchorCandidate) => {
    handleDraftChange({
      ...localDraft,
      anchor: {
        selector: candidate.selector,
        type: candidate.type,
        value: candidate.text || candidate.attribute?.value || '',
        matchMode: 'contains' as const,
      },
    });
  };

  return (
    <div className="space-y-2">
      {/* Scope */}
      {localDraft.scope && (
        <SelectorSection
          label="SCOPE"
          sublabel="容器作用域"
          color="blue"
          value={localDraft.scope.selector}
          onChange={(value) => handleDraftChange({
            ...localDraft,
            scope: { ...localDraft.scope!, selector: value },
          })}
        />
      )}

      {/* Anchor */}
      {localDraft.anchor && (
        <div className="p-2 rounded bg-zinc-900/80 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-medium text-emerald-400">ANCHOR</span>
            <span className="text-[8px] text-zinc-600">定位锚点</span>
          </div>
          <div className="space-y-1.5">
            {/* Selector */}
            <input
              type="text"
              value={localDraft.anchor.selector}
              onChange={(e) => handleDraftChange({
                ...localDraft,
                anchor: { ...localDraft.anchor!, selector: e.target.value },
              })}
              placeholder="选择器"
              className="
                w-full h-6 px-1.5 text-[10px] font-mono
                bg-black/40 border border-zinc-800 rounded
                text-emerald-400 placeholder:text-zinc-700
                focus:border-emerald-500/50 focus:outline-none
                transition-colors
              "
            />
            {/* Value + Match Mode */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={localDraft.anchor.value}
                onChange={(e) => handleDraftChange({
                  ...localDraft,
                  anchor: { ...localDraft.anchor!, value: e.target.value },
                })}
                placeholder="匹配值 (支持 {{变量}})"
                className="
                  flex-1 h-6 px-1.5 text-[10px] font-mono
                  bg-black/40 border border-zinc-800 rounded
                  text-emerald-300 placeholder:text-zinc-700
                  focus:border-emerald-500/50 focus:outline-none
                  transition-colors
                "
              />
              <select
                value={localDraft.anchor.matchMode}
                onChange={(e) => handleDraftChange({
                  ...localDraft,
                  anchor: { ...localDraft.anchor!, matchMode: e.target.value as 'contains' | 'exact' | 'startsWith' | 'endsWith' },
                })}
                className="
                  w-16 h-6 px-1 text-[9px]
                  bg-black/40 border border-zinc-800 rounded
                  text-zinc-400
                  focus:outline-none focus:border-zinc-600
                  transition-colors
                "
              >
                <option value="contains">包含</option>
                <option value="exact">精确</option>
                <option value="startsWith">开头</option>
                <option value="endsWith">结尾</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Target */}
      <SelectorSection
        label="TARGET"
        sublabel="操作目标"
        color="violet"
        value={localDraft.target.selector}
        onChange={(value) => handleDraftChange({
          ...localDraft,
          target: { ...localDraft.target, selector: value },
        })}
      />

      {/* Anchor Candidates */}
      {analysis.anchorCandidates.length > 0 && (
        <div className="pt-1">
          <p className="text-[9px] text-zinc-600 mb-1.5">可用锚点候选:</p>
          <div className="flex flex-wrap gap-1">
            {analysis.anchorCandidates.slice(0, 4).map((candidate, i) => {
              const displayText = candidate.text || candidate.attribute?.value || '';
              const truncated = displayText.length > 15 ? displayText.slice(0, 15) + '...' : displayText;
              
              return (
                <button
                  key={i}
                  onClick={() => handleApplyAnchor(candidate)}
                  className="
                    px-2 py-1 text-[9px]
                    bg-emerald-500/10 text-emerald-400/80 rounded
                    hover:bg-emerald-500/20 hover:text-emerald-400
                    transition-colors
                  "
                  title={displayText}
                >
                  {truncated || candidate.selector}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SELECTOR SECTION - Reusable input section
// =============================================================================

interface SelectorSectionProps {
  label: string;
  sublabel: string;
  color: 'blue' | 'violet';
  value: string;
  onChange: (value: string) => void;
}

function SelectorSection({ label, sublabel, color, value, onChange }: SelectorSectionProps) {
  const colorStyles = {
    blue: {
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      focus: 'focus:border-blue-500/50',
    },
    violet: {
      border: 'border-violet-500/20',
      text: 'text-violet-400',
      focus: 'focus:border-violet-500/50',
    },
  };

  const styles = colorStyles[color];

  return (
    <div className={`p-2 rounded bg-zinc-900/80 border ${styles.border}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[9px] font-medium ${styles.text}`}>{label}</span>
        <span className="text-[8px] text-zinc-600">{sublabel}</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full h-6 px-1.5 text-[10px] font-mono
          bg-black/40 border border-zinc-800 rounded
          ${styles.text} placeholder:text-zinc-700
          ${styles.focus} focus:outline-none
          transition-colors
        `}
      />
    </div>
  );
}


// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState({ isRecording }: { isRecording: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-8">
      <div className={`
        w-12 h-12 rounded-full border flex items-center justify-center mb-3
        transition-colors duration-300
        ${isRecording 
          ? 'bg-rose-500/10 border-rose-500/30' 
          : 'bg-zinc-900 border-white/5'
        }
      `}>
        {isRecording ? (
          <div className="w-4 h-4 rounded-full bg-rose-500 animate-pulse" />
        ) : (
          <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        {isRecording ? '正在录制操作...' : '点击"开始录制"'}
      </p>
      <p className="text-[10px] text-zinc-600 mt-1">
        {isRecording ? '在页面上执行操作' : '录制你的页面操作'}
      </p>
    </div>
  );
}
