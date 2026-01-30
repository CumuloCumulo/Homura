/**
 * =============================================================================
 * Homura SidePanel - Selector Builder
 * =============================================================================
 * 
 * Build and test Scope + Anchor + Target selectors
 */

import React from 'react';
import { useRecordingStore } from '../stores/recordingStore';
import { sendToContentScript } from '../utils/ensureContentScript';
import type { ValidationResult } from '@shared/selectorBuilder';

export function SelectorBuilder() {
  const { 
    analysis, 
    selectorDraft, 
    setSelectorDraft,
    addLog,
    isProcessing,
    setProcessing,
    setMode
  } = useRecordingStore();

  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);

  // Initialize draft from analysis
  React.useEffect(() => {
    if (analysis && !selectorDraft) {
      // Import dynamically to avoid circular dependency
      import('@shared/selectorBuilder').then(({ createSelectorDraft }) => {
        const draft = createSelectorDraft(analysis, 'CLICK');
        setSelectorDraft(draft);
      });
    }
  }, [analysis, selectorDraft, setSelectorDraft]);

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
      const result = await sendToContentScript<{ success: boolean; draft?: typeof selectorDraft; error?: string }>({
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

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-xs text-zinc-500">请先在检查模式中选择元素</p>
        <button
          onClick={() => setMode('inspect')}
          className="mt-3 px-4 py-2 text-xs text-violet-400 hover:text-violet-300"
        >
          返回检查模式
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Selector Editor */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Scope */}
        {selectorDraft?.scope && (
          <SelectorSection
            title="Scope (作用域)"
            color="blue"
            value={selectorDraft.scope.selector}
            onChange={(value) => setSelectorDraft({
              ...selectorDraft,
              scope: { ...selectorDraft.scope!, selector: value },
            })}
            info={`匹配 ${selectorDraft.scope.matchCount || '?'} 个容器`}
          />
        )}

        {/* Anchor */}
        {selectorDraft?.anchor && (
          <SelectorSection
            title="Anchor (锚点)"
            color="green"
            value={selectorDraft.anchor.selector}
            onChange={(value) => setSelectorDraft({
              ...selectorDraft,
              anchor: { ...selectorDraft.anchor!, selector: value },
            })}
          >
            <div className="mt-2 space-y-2">
              <div>
                <label className="text-[9px] text-zinc-500">匹配值 (支持 {`{{变量}}`})</label>
                <input
                  type="text"
                  value={selectorDraft.anchor.value}
                  onChange={(e) => setSelectorDraft({
                    ...selectorDraft,
                    anchor: { ...selectorDraft.anchor!, value: e.target.value },
                  })}
                  className="
                    w-full h-7 mt-1 px-2 text-[10px] font-mono
                    bg-black/30 border border-zinc-800 rounded
                    text-emerald-400 placeholder:text-zinc-700
                    focus:border-emerald-500/50 focus:outline-none
                  "
                />
              </div>
              <div>
                <label className="text-[9px] text-zinc-500">匹配模式</label>
                <select
                  value={selectorDraft.anchor.matchMode}
                  onChange={(e) => setSelectorDraft({
                    ...selectorDraft,
                    anchor: { ...selectorDraft.anchor!, matchMode: e.target.value as 'contains' | 'exact' },
                  })}
                  className="
                    w-full h-7 mt-1 px-2 text-[10px]
                    bg-black/30 border border-zinc-800 rounded
                    text-zinc-400
                    focus:border-zinc-600 focus:outline-none
                  "
                >
                  <option value="contains">包含</option>
                  <option value="exact">精确匹配</option>
                  <option value="startsWith">开头匹配</option>
                  <option value="endsWith">结尾匹配</option>
                </select>
              </div>
            </div>
          </SelectorSection>
        )}

        {/* Target */}
        {selectorDraft && (
          <SelectorSection
            title="Target (目标)"
            color="violet"
            value={selectorDraft.target.selector}
            onChange={(value) => setSelectorDraft({
              ...selectorDraft,
              target: { ...selectorDraft.target, selector: value },
            })}
          >
            <div className="mt-2">
              <label className="text-[9px] text-zinc-500">操作类型</label>
              <select
                value={selectorDraft.target.action}
                onChange={(e) => setSelectorDraft({
                  ...selectorDraft,
                  target: { ...selectorDraft.target, action: e.target.value },
                })}
                className="
                  w-full h-7 mt-1 px-2 text-[10px]
                  bg-black/30 border border-zinc-800 rounded
                  text-zinc-400
                  focus:border-zinc-600 focus:outline-none
                "
              >
                <option value="CLICK">CLICK</option>
                <option value="INPUT">INPUT</option>
                <option value="EXTRACT_TEXT">EXTRACT_TEXT</option>
                <option value="WAIT_FOR">WAIT_FOR</option>
              </select>
            </div>
          </SelectorSection>
        )}

        {/* Validation Result */}
        {validationResult && (
          <div className={`
            p-3 rounded-lg border
            ${validationResult.valid 
              ? 'bg-emerald-500/5 border-emerald-500/20' 
              : 'bg-rose-500/5 border-rose-500/20'
            }
          `}>
            <div className="flex items-center gap-2">
              {validationResult.valid ? (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className={`text-xs ${validationResult.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                {validationResult.valid ? '选择器验证通过' : '选择器验证失败'}
              </span>
            </div>
            {validationResult.error && (
              <p className="text-[10px] text-rose-400/80 mt-1">{validationResult.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-white/5 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleValidate}
            className="
              flex-1 h-8 flex items-center justify-center gap-1.5
              bg-zinc-900 border border-white/10 rounded-lg
              text-xs text-zinc-400 hover:text-zinc-200 hover:border-white/20
              transition-colors
            "
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            验证
          </button>
          <button
            onClick={handleAIGenerate}
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
          onClick={handleSaveTool}
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
    </div>
  );
}

interface SelectorSectionProps {
  title: string;
  color: 'blue' | 'green' | 'violet';
  value: string;
  onChange: (value: string) => void;
  info?: string;
  children?: React.ReactNode;
}

function SelectorSection({ title, color, value, onChange, info, children }: SelectorSectionProps) {
  const colors = {
    blue: 'border-blue-500/20 text-blue-400',
    green: 'border-emerald-500/20 text-emerald-400',
    violet: 'border-violet-500/20 text-violet-400',
  };

  return (
    <div className={`p-3 rounded-lg bg-zinc-900/50 border ${colors[color].split(' ')[0]}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-xs font-medium ${colors[color].split(' ')[1]}`}>{title}</h3>
        {info && <span className="text-[9px] text-zinc-500">{info}</span>}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full h-7 px-2 text-[10px] font-mono
          bg-black/30 border border-zinc-800 rounded
          ${colors[color].split(' ')[1]} placeholder:text-zinc-700
          focus:border-${color}-500/50 focus:outline-none
        `}
      />
      {children}
    </div>
  );
}
