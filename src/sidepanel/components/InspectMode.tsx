/**
 * =============================================================================
 * Homura SidePanel - Inspect Mode
 * =============================================================================
 * 
 * AI-First element inspection and selector builder interface
 * Features:
 * - Smart AI routing between Path and Structure modes
 * - Animated tab system for mode switching
 * - PathVisualizer for semantic ancestor analysis
 * - StructureView for Scope+Anchor+Target configuration
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecordingStore } from '../stores/recordingStore';
import { sendToContentScript } from '../utils/ensureContentScript';
import type { ElementAnalysis, SelectorDraft } from '@shared/selectorBuilder';
import { 
  createUnifiedSelector,
  convertPathSelectorToUnified,
  convertUnifiedToSelectorDraft,
} from '@shared/selectorBuilder';
import type { UnifiedSelector } from '@shared/types';
import type { ViewMode } from '../stores/recordingStore';

// Sub-components
import { SmartStatus } from './SmartStatus';
import { PathVisualizer } from './PathVisualizer';
import { StructureView } from './StructureView';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function InspectMode() {
  const { 
    isInspecting, 
    setInspecting, 
    analysis,
    selectorDraft,
    setSelectorDraft,
    unifiedSelector,
    setUnifiedSelector,
    addLog,
    isProcessing,
    setProcessing,
    // AI Strategy State
    aiStatus,
    aiStrategy,
    aiReasoning,
    userModeOverride,
    pathSelectorResult,
    containerType,
    setAIStatus,
    setAIStrategy,
    setUserModeOverride,
    setPathSelectorResult,
    setContainerType,
  } = useRecordingStore();

  // Determine active mode: user override > AI decision > default based on analysis
  const activeMode: ViewMode = React.useMemo(() => {
    if (userModeOverride) return userModeOverride;
    if (aiStrategy === 'scope_anchor_target') return 'structure';
    if (aiStrategy === 'path_selector') return 'path';
    // Default: use structure if repeating container, otherwise path
    if (analysis?.containerType && analysis.containerType !== 'single') {
      return 'structure';
    }
    return 'path';
  }, [userModeOverride, aiStrategy, analysis]);

  // Initialize UnifiedSelector from analysis
  // This is the primary initialization path - creates a UnifiedSelector immediately
  React.useEffect(() => {
    if (analysis && !unifiedSelector) {
      try {
        // Create UnifiedSelector from analysis (primary path)
        const selector = createUnifiedSelector(analysis, 'CLICK');
        setUnifiedSelector(selector);
        
        // Also create legacy SelectorDraft for backward compatibility
        const draft = convertUnifiedToSelectorDraft(selector);
        setSelectorDraft(draft);
        
        console.log('[Homura] Created UnifiedSelector:', selector);
      } catch (error) {
        console.error('[Homura] Failed to create UnifiedSelector:', error);
        // Fallback to basic selector
        import('@shared/selectorBuilder').then(({ createSelectorDraft }) => {
          const draft = createSelectorDraft(analysis, 'CLICK');
          setSelectorDraft(draft);
        }).catch(err => {
          console.error('[Homura] Fallback also failed:', err);
        });
      }
    }
  }, [analysis, unifiedSelector, setUnifiedSelector, setSelectorDraft]);

  const handleStartInspect = async () => {
    try {
      await sendToContentScript({ type: 'START_INSPECT' });
      setInspecting(true);
      addLog({
        timestamp: Date.now(),
        level: 'info',
        message: '开始检查模式，请点击页面元素',
      });
    } catch (error) {
      addLog({
        timestamp: Date.now(),
        level: 'error',
        message: `启动检查模式失败: ${error}`,
      });
    }
  };

  const handleStopInspect = async () => {
    try {
      await sendToContentScript({ type: 'STOP_INSPECT' });
      setInspecting(false);
    } catch (error) {
      console.error('Stop inspect error:', error);
      setInspecting(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!analysis) return;

    setProcessing(true);
    setAIStatus('analyzing');
    addLog({
      timestamp: Date.now(),
      level: 'info',
      message: '正在使用 AI 智能分析页面结构...',
    });

    try {
      const payload = {
        intent: '定位并操作目标元素',
        targetSelector: analysis.targetSelector || analysis.minimalSelector,
        targetHtml: getTargetHtml(analysis),
        ancestorPath: analysis.ancestorPath || [],
        structureInfo: {
          containerType: analysis.containerType,
          hasRepeatingStructure: analysis.containerType !== 'single',
          containerSelector: analysis.containerSelector,
          anchorCandidates: analysis.anchorCandidates || [],
        },
      };

      console.log('[InspectMode] Sending SmartSelector Context:', payload);

      const result = await sendToContentScript<{ 
        success: boolean; 
        draft?: SelectorDraft;
        strategy?: 'path_selector' | 'scope_anchor_target';
        pathSelector?: {
          root: string;
          path: string[];
          target: string;
          fullSelector: string;
          confidence: number;
          reasoning?: string;
        };
        selectorLogic?: {
          scope?: { type: string; selector: string };
          anchor?: { type: string; selector: string; value: string; matchMode: string };
          target: { selector: string; action: string };
        };
        confidence?: number;
        reasoning?: string;
        error?: string 
      }>({
        type: 'AI_GENERATE_SMART_SELECTOR',
        payload,
      });

      if (result.success) {
        const strategy = result.strategy || 'path_selector';
        setAIStrategy(strategy, result.reasoning);
        setContainerType(analysis.containerType);
        
        const strategyName = strategy === 'scope_anchor_target' 
          ? 'Scope+Anchor+Target' 
          : 'Path Selector';
        
        addLog({
          timestamp: Date.now(),
          level: 'info',
          message: `AI 选择策略: ${strategyName}`,
        });

        if (result.pathSelector) {
          // Convert PathSelector to UnifiedSelector (preserving full structure)
          const newUnified = convertPathSelectorToUnified(
            result.pathSelector, 
            unifiedSelector?.action?.type || 'CLICK'
          );
          setUnifiedSelector(newUnified);
          
          // Also set legacy pathSelectorResult for backward compatibility
          setPathSelectorResult(result.pathSelector);
          
          // Sync to SelectorDraft for backward compatibility
          const newDraft = convertUnifiedToSelectorDraft(newUnified);
          setSelectorDraft(newDraft);
          
          addLog({
            timestamp: Date.now(),
            level: 'info',
            message: `AI 生成选择器: ${result.pathSelector.fullSelector}`,
          });
        } else if (result.selectorLogic) {
          // Build UnifiedSelector from selectorLogic
          const scopeType = result.selectorLogic.scope?.type as 'container_list' | 'single_container' | undefined;
          const anchorType = result.selectorLogic.anchor?.type as 'text_match' | 'attribute_match' | undefined;
          const matchMode = result.selectorLogic.anchor?.matchMode as 'exact' | 'contains' | 'startsWith' | 'endsWith' | undefined;
          
          const newUnified: UnifiedSelector = {
            id: unifiedSelector?.id || `sel_${Date.now().toString(36)}`,
            strategy: 'scope_anchor_target',
            fullSelector: result.selectorLogic.scope 
              ? `${result.selectorLogic.scope.selector} ${result.selectorLogic.target.selector}`
              : result.selectorLogic.target.selector,
            structureData: result.selectorLogic.scope ? {
              scope: {
                selector: result.selectorLogic.scope.selector,
                type: scopeType || 'container_list',
              },
              anchor: result.selectorLogic.anchor ? {
                selector: result.selectorLogic.anchor.selector,
                type: anchorType || 'text_match',
                value: result.selectorLogic.anchor.value,
                matchMode: matchMode || 'contains',
              } : undefined,
              target: {
                selector: result.selectorLogic.target.selector,
              },
            } : undefined,
            action: {
              type: (result.selectorLogic.target.action as UnifiedSelector['action']['type']) || 
                    unifiedSelector?.action?.type || 'CLICK',
            },
            confidence: result.confidence || 0.8,
            validated: false,
            reasoning: result.reasoning,
            metadata: {
              source: 'ai',
              createdAt: Date.now(),
            },
          };
          setUnifiedSelector(newUnified);
          
          // Sync to SelectorDraft for backward compatibility
          const newDraft = convertUnifiedToSelectorDraft(newUnified);
          setSelectorDraft(newDraft);
          
          addLog({
            timestamp: Date.now(),
            level: 'info',
            message: `AI 生成 Scope+Anchor+Target 选择器`,
          });
        } else if (result.draft) {
          // Legacy path: just set the draft directly
          setSelectorDraft(result.draft);
          addLog({
            timestamp: Date.now(),
            level: 'info',
            message: 'AI 生成选择器完成',
          });
        }
      } else {
        setAIStatus('idle');
        addLog({
          timestamp: Date.now(),
          level: 'error',
          message: `AI 生成失败: ${result.error}`,
        });
      }
    } catch (error) {
      setAIStatus('idle');
      addLog({
        timestamp: Date.now(),
        level: 'error',
        message: `AI 请求失败: ${error}`,
      });
    } finally {
      setProcessing(false);
    }
  };

  const getTargetHtml = (analysis: ElementAnalysis): string => {
    const selector = analysis.targetSelector || analysis.minimalSelector;
    return `<target selector="${selector}" pathSelector="${analysis.pathSelector || ''}" />`;
  };

  const handleSaveTool = async () => {
    if (!selectorDraft) {
      addLog({
        timestamp: Date.now(),
        level: 'error',
        message: '没有可保存的选择器',
      });
      return;
    }
    addLog({
      timestamp: Date.now(),
      level: 'info',
      message: '保存到工具库功能即将推出...',
    });
  };

  const handleModeChange = (mode: ViewMode) => {
    setUserModeOverride(mode);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Control Panel */}
      <ControlPanel 
        isInspecting={isInspecting}
        onStart={handleStartInspect}
        onStop={handleStopInspect}
      />

      {/* AI Status Panel */}
      {analysis && (
        <SmartStatus
          status={aiStatus}
          strategy={aiStrategy}
          reasoning={aiReasoning}
          containerType={containerType}
          onOverride={handleModeChange}
        />
      )}

      {/* Mode Tabs */}
      {analysis && (
        <ModeTabBar 
          activeMode={activeMode} 
          onChange={handleModeChange}
          hasPathData={!!analysis.ancestorPath?.length}
          hasStructureData={analysis.containerType !== 'single'}
        />
      )}

      {/* Analysis Content */}
      <div className="flex-1 overflow-y-auto">
        {analysis ? (
          <AnimatePresence mode="wait">
            {activeMode === 'path' ? (
              <motion.div
                key="path"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <PathVisualizer
                  ancestorPath={analysis.ancestorPath || []}
                  pathSelector={pathSelectorResult}
                  targetSelector={analysis.targetSelector || analysis.minimalSelector}
                  unifiedSelector={unifiedSelector}
                  onLog={addLog}
                />
              </motion.div>
            ) : (
              <motion.div
                key="structure"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <StructureView
                  analysis={analysis}
                  selectorDraft={selectorDraft}
                  unifiedSelector={unifiedSelector}
                  onDraftChange={setSelectorDraft}
                  onLog={addLog}
                />
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <EmptyState isInspecting={isInspecting} />
        )}
      </div>

      {/* Bottom Action Bar */}
      {analysis && (
        <ActionBar
          selectorDraft={selectorDraft}
          isProcessing={isProcessing}
          onAIGenerate={handleAIGenerate}
          onSave={handleSaveTool}
        />
      )}
    </div>
  );
}

