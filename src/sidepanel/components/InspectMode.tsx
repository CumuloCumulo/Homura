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
import type { ElementAnalysis, AnchorCandidate, SelectorDraft, ValidationResult } from '@shared/selectorBuilder';

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

  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);

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

  // Reset validation when draft changes
  React.useEffect(() => {
    setValidationResult(null);
  }, [selectorDraft]);

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

  const handleValidate = async () => {
    if (!selectorDraft) return;

    try {
      const result = await sendToContentScript<ValidationResult & { success: boolean }>({
        type: 'VALIDATE_SELECTOR',
        payload: selectorDraft,
      });
      
      setValidationResult(result);
      addLog({
        timestamp: Date.now(),
        level: result.valid ? 'info' : 'error',
        message: result.valid 
          ? `验证通过: Scope=${result.scopeMatches}个, Anchor匹配第${result.anchorMatchIndex + 1}个`
          : `验证失败: ${result.error}`,
      });
    } catch (error) {
      addLog({
        timestamp: Date.now(),
        level: 'error',
        message: `验证错误: ${error}`,
      });
    }
  };

  const handleAIGenerate = async () => {
    if (!analysis) return;

    setProcessing(true);
    addLog({
      timestamp: Date.now(),
      level: 'info',
      message: '正在使用 AI 生成选择器...',
    });

    try {
      const result = await sendToContentScript<{ success: boolean; draft?: SelectorDraft; error?: string }>({
        type: 'AI_GENERATE_SELECTOR',
        payload: {
          intent: '点击目标元素',
          analysis,
        },
      });

      if (result.success && result.draft) {
        setSelectorDraft(result.draft);
        addLog({
          timestamp: Date.now(),
          level: 'info',
          message: 'AI 生成选择器完成',
        });
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

  const handleSaveTool = async () => {
    if (!selectorDraft || !validationResult?.valid) {
      addLog({
        timestamp: Date.now(),
        level: 'error',
        message: '请先验证选择器',
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
            validationResult={validationResult}
          />
        ) : (
          <EmptyState isInspecting={isInspecting} />
        )}
      </div>

      {/* Bottom Action Bar - Only show when element is selected */}
      {analysis && (
        <ActionBar
          selectorDraft={selectorDraft}
          validationResult={validationResult}
          isProcessing={isProcessing}
          onValidate={handleValidate}
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
  validationResult: ValidationResult | null;
}

function AnalysisCard({ analysis, selectorDraft, onDraftChange, validationResult }: AnalysisCardProps) {
  const { containerType, anchorCandidates, relativeSelector, minimalSelector } = analysis;
  const { addLog } = useRecordingStore();
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  return (
    <div className="space-y-3">
      {/* Element Info */}
      <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
        <h3 className="text-xs font-medium text-zinc-300 mb-2">目标元素</h3>
        <code className="block text-[10px] font-mono text-violet-400 break-all">
          {minimalSelector}
        </code>
      </div>

      {/* Quick Actions Panel */}
      <QuickActionPanel selector={minimalSelector} onLog={addLog} />

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

            {/* Validation Result */}
            {validationResult && (
              <ValidationResultCard result={validationResult} />
            )}
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
    </div>
  );
}

// =============================================================================
// ACTION BAR - Bottom fixed actions
// =============================================================================

interface ActionBarProps {
  selectorDraft: SelectorDraft | null;
  validationResult: ValidationResult | null;
  isProcessing: boolean;
  onValidate: () => void;
  onAIGenerate: () => void;
  onSave: () => void;
}

function ActionBar({ selectorDraft, validationResult, isProcessing, onValidate, onAIGenerate, onSave }: ActionBarProps) {
  return (
    <div className="p-3 border-t border-white/5 space-y-2">
      <div className="flex gap-2">
        <button
          onClick={onValidate}
          disabled={!selectorDraft}
          className="
            flex-1 h-8 flex items-center justify-center gap-1.5
            bg-zinc-900 border border-white/10 rounded-lg
            text-xs text-zinc-400 hover:text-zinc-200 hover:border-white/20
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          验证
        </button>
        <button
          onClick={onAIGenerate}
          disabled={isProcessing}
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
          AI 优化
        </button>
      </div>
      <button
        onClick={onSave}
        disabled={!validationResult?.valid}
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
// VALIDATION RESULT CARD
// =============================================================================

function ValidationResultCard({ result }: { result: ValidationResult }) {
  return (
    <div className={`
      p-2 rounded border
      ${result.valid 
        ? 'bg-emerald-500/5 border-emerald-500/20' 
        : 'bg-rose-500/5 border-rose-500/20'
      }
    `}>
      <div className="flex items-center gap-1.5">
        {result.valid ? (
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <span className={`text-[10px] ${result.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
          {result.valid ? '选择器验证通过' : '选择器验证失败'}
        </span>
      </div>
      {result.error && (
        <p className="text-[9px] text-rose-400/80 mt-1">{result.error}</p>
      )}
    </div>
  );
}

// =============================================================================
// QUICK ACTION PANEL - Direct element operations
// =============================================================================

interface QuickActionPanelProps {
  selector: string;
  onLog: (log: { timestamp: number; level: 'info' | 'error'; message: string }) => void;
}

function QuickActionPanel({ selector, onLog }: QuickActionPanelProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [extractedText, setExtractedText] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<'click' | 'input' | 'extract' | null>(null);

  const handleClick = async () => {
    setIsLoading('click');
    try {
      const result = await sendToContentScript<{ success: boolean; error?: string }>({
        type: 'EXECUTE_CLICK',
        payload: { selector },
      });
      
      if (result.success) {
        onLog({ timestamp: Date.now(), level: 'info', message: `点击成功: ${selector}` });
      } else {
        onLog({ timestamp: Date.now(), level: 'error', message: result.error || '点击失败' });
      }
    } catch (error) {
      onLog({ timestamp: Date.now(), level: 'error', message: `点击失败: ${error}` });
    } finally {
      setIsLoading(null);
    }
  };

  const handleInput = async () => {
    if (!inputValue.trim()) return;
    
    setIsLoading('input');
    try {
      const result = await sendToContentScript<{ success: boolean; error?: string }>({
        type: 'EXECUTE_INPUT',
        payload: { selector, value: inputValue },
      });
      
      if (result.success) {
        onLog({ timestamp: Date.now(), level: 'info', message: `输入成功: "${inputValue}"` });
        setInputValue('');
      } else {
        onLog({ timestamp: Date.now(), level: 'error', message: result.error || '输入失败' });
      }
    } catch (error) {
      onLog({ timestamp: Date.now(), level: 'error', message: `输入失败: ${error}` });
    } finally {
      setIsLoading(null);
    }
  };

  const handleExtract = async () => {
    setIsLoading('extract');
    try {
      const result = await sendToContentScript<{ success: boolean; data?: string; error?: string }>({
        type: 'EXECUTE_EXTRACT',
        payload: { selector },
      });
      
      if (result.success) {
        setExtractedText(result.data || '');
        onLog({ timestamp: Date.now(), level: 'info', message: `读取成功: "${result.data}"` });
      } else {
        onLog({ timestamp: Date.now(), level: 'error', message: result.error || '读取失败' });
      }
    } catch (error) {
      onLog({ timestamp: Date.now(), level: 'error', message: `读取失败: ${error}` });
    } finally {
      setIsLoading(null);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInput();
    }
  };

  return (
    <div className="p-2.5 rounded-lg bg-zinc-800/60 border border-emerald-500/20">
      <h3 className="text-[10px] font-medium text-emerald-400 mb-2.5 flex items-center gap-1.5">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        快速操作
      </h3>
      
      <div className="space-y-2">
        {/* Click Action */}
        <button
          onClick={handleClick}
          disabled={isLoading !== null}
          className="
            w-full h-7 flex items-center justify-center gap-1.5
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
            onClick={handleInput}
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

        {/* Extract Action */}
        <button
          onClick={handleExtract}
          disabled={isLoading !== null}
          className="
            w-full h-7 flex items-center justify-center gap-1.5
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
          <span>读取文本</span>
        </button>

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
