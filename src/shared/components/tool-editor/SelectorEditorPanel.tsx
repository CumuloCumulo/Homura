/**
 * =============================================================================
 * SelectorEditorPanel - 选择器编辑面板
 *
 * 共享组件：为 CLICK/INPUT/EXTRACT_TEXT/WAIT_FOR 工具提供选择器编辑 UI
 *
 * 用途:
 * - 编辑 Scope/Anchor/Target 选择器
 * - 选择锚点候选
 * - 集成测试面板 (可选)
 *
 * 使用位置:
 * - Sidepanel RecordingPanel (展开的非 navigate 操作)
 * - Dashboard ToolDetailEditor (非 NAVIGATE 工具编辑)
 */

import React, { useState, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface SelectorEditorPanelProps {
  /** 选择器配置 */
  selector: {
    scope?: string;
    anchor?: {
      selector: string;
      value: string;
      matchMode: 'contains' | 'exact' | 'startsWith' | 'endsWith';
    };
    target: string;
  };

  /** 锚点候选 */
  anchorCandidates?: Array<{
    selector: string;
    text?: string;
    attribute?: { value: string; name: string };
  }>;

  /** 事件回调 */
  onChange: (selector: SelectorEditorPanelProps['selector']) => void;

  /** 测试回调 (可选) */
  onTest?: (
    action: 'highlight' | 'click' | 'extract',
    value?: string,
  ) => Promise<void>;

  /** 日志回调 */
  onLog?: (log: {
    timestamp: number;
    level: 'info' | 'error';
    message: string;
  }) => void;

  /** UI 选项 */
  compact?: boolean;
  showTests?: boolean;
  readOnly?: boolean;
}

// =============================================================================
// SELECTOR SECTION COMPONENT
// =============================================================================

interface SelectorSectionProps {
  label: string;
  sublabel: string;
  color: 'blue' | 'emerald' | 'violet';
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

function SelectorSection({
  label,
  sublabel,
  color,
  value,
  onChange,
  readOnly = false,
}: SelectorSectionProps) {
  const colorStyles = {
    blue: {
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      focus: 'focus:border-blue-500/50',
    },
    emerald: {
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      focus: 'focus:border-emerald-500/50',
    },
    violet: {
      border: 'border-violet-500/20',
      text: 'text-violet-400',
      focus: 'focus:border-violet-500/50',
    },
  };

  const styles = colorStyles[color];

  return (
    <div className={`p-3 rounded-lg bg-zinc-900/80 border ${styles.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-medium ${styles.text}`}>
          {label}
        </span>
        <span className="text-[8px] text-zinc-600">{sublabel}</span>
      </div>
      {readOnly ? (
        <code
          className={`block text-[10px] font-mono ${styles.text} break-all leading-relaxed`}
        >
          {value || '(未设置)'}
        </code>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="选择器..."
          className={`
            w-full h-8 px-3 text-[11px] font-mono
            bg-black/30 border border-zinc-700 rounded
            ${styles.text} placeholder:text-zinc-600
            ${styles.focus} focus:outline-none
            transition-colors
          `}
        />
      )}
    </div>
  );
}

// =============================================================================
// ANCHOR SECTION COMPONENT
// =============================================================================

interface AnchorSectionProps {
  selector: string;
  value: string;
  matchMode: 'contains' | 'exact' | 'startsWith' | 'endsWith';
  onSelectorChange: (value: string) => void;
  onValueChange: (value: string) => void;
  onMatchModeChange: (
    mode: 'contains' | 'exact' | 'startsWith' | 'endsWith',
  ) => void;
  readOnly?: boolean;
}

function AnchorSection({
  selector,
  value,
  matchMode,
  onSelectorChange,
  onValueChange,
  onMatchModeChange,
  readOnly = false,
}: AnchorSectionProps) {
  return (
    <div className="p-3 rounded-lg bg-zinc-900/80 border border-emerald-500/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-emerald-400">ANCHOR</span>
        <span className="text-[8px] text-zinc-600">定位锚点</span>
      </div>
      <div className="space-y-2">
        {/* Selector */}
        <div>
          <label className="text-[9px] text-zinc-500 mb-1 block">
            锚点选择器
          </label>
          {readOnly ? (
            <code className="block text-[10px] font-mono text-emerald-400 break-all">
              {selector || '(未设置)'}
            </code>
          ) : (
            <input
              type="text"
              value={selector}
              onChange={(e) => onSelectorChange(e.target.value)}
              placeholder="选择器..."
              className="
                w-full h-7 px-2 text-[10px] font-mono
                bg-black/30 border border-zinc-700 rounded
                text-emerald-400 placeholder:text-zinc-600
                focus:border-emerald-500/50 focus:outline-none
                transition-colors
              "
            />
          )}
        </div>
        {/* Value + Match Mode */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[9px] text-zinc-500 mb-1 block">
              匹配值
            </label>
            {readOnly ? (
              <code className="block text-[10px] font-mono text-emerald-300 break-all">
                {value || '(未设置)'}
              </code>
            ) : (
              <input
                type="text"
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                placeholder="匹配值..."
                className="
                  w-full h-7 px-2 text-[10px] font-mono
                  bg-black/30 border border-zinc-700 rounded
                  text-emerald-300 placeholder:text-zinc-600
                  focus:border-emerald-500/50 focus:outline-none
                  transition-colors
                "
              />
            )}
          </div>
          <div className="w-20">
            <label className="text-[9px] text-zinc-500 mb-1 block">
              匹配方式
            </label>
            {readOnly ? (
              <div className="h-7 px-2 flex items-center text-[10px] text-zinc-400">
                {matchMode === 'contains'
                  ? '包含'
                  : matchMode === 'exact'
                    ? '精确'
                    : matchMode === 'startsWith'
                      ? '开头'
                      : '结尾'}
              </div>
            ) : (
              <select
                value={matchMode}
                onChange={(e) =>
                  onMatchModeChange(
                    e.target.value as
                      | 'contains'
                      | 'exact'
                      | 'startsWith'
                      | 'endsWith',
                  )
                }
                className="
                  w-full h-7 px-1 text-[9px]
                  bg-black/30 border border-zinc-700 rounded
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SelectorEditorPanel({
  selector,
  anchorCandidates = [],
  onChange,
  onTest: _onTest, // 保留接口兼容性，暂未使用
  onLog: _onLog, // 保留接口兼容性，暂未使用
  compact: _compact = false, // 保留接口兼容性，暂未使用
  showTests: _showTests = false, // 保留接口兼容性，暂未使用
  readOnly = false,
}: SelectorEditorPanelProps) {
  const [localSelector, setLocalSelector] = useState(selector);

  // Sync with props
  React.useEffect(() => {
    setLocalSelector(selector);
  }, [selector]);

  const handleChange = useCallback(
    (updates: Partial<typeof selector>) => {
      const newSelector = { ...localSelector, ...updates };
      setLocalSelector(newSelector);
      onChange(newSelector);
    },
    [localSelector, onChange],
  );

  const handleApplyAnchor = useCallback(
    (candidate: (typeof anchorCandidates)[0]) => {
      if (!candidate) return;
      handleChange({
        anchor: {
          selector: candidate.selector,
          value: candidate.text || candidate.attribute?.value || '',
          matchMode: 'contains',
        },
      });
    },
    [handleChange],
  );

  return (
    <div className="space-y-3">
      {/* Scope */}
      {localSelector.scope && (
        <SelectorSection
          label="SCOPE"
          sublabel="容器作用域"
          color="blue"
          value={localSelector.scope}
          onChange={(value) => handleChange({ scope: value })}
          readOnly={readOnly}
        />
      )}

      {/* Anchor */}
      {localSelector.anchor && (
        <AnchorSection
          selector={localSelector.anchor.selector}
          value={localSelector.anchor.value}
          matchMode={localSelector.anchor.matchMode}
          onSelectorChange={(value) =>
            handleChange({
              anchor: { ...localSelector.anchor!, selector: value },
            })
          }
          onValueChange={(value) =>
            handleChange({
              anchor: { ...localSelector.anchor!, value },
            })
          }
          onMatchModeChange={(matchMode) =>
            handleChange({
              anchor: { ...localSelector.anchor!, matchMode },
            })
          }
          readOnly={readOnly}
        />
      )}

      {/* Target */}
      <SelectorSection
        label="TARGET"
        sublabel="操作目标"
        color="violet"
        value={localSelector.target}
        onChange={(value) => handleChange({ target: value })}
        readOnly={readOnly}
      />

      {/* Anchor Candidates */}
      {!readOnly && anchorCandidates.length > 0 && (
        <div className="pt-1">
          <p className="text-[9px] text-zinc-600 mb-2">可用锚点候选:</p>
          <div className="flex flex-wrap gap-1.5">
            {anchorCandidates.slice(0, 6).map((candidate, i) => {
              const displayText =
                candidate.text || candidate.attribute?.value || '';
              const truncated =
                displayText.length > 15
                  ? displayText.slice(0, 15) + '...'
                  : displayText;

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