// =============================================================================
// CONTROL PANEL
// =============================================================================

interface ControlPanelProps {
  isInspecting: boolean;
  onStart: () => void;
  onStop: () => void;
}

function ControlPanel({ isInspecting, onStart, onStop }: ControlPanelProps) {
  return (
    <div className="p-3 border-b border-white/5">
      {!isInspecting ? (
        <button
          onClick={onStart}
          className="
            w-full h-10 flex items-center justify-center gap-2
            bg-violet-600/80 rounded-lg text-sm font-medium text-white
            hover:bg-violet-500 hover:shadow-neon
            transition-all duration-200
          "
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <span>开始检查</span>
        </button>
      ) : (
        <button
          onClick={onStop}
          className="
            w-full h-10 flex items-center justify-center gap-2
            bg-rose-600/80 rounded-lg text-sm font-medium text-white
            hover:bg-rose-500 animate-pulse
            transition-all duration-200
          "
        >
          <div className="w-2 h-2 rounded-full bg-white" />
          <span>停止检查</span>
        </button>
      )}
    </div>
  );
}

// =============================================================================
// MODE TAB BAR
// =============================================================================

interface ModeTabBarProps {
  activeMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  hasPathData: boolean;
  hasStructureData: boolean;
}

function ModeTabBar({ activeMode, onChange, hasPathData, hasStructureData }: ModeTabBarProps) {
  return (
    <div className="px-3 pb-2">
      <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-lg">
        <TabButton
          active={activeMode === 'path'}
          onClick={() => onChange('path')}
          disabled={!hasPathData}
        >
          <TreeIcon className="w-3 h-3" />
          <span>路径模式</span>
        </TabButton>
        <TabButton
          active={activeMode === 'structure'}
          onClick={() => onChange('structure')}
          disabled={!hasStructureData}
        >
          <LayersIcon className="w-3 h-3" />
          <span>结构模式</span>
        </TabButton>
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function TabButton({ active, onClick, disabled, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex-1 h-7 flex items-center justify-center gap-1.5
        text-[10px] font-medium rounded-md
        transition-all duration-200
        disabled:opacity-40 disabled:cursor-not-allowed
        ${active 
          ? 'text-zinc-100' 
          : 'text-zinc-500 hover:text-zinc-300'}
      `}
    >
      {active && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute inset-0 bg-zinc-800 rounded-md"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        {children}
      </span>
    </button>
  );
}

// Icons
function TreeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
    </svg>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
    </svg>
  );
}

// =============================================================================
// ACTION BAR
// =============================================================================

interface ActionBarProps {
  selectorDraft: SelectorDraft | null;
  isProcessing: boolean;
  onAIGenerate: () => void;
  onSave: () => void;
}

function ActionBar({ selectorDraft, isProcessing, onAIGenerate, onSave }: ActionBarProps) {
  const handleCopySelector = () => {
    if (selectorDraft?.target?.selector) {
      navigator.clipboard.writeText(selectorDraft.target.selector);
    }
  };

  return (
    <div className="p-3 border-t border-white/5 space-y-2">
      <div className="flex gap-2">
        {/* AI Generate Button */}
        <button
          onClick={onAIGenerate}
          disabled={isProcessing || !selectorDraft}
          className="
            flex-1 h-8 flex items-center justify-center gap-1.5
            bg-zinc-900 border border-violet-500/20 rounded-lg
            text-xs text-violet-400 hover:bg-violet-500/10
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          {isProcessing ? (
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <SparklesIcon className="w-3.5 h-3.5" />
          )}
          AI 优化选择器
        </button>
        
        {/* Copy Button */}
        <button
          onClick={handleCopySelector}
          disabled={!selectorDraft?.target?.selector}
          className="
            h-8 px-3 flex items-center justify-center
            bg-zinc-900 border border-zinc-700 rounded-lg
            text-xs text-zinc-400 hover:text-zinc-300 hover:border-zinc-600
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
          title="复制选择器"
        >
          <CopyIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      
      {/* Save Button */}
      <button
        onClick={onSave}
        disabled={!selectorDraft}
        className="
          w-full h-9 flex items-center justify-center gap-2
          bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 
          rounded-lg text-xs font-medium text-white
          hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-neon
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
        "
      >
        <SaveIcon className="w-3.5 h-3.5" />
        保存到工具库
      </button>
    </div>
  );
}

// Action Bar Icons
function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState({ isInspecting }: { isInspecting: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-8">
      <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      </div>
      <p className="text-xs text-zinc-500">
        {isInspecting ? '点击页面元素进行分析' : '点击"开始检查"'}
      </p>
      <p className="text-[10px] text-zinc-600 mt-1">
        {isInspecting ? '将鼠标移到目标元素上' : '分析页面元素结构'}
      </p>
    </div>
  );
}
