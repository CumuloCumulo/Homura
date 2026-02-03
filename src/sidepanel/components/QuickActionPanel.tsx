/**
 * =============================================================================
 * Homura SidePanel - QuickActionPanel Component
 * =============================================================================
 * 
 * Reusable quick action panel for testing selectors.
 * Supports both Path and Structure strategies with WYSIWYG execution.
 * 
 * Used in:
 * - InspectMode (PathVisualizer / StructureView)
 * - RecordingPanel (ActionCard expanded view)
 */

import React from 'react';
import type { ElementAnalysis, SelectorDraft } from '@shared/selectorBuilder';
import type { UnifiedSelector } from '@shared/types';
import { sendToContentScript } from '../utils/ensureContentScript';

// =============================================================================
// TYPES
// =============================================================================

export interface QuickActionPanelProps {
  /** Element analysis from recording or inspection */
  analysis: ElementAnalysis;
  /** Legacy selector draft (for backward compatibility) */
  selectorDraft?: SelectorDraft | null;
  /** Unified selector - primary data source */
  unifiedSelector?: UnifiedSelector | null;
  /** Callback for logging actions */
  onLog: (log: { timestamp: number; level: 'info' | 'error'; message: string }) => void;
  /** Optional: Compact mode for embedded use */
  compact?: boolean;
}

type ActionType = 'highlight' | 'click' | 'input' | 'extract' | null;

// =============================================================================
// ICONS
// =============================================================================

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
    </svg>
  );
}

function Spinner() {
  return <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />;
}

function SearchIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function CursorIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

// =============================================================================
// ACTION BUTTON
// =============================================================================

interface ActionButtonProps {
  label: string;
  isLoading: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  color?: 'blue' | 'default';
}

