/**
 * =============================================================================
 * Homura SidePanel - Inspect Mode
 * =============================================================================
 * 
 * Unified element inspection and selector builder interface
 * Features:
 * - Element selection and analysis
 * - Direct actions: Click, Input, Extract Text
 * - Advanced selector configuration (collapsible)
 * - Selector validation and AI optimization
 * - Save to tool library
 */

import React from 'react';
import { useRecordingStore } from '../stores/recordingStore';
import { sendToContentScript } from '../utils/ensureContentScript';
import type { ElementAnalysis, AnchorCandidate, SelectorDraft, AncestorInfo } from '@shared/selectorBuilder';

export function InspectMode() {
  const { 
    isInspecting, 
    setInspecting, 
    analysis,
    selectorDraft,
    setSelectorDraft,
    addLog,
    isProcessing,
    setProcessing,
  } = useRecordingStore();

  // Initialize draft from analysis
  React.useEffect(() => {
    if (analysis && !selectorDraft) {
      import('@shared/selectorBuilder').then(({ createSelectorDraft }) => {
        try {
          const draft = createSelectorDraft(analysis, 'CLICK');
          setSelectorDraft(draft);
        } catch (error) {
          console.error('[Homura] Failed to create selector draft:', error);
          // Create a minimal fallback draft
          setSelectorDraft({
            target: {
              selector: analysis.minimalSelector || analysis.targetSelector || '*',
              action: 'CLICK',
            },
            confidence: 0.3,
            validated: false,
          });
        }
      }).catch(error => {
        console.error('[Homura] Failed to import selectorBuilder:', error);
      });
    }
  }, [analysis, selectorDraft, setSelectorDraft]);

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
    addLog({
      timestamp: Date.now(),
      level: 'info',
      message: '正在使用 AI 智能生成选择器...',
    });

    try {
      // Build unified SmartSelector payload with all analysis data
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

      // Use the unified smart selector generation
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
        const strategyName = result.strategy === 'scope_anchor_target' 
          ? 'Scope+Anchor+Target' 
          : 'Path Selector';
        
        addLog({
          timestamp: Date.now(),
          level: 'info',
          message: `AI 选择策略: ${strategyName}`,
        });

        if (result.pathSelector) {
          // Update the selector draft with the AI-generated path selector
          const newDraft: SelectorDraft = {
            ...selectorDraft,
            target: {
              selector: result.pathSelector.fullSelector,
              action: selectorDraft?.target?.action || 'CLICK',
            },
            confidence: result.pathSelector.confidence,
            validated: false,
          };
          setSelectorDraft(newDraft);
          
          addLog({
            timestamp: Date.now(),
            level: 'info',
            message: `AI 生成选择器: ${result.pathSelector.fullSelector}`,
          });
          
          if (result.pathSelector.reasoning) {
            addLog({
              timestamp: Date.now(),
              level: 'info',
              message: `理由: ${result.pathSelector.reasoning}`,
            });
          }
        } else if (result.selectorLogic) {
          // Handle Scope+Anchor+Target result
          const newDraft: SelectorDraft = {
            scope: result.selectorLogic.scope ? {
              selector: result.selectorLogic.scope.selector,
              type: result.selectorLogic.scope.type as 'container_list' | 'single_container',
              matchCount: 0,
            } : undefined,
            anchor: result.selectorLogic.anchor ? {
              selector: result.selectorLogic.anchor.selector,
              type: result.selectorLogic.anchor.type as 'text_match' | 'attribute_match',
              value: result.selectorLogic.anchor.value,
              matchMode: result.selectorLogic.anchor.matchMode as 'contains' | 'exact',
            } : undefined,
            target: {
              selector: result.selectorLogic.target.selector,
              action: result.selectorLogic.target.action || selectorDraft?.target?.action || 'CLICK',
            },
            confidence: result.confidence || 0.8,
            validated: false,
          };
          setSelectorDraft(newDraft);
          
          addLog({
            timestamp: Date.now(),
            level: 'info',
            message: `AI 生成 Scope+Anchor+Target 选择器`,
          });
          
          if (result.reasoning) {
            addLog({
              timestamp: Date.now(),
              level: 'info',
              message: `理由: ${result.reasoning}`,
            });
          }
        } else if (result.draft) {
          setSelectorDraft(result.draft);
          addLog({
            timestamp: Date.now(),
            level: 'info',
            message: 'AI 生成选择器完成',
          });
        }
      } else {
        addLog({
          timestamp: Date.now(),
          level: 'error',
          message: `AI 生成失败: ${result.error}`,
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

  // Helper to get target HTML for AI context
  const getTargetHtml = (analysis: ElementAnalysis): string => {
    // Return a summary of the target element
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

    // TODO: Open dialog to name the tool and save to library
    addLog({
      timestamp: Date.now(),
      level: 'info',
      message: '保存到工具库功能即将推出...',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Control Panel */}
      <div className="p-3 border-b border-white/5">
        {!isInspecting ? (
          <button
            onClick={handleStartInspect}
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
            onClick={handleStopInspect}
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

      {/* Analysis Result */}
      <div className="flex-1 overflow-y-auto p-3">
        {analysis ? (
          <AnalysisCard 
            analysis={analysis}
            selectorDraft={selectorDraft}
            onDraftChange={setSelectorDraft}
          />
        ) : (
          <EmptyState isInspecting={isInspecting} />
        )}
      </div>

      {/* Bottom Action Bar - Only show when element is selected */}
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
// ANALYSIS CARD - Main content area
// =============================================================================

interface AnalysisCardProps {
  analysis: ElementAnalysis;
  selectorDraft: SelectorDraft | null;
  onDraftChange: (draft: SelectorDraft) => void;
}

function AnalysisCard({ analysis, selectorDraft, onDraftChange }: AnalysisCardProps) {
  const { containerType, anchorCandidates, relativeSelector, minimalSelector } = analysis;
  const { addLog } = useRecordingStore();
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  return (
    <div className="space-y-3">
      {/* Element Info */}
      <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
        <h3 className="text-xs font-medium text-zinc-300 mb-2">目标元素</h3>
        <code className="block text-[10px] font-mono text-violet-400 break-all">
          {analysis.targetSelector || minimalSelector}
        </code>
        {analysis.scopedSelector && analysis.scopedSelector !== minimalSelector && (
          <code className="block text-[9px] font-mono text-zinc-500 mt-1 break-all">
            完整: {analysis.scopedSelector}
          </code>
        )}
      </div>

      {/* Quick Actions Panel - Uses full Scope + Anchor + Target logic */}
      <QuickActionPanel analysis={analysis} selectorDraft={selectorDraft} onLog={addLog} />

      {/* Advanced Selector Configuration - Collapsible */}
      <div className="rounded-lg bg-zinc-900/50 border border-violet-500/10 overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
            </svg>
            <span className="text-[11px] font-medium text-zinc-300">高级选择器配置</span>
          </div>
          <svg 
            className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} 
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showAdvanced && selectorDraft && (
          <div className="px-3 pb-3 space-y-2.5 border-t border-white/5 pt-2.5 animate-fade-in">
            {/* Scope */}
            {selectorDraft.scope && (
              <SelectorSection
                title="Scope (作用域)"
                color="blue"
                value={selectorDraft.scope.selector}
                onChange={(value) => onDraftChange({
                  ...selectorDraft,
                  scope: { ...selectorDraft.scope!, selector: value },
                })}
                info={`${selectorDraft.scope.matchCount || '?'} 个容器`}
              />
            )}

            {/* Anchor */}
            {selectorDraft.anchor && (
              <SelectorSection
                title="Anchor (锚点)"
                color="green"
                value={selectorDraft.anchor.selector}
                onChange={(value) => onDraftChange({
                  ...selectorDraft,
                  anchor: { ...selectorDraft.anchor!, selector: value },
                })}
              >
                <div className="mt-2 space-y-1.5">
                  <input
                    type="text"
                    value={selectorDraft.anchor.value}
                    onChange={(e) => onDraftChange({
                      ...selectorDraft,
                      anchor: { ...selectorDraft.anchor!, value: e.target.value },
                    })}
                    placeholder="匹配值 (支持 {{变量}})"
                    className="
                      w-full h-6 px-1.5 text-[10px] font-mono
                      bg-black/30 border border-zinc-800 rounded
                      text-emerald-400 placeholder:text-zinc-600
                      focus:border-emerald-500/50 focus:outline-none
                    "
                  />
                  <select
                    value={selectorDraft.anchor.matchMode}
                    onChange={(e) => onDraftChange({
                      ...selectorDraft,
                      anchor: { ...selectorDraft.anchor!, matchMode: e.target.value as 'contains' | 'exact' },
                    })}
                    className="
                      w-full h-6 px-1.5 text-[9px]
                      bg-black/30 border border-zinc-800 rounded
                      text-zinc-400 focus:outline-none
                    "
                  >
                    <option value="contains">包含</option>
                    <option value="exact">精确匹配</option>
                    <option value="startsWith">开头匹配</option>
                    <option value="endsWith">结尾匹配</option>
                  </select>
                </div>
              </SelectorSection>
            )}

            {/* Target */}
            <SelectorSection
              title="Target (目标)"
              color="violet"
              value={selectorDraft.target.selector}
              onChange={(value) => onDraftChange({
                ...selectorDraft,
                target: { ...selectorDraft.target, selector: value },
              })}
            >
              <select
                value={selectorDraft.target.action}
                onChange={(e) => onDraftChange({
                  ...selectorDraft,
                  target: { ...selectorDraft.target, action: e.target.value },
                })}
                className="
                  w-full h-6 mt-1.5 px-1.5 text-[9px]
                  bg-black/30 border border-zinc-800 rounded
                  text-zinc-400 focus:outline-none
                "
              >
                <option value="CLICK">CLICK</option>
                <option value="INPUT">INPUT</option>
                <option value="EXTRACT_TEXT">EXTRACT_TEXT</option>
                <option value="WAIT_FOR">WAIT_FOR</option>
              </select>
            </SelectorSection>
          </div>
        )}
      </div>

      {/* Container Info */}
      {analysis.container && (
        <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
          <h3 className="text-xs font-medium text-zinc-300 mb-2">
            容器类型: <span className="text-blue-400">{containerType}</span>
          </h3>
          <code className="block text-[10px] font-mono text-zinc-500 break-all">
            相对选择器: {relativeSelector}
          </code>
        </div>
      )}

      {/* Anchor Candidates */}
      {anchorCandidates.length > 0 && (
        <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
          <h3 className="text-xs font-medium text-zinc-300 mb-2">锚点候选</h3>
          <div className="space-y-2">
            {anchorCandidates.map((candidate, index) => (
              <AnchorCandidateItem key={index} candidate={candidate} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Ancestor Path - For AI-assisted selector generation */}
      {analysis.ancestorPath && analysis.ancestorPath.length > 0 && (
        <AncestorPathCard ancestorPath={analysis.ancestorPath} pathSelector={analysis.pathSelector} />
      )}
    </div>
  );
}

// =============================================================================
// ACTION BAR - Bottom fixed actions (simplified - validation moved to quick actions)
// =============================================================================

interface ActionBarProps {
  selectorDraft: SelectorDraft | null;
  isProcessing: boolean;
  onAIGenerate: () => void;
  onSave: () => void;
}

function ActionBar({ selectorDraft, isProcessing, onAIGenerate, onSave }: ActionBarProps) {
  return (
    <div className="p-3 border-t border-white/5 space-y-2">
      <div className="flex gap-2">
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
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
          AI 优化选择器
        </button>
      </div>
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
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        保存到工具库
      </button>
    </div>
  );
}

// =============================================================================
// SELECTOR SECTION - Reusable input section
// =============================================================================

interface SelectorSectionProps {
  title: string;
  color: 'blue' | 'green' | 'violet';
  value: string;
  onChange: (value: string) => void;
  info?: string;
  children?: React.ReactNode;
}

function SelectorSection({ title, color, value, onChange, info, children }: SelectorSectionProps) {
  const colorStyles = {
    blue: { border: 'border-blue-500/20', text: 'text-blue-400', focus: 'focus:border-blue-500/50' },
    green: { border: 'border-emerald-500/20', text: 'text-emerald-400', focus: 'focus:border-emerald-500/50' },
    violet: { border: 'border-violet-500/20', text: 'text-violet-400', focus: 'focus:border-violet-500/50' },
  };
  const styles = colorStyles[color];

  return (
    <div className={`p-2 rounded bg-zinc-900/80 border ${styles.border}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[9px] font-medium ${styles.text}`}>{title}</span>
        {info && <span className="text-[8px] text-zinc-600">{info}</span>}
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
      {children}
    </div>
  );
}

// =============================================================================
// QUICK ACTION PANEL - Direct element operations with full selector logic
// =============================================================================

interface QuickActionPanelProps {
  analysis: ElementAnalysis;
  selectorDraft: SelectorDraft | null;
  onLog: (log: { timestamp: number; level: 'info' | 'error'; message: string }) => void;
}

type ActionType = 'highlight' | 'click' | 'input' | 'extract' | null;

/**
 * Quick Action Panel - "所见即所得"
 * 
 * Uses the same Scope + Anchor + Target logic that will be used in automation.
 * For repeating structures, displays and allows editing the anchor value.
 */
function QuickActionPanel({ analysis, selectorDraft, onLog }: QuickActionPanelProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [extractedText, setExtractedText] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<ActionType>(null);
  
  // Anchor value for repeating structures
  const defaultAnchorValue = selectorDraft?.anchor?.value || 
    analysis.anchorCandidates?.[0]?.text || 
    analysis.anchorCandidates?.[0]?.attribute?.value || '';
  const [anchorValue, setAnchorValue] = React.useState(defaultAnchorValue);
  
  // Update anchor value when analysis changes
  React.useEffect(() => {
    const newValue = selectorDraft?.anchor?.value || 
      analysis.anchorCandidates?.[0]?.text || 
      analysis.anchorCandidates?.[0]?.attribute?.value || '';
    setAnchorValue(newValue);
  }, [analysis, selectorDraft]);

  const hasRepeatingContainer = analysis.containerType !== 'single' && !!analysis.containerSelector;
  
  // Build the execution payload
  const buildPayload = () => ({
    scopeSelector: selectorDraft?.scope?.selector || analysis.containerSelector,
    anchorSelector: selectorDraft?.anchor?.selector || analysis.anchorCandidates?.[0]?.selector,
    anchorValue: anchorValue,
    anchorMatchMode: selectorDraft?.anchor?.matchMode || 'contains',
    targetSelector: selectorDraft?.target?.selector || analysis.targetSelector || analysis.minimalSelector,
  });

  const handleAction = async (action: ActionType, value?: string) => {
    if (!action) return;
    setIsLoading(action);
    
    try {
      const payload = {
        ...buildPayload(),
        action,
        inputValue: value,
      };
      
      console.log('[Homura] QuickAction payload:', payload);
      console.log('[Homura] Analysis:', {
        containerSelector: analysis.containerSelector,
        targetSelector: analysis.targetSelector,
        minimalSelector: analysis.minimalSelector,
        anchorCandidates: analysis.anchorCandidates?.length,
      });
      
      const result = await sendToContentScript<{ 
        success: boolean; 
        data?: string; 
        error?: string;
        usedSelector?: string;
      }>({
        type: 'EXECUTE_WITH_LOGIC',
        payload,
      });
      
      console.log('[Homura] QuickAction result:', result);
      
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

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleAction('input', inputValue);
    }
  };

  return (
    <div className="p-2.5 rounded-lg bg-zinc-800/60 border border-violet-500/20">
      <h3 className="text-[10px] font-medium text-violet-400 mb-2 flex items-center gap-1.5">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        快速操作
      </h3>
      
      {/* Container & Anchor Info - For repeating structures */}
      {hasRepeatingContainer && (
        <div className="mb-2.5 p-2 rounded bg-black/20 border border-white/5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-500 shrink-0">容器:</span>
            <code className="text-[9px] font-mono text-blue-400 truncate">
              {analysis.containerSelector || analysis.containerTagName}
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
        </div>
      )}
      
      <div className="space-y-1.5">
        {/* Action Buttons Row */}
        <div className="flex gap-1.5">
          {/* Highlight */}
          <button
            onClick={() => handleAction('highlight')}
            disabled={isLoading !== null}
            className="
              flex-1 h-7 flex items-center justify-center gap-1
              bg-zinc-900/80 border border-blue-500/20 rounded
              text-[10px] font-medium text-blue-400
              hover:bg-blue-500/10 hover:border-blue-500/40
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
            title="高亮定位到的元素"
          >
            {isLoading === 'highlight' ? (
              <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            <span>高亮</span>
          </button>
          
          {/* Click */}
          <button
            onClick={() => handleAction('click')}
            disabled={isLoading !== null}
            className="
              flex-1 h-7 flex items-center justify-center gap-1
              bg-zinc-900/80 border border-zinc-700 rounded
              text-[10px] font-medium text-zinc-300
              hover:border-violet-500/50 hover:text-violet-400
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
          >
            {isLoading === 'click' ? (
              <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            )}
            <span>点击</span>
          </button>
          
          {/* Extract */}
          <button
            onClick={() => handleAction('extract')}
            disabled={isLoading !== null}
            className="
              flex-1 h-7 flex items-center justify-center gap-1
              bg-zinc-900/80 border border-zinc-700 rounded
              text-[10px] font-medium text-zinc-300
              hover:border-violet-500/50 hover:text-violet-400
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
          >
            {isLoading === 'extract' ? (
              <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <span>读取</span>
          </button>
        </div>

        {/* Input Action */}
        <div className="flex gap-1.5">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
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
            {isLoading === 'input' ? (
              <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
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

// =============================================================================
// ANCHOR CANDIDATE ITEM
// =============================================================================

function AnchorCandidateItem({ candidate, index }: { candidate: AnchorCandidate; index: number }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded bg-black/30">
      <span className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[9px]">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-400">
            {candidate.selector}
          </span>
          <span className={`
            px-1 py-0.5 text-[8px] rounded
            ${candidate.isUnique ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}
          `}>
            {candidate.type}
          </span>
        </div>
        {candidate.text && (
          <p className="text-[10px] text-zinc-500 truncate mt-0.5">
            "{candidate.text}"
          </p>
        )}
      </div>
      <span className="shrink-0 text-[9px] text-zinc-600">
        {Math.round(candidate.confidence * 100)}%
      </span>
    </div>
  );
}

// =============================================================================
// ANCESTOR PATH CARD - For AI-assisted selector generation
// =============================================================================

interface AncestorPathCardProps {
  ancestorPath: AncestorInfo[];
  pathSelector?: string;
}

function AncestorPathCard({ ancestorPath, pathSelector }: AncestorPathCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  // Find semantic root
  const semanticRoot = ancestorPath.find(a => a.isSemanticRoot);
  
  return (
    <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="text-xs font-medium text-zinc-300 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
          元素路径
          <span className="text-[9px] text-zinc-600">({ancestorPath.length} 层)</span>
        </h3>
        <svg 
          className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Path Selector Preview */}
      {pathSelector && (
        <div className="mt-2 p-2 rounded bg-black/20 border border-violet-500/10">
          <span className="text-[9px] text-violet-400">路径选择器:</span>
          <code className="block text-[10px] font-mono text-violet-300 mt-1 break-all">
            {pathSelector}
          </code>
        </div>
      )}
      
      {/* Semantic Root Highlight */}
      {semanticRoot && !isExpanded && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[9px] text-zinc-500">语义根:</span>
          <code className="text-[10px] font-mono text-emerald-400">
            {semanticRoot.selector}
          </code>
          <span className="text-[8px] text-emerald-500/60">
            (score: {Math.round(semanticRoot.semanticScore * 100)}%)
          </span>
        </div>
      )}
      
      {/* Expanded View */}
      {isExpanded && (
        <div className="mt-3 space-y-1.5 animate-fade-in">
          <div className="text-[9px] text-zinc-600 mb-2">目标元素 ↑</div>
          {ancestorPath.map((ancestor, index) => (
            <AncestorPathItem key={index} ancestor={ancestor} index={index} />
          ))}
          <div className="text-[9px] text-zinc-600 mt-2">← 语义根</div>
        </div>
      )}
    </div>
  );
}

function AncestorPathItem({ ancestor, index }: { ancestor: AncestorInfo; index: number }) {
  const scoreColor = ancestor.semanticScore >= 0.7 
    ? 'text-emerald-400' 
    : ancestor.semanticScore >= 0.4 
      ? 'text-yellow-400' 
      : 'text-zinc-500';
  
  return (
    <div className={`
      flex items-start gap-2 p-2 rounded border transition-colors
      ${ancestor.isSemanticRoot 
        ? 'bg-emerald-500/10 border-emerald-500/20' 
        : 'bg-black/30 border-white/5'}
    `}>
      <span className="shrink-0 w-4 h-4 flex items-center justify-center rounded text-[9px] text-zinc-500 bg-zinc-800">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-[10px] font-mono text-violet-400">
            {ancestor.selector}
          </code>
          {ancestor.isSemanticRoot && (
            <span className="px-1 py-0.5 text-[8px] rounded bg-emerald-500/20 text-emerald-400">
              语义根
            </span>
          )}
        </div>
        {ancestor.classes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {ancestor.classes.slice(0, 3).map((cls, i) => (
              <span key={i} className="text-[8px] text-zinc-600 font-mono">
                .{cls}
              </span>
            ))}
            {ancestor.classes.length > 3 && (
              <span className="text-[8px] text-zinc-700">
                +{ancestor.classes.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
      <span className={`shrink-0 text-[9px] ${scoreColor}`}>
        {Math.round(ancestor.semanticScore * 100)}%
      </span>
    </div>
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