function ActionButton({ label, isLoading, disabled, onClick, icon, color = 'default' }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-1 h-7 flex items-center justify-center gap-1
        bg-zinc-900/80 border rounded
        text-[10px] font-medium
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${color === 'blue' 
          ? 'border-blue-500/20 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/40'
          : 'border-zinc-700 text-zinc-300 hover:border-violet-500/50 hover:text-violet-400'}
      `}
    >
      {isLoading ? <Spinner /> : icon}
      <span>{label}</span>
    </button>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function QuickActionPanel({ 
  analysis, 
  selectorDraft, 
  unifiedSelector, 
  onLog,
  compact = false,
}: QuickActionPanelProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [extractedText, setExtractedText] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<ActionType>(null);
  
  // Determine which strategy is active
  const strategy = unifiedSelector?.strategy || 
    (selectorDraft?.scope ? 'scope_anchor_target' : 'path');
  const isPathMode = strategy === 'path' || strategy === 'direct';
  const isStructureMode = strategy === 'scope_anchor_target';
  
  // Anchor value for repeating structures
  const defaultAnchorValue = unifiedSelector?.structureData?.anchor?.value ||
    selectorDraft?.anchor?.value || 
    analysis.anchorCandidates?.[0]?.text || 
    analysis.anchorCandidates?.[0]?.attribute?.value || '';
  const [anchorValue, setAnchorValue] = React.useState(defaultAnchorValue);
  
  // Use targetSelector as a stable identity for the selected element
  const analysisId = analysis.targetSelector || analysis.minimalSelector;
  
  React.useEffect(() => {
    // Reset states when element changes
    const newValue = unifiedSelector?.structureData?.anchor?.value ||
      selectorDraft?.anchor?.value || 
      analysis.anchorCandidates?.[0]?.text || 
      analysis.anchorCandidates?.[0]?.attribute?.value || '';
    setAnchorValue(newValue);
    setExtractedText(null);  // Clear previous extracted text
  }, [analysisId, unifiedSelector, selectorDraft, analysis.anchorCandidates]);

  const hasRepeatingContainer = analysis.containerType !== 'single' && !!analysis.containerSelector;
  
  // Build payload from UnifiedSelector or SelectorDraft
  const buildPayload = () => {
    // If we have a UnifiedSelector, use it as the primary source
    if (unifiedSelector) {
      if (isPathMode) {
        // Path strategy: use fullSelector directly
        return {
          targetSelector: unifiedSelector.fullSelector,
          // No scope/anchor for path mode
          scopeSelector: undefined,
          anchorSelector: undefined,
          anchorValue: undefined,
          anchorMatchMode: undefined,
        };
      } else if (unifiedSelector.structureData) {
        // Structure strategy: use structureData
        return {
          scopeSelector: unifiedSelector.structureData.scope.selector,
          anchorSelector: unifiedSelector.structureData.anchor?.selector,
          anchorValue: anchorValue, // Use local state (user may have edited it)
          anchorMatchMode: unifiedSelector.structureData.anchor?.matchMode || 'contains',
          targetSelector: unifiedSelector.structureData.target.selector,
        };
      }
    }
    
    // Fallback to legacy SelectorDraft
    return {
      scopeSelector: selectorDraft?.scope?.selector || analysis.containerSelector,
      anchorSelector: selectorDraft?.anchor?.selector || analysis.anchorCandidates?.[0]?.selector,
      anchorValue: anchorValue,
      anchorMatchMode: selectorDraft?.anchor?.matchMode || 'contains',
      targetSelector: selectorDraft?.target?.selector || analysis.targetSelector || analysis.minimalSelector,
    };
  };

  const handleAction = async (action: ActionType, value?: string) => {
    if (!action) return;
    setIsLoading(action);
    
    try {
      const payload = {
        ...buildPayload(),
        action,
        inputValue: value,
        // Include strategy for the executor to handle appropriately
        strategy: strategy,
      };
      
      const result = await sendToContentScript<{ 
        success: boolean; 
        data?: string; 
        error?: string;
      }>({
        type: 'EXECUTE_WITH_LOGIC',
        payload,
      });
      
      const actionNames = { highlight: '高亮', click: '点击', input: '输入', extract: '读取' };
      
      if (result.success) {
        if (action === 'extract') {
          setExtractedText(result.data || '');
        }
        const msg = action === 'extract' 
          ? `${actionNames[action]}成功: "${result.data}"`
          : `${actionNames[action]}成功`;
        onLog({ timestamp: Date.now(), level: 'info', message: msg });
      } else {
        onLog({ timestamp: Date.now(), level: 'error', message: result.error || `${actionNames[action]}失败` });
      }
    } catch (error) {
      onLog({ timestamp: Date.now(), level: 'error', message: `操作失败: ${error}` });
    } finally {
      setIsLoading(null);
    }
  };

  // Get display values
  const displaySelector = unifiedSelector?.fullSelector || 
    selectorDraft?.target?.selector || 
    analysis.targetSelector || 
    analysis.minimalSelector;

  return (
    <div className={`rounded-lg bg-zinc-800/60 border border-violet-500/20 ${compact ? 'p-2' : 'p-2.5'}`}>
      <h3 className="text-[10px] font-medium text-violet-400 mb-2 flex items-center gap-1.5">
        <TargetIcon className="w-3 h-3" />
        快速测试
        {/* Strategy Badge */}
        <span className={`
          ml-auto px-1.5 py-0.5 text-[8px] rounded
          ${isPathMode 
            ? 'bg-violet-500/20 text-violet-400' 
            : 'bg-emerald-500/20 text-emerald-400'}
        `}>
          {isPathMode ? 'Path' : 'Structure'}
        </span>
      </h3>
      
      {/* Path Mode: Show full selector directly */}
      {isPathMode && !compact && (
        <div className="mb-2.5 p-2 rounded bg-black/20 border border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-500 shrink-0">选择器:</span>
            <code className="text-[9px] font-mono text-violet-400 truncate flex-1">
              {displaySelector}
            </code>
          </div>
          {unifiedSelector?.pathData && (
            <div className="mt-1.5 text-[8px] text-zinc-600">
              根: <span className="text-violet-400/70">{unifiedSelector.pathData.root}</span>
              {unifiedSelector.pathData.intermediates.length > 0 && (
                <> → 路径: <span className="text-violet-400/70">{unifiedSelector.pathData.intermediates.join(' → ')}</span></>
              )}
              → 目标: <span className="text-violet-400/70">{unifiedSelector.pathData.target}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Structure Mode: Show Container & Anchor Info */}
      {isStructureMode && hasRepeatingContainer && (
        <div className={`p-2 rounded bg-black/20 border border-white/5 space-y-1.5 ${compact ? 'mb-2' : 'mb-2.5'}`}>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-500 shrink-0">容器:</span>
            <code className="text-[9px] font-mono text-blue-400 truncate">
              {unifiedSelector?.structureData?.scope.selector || 
               analysis.containerSelector || 
               analysis.containerTagName}
            </code>
            <span className="text-[8px] text-zinc-600">
              ({analysis.containerType})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-zinc-500 shrink-0">锚点:</span>
            <input
              type="text"
              value={anchorValue}
              onChange={(e) => setAnchorValue(e.target.value)}
              placeholder="定位值..."
              className="
                flex-1 h-5 px-1.5 text-[9px] font-mono
                bg-black/30 border border-emerald-500/20 rounded
                text-emerald-400 placeholder:text-zinc-600
                focus:border-emerald-500/50 focus:outline-none
                transition-colors
              "
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-500 shrink-0">目标:</span>
            <code className="text-[9px] font-mono text-violet-400 truncate">
              {unifiedSelector?.structureData?.target.selector || 
               selectorDraft?.target?.selector || 
               analysis.relativeSelector}
            </code>
          </div>
        </div>
      )}
      
      <div className="space-y-1.5">
        {/* Action Buttons Row */}
        <div className="flex gap-1.5">
          <ActionButton 
            label="高亮" 
            isLoading={isLoading === 'highlight'}
            disabled={isLoading !== null}
            onClick={() => handleAction('highlight')}
            icon={<SearchIcon />}
            color="blue"
          />
          <ActionButton 
            label="点击" 
            isLoading={isLoading === 'click'}
            disabled={isLoading !== null}
            onClick={() => handleAction('click')}
            icon={<CursorIcon />}
          />
          <ActionButton 
            label="读取" 
            isLoading={isLoading === 'extract'}
            disabled={isLoading !== null}
            onClick={() => handleAction('extract')}
            icon={<DocumentIcon />}
          />
        </div>

        {/* Input Action */}
        <div className="flex gap-1.5">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && inputValue.trim() && handleAction('input', inputValue)}
            placeholder="输入内容..."
            className="
              flex-1 h-7 px-2 text-[10px] font-mono
              bg-zinc-900/80 border border-zinc-700 rounded
              text-zinc-300 placeholder:text-zinc-600
              focus:border-violet-500/50 focus:outline-none
              transition-colors
            "
          />
          <button
            onClick={() => { handleAction('input', inputValue); setInputValue(''); }}
            disabled={isLoading !== null || !inputValue.trim()}
            className="
              h-7 px-2.5 flex items-center justify-center gap-1
              bg-zinc-900/80 border border-zinc-700 rounded
              text-[10px] font-medium text-zinc-300
              hover:border-violet-500/50 hover:text-violet-400
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
          >
            {isLoading === 'input' ? <Spinner /> : <EditIcon />}
            <span>填写</span>
          </button>
        </div>

        {/* Extracted Text Result */}
        {extractedText !== null && (
          <div className="p-2 rounded bg-black/30 border border-zinc-800">
            <p className="text-[9px] text-zinc-500 mb-1">读取结果:</p>
            <p className="text-[10px] text-emerald-400 font-mono break-all">
              {extractedText || <span className="text-zinc-600 italic">(空)</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
