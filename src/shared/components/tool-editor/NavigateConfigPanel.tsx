/**
 * =============================================================================
 * NavigateConfigPanel - 导航配置面板
 * =============================================================================
 *
 * 共享组件：为 NAVIGATE 工具提供配置和测试 UI
 *
 * 用途:
 * - 配置导航目标 URL
 * - 设置新标签页/当前标签页跳转
 * - 测试导航操作
 *
 * 使用位置:
 * - Sidepanel RecordingPanel (展开的 navigate 操作)
 * - Dashboard ToolDetailEditor (NAVIGATE 工具编辑)
 */

import { useState } from "react";

// =============================================================================
// TYPES
// =============================================================================

export interface NavigateConfigPanelProps {
  /** 目标 URL */
  url: string;

  /** 是否在新标签页打开 */
  newTab: boolean;

  /** 是否等待页面加载 */
  waitForLoad?: boolean;

  /** 事件回调 */
  onUrlChange: (url: string) => void;
  onNewTabChange: (newTab: boolean) => void;
  onTestCurrentTab: () => Promise<void>;
  onTestNewTab: () => Promise<void>;

  /** 日志回调 */
  onLog?: (log: {
    timestamp: number;
    level: "info" | "error";
    message: string;
  }) => void;

  /** UI 选项 */
  compact?: boolean;
  readOnly?: boolean;
}

// =============================================================================
// ICONS
// =============================================================================

const NavigateIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg
    className="w-3 h-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const NewTabIcon = () => (
  <svg
    className="w-3 h-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

// =============================================================================
// TOGGLE COMPONENT
// =============================================================================

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-5 w-9 items-center rounded-full transition-colors
        ${checked ? "bg-violet-500" : "bg-zinc-700"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <span
        className={`
          inline-block h-3.5 w-3.5 transform rounded-full bg-white transition
          ${checked ? "translate-x-5" : "translate-x-1"}
        `}
      />
    </button>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function NavigateConfigPanel({
  url,
  newTab,
  waitForLoad = true,
  onUrlChange,
  onNewTabChange,
  onTestCurrentTab,
  onTestNewTab,
  onLog: _onLog, // 保留接口兼容性，暂未使用
  compact: _compact = false, // 保留接口兼容性，暂未使用
  readOnly = false,
}: NavigateConfigPanelProps) {
  const [isTesting, setIsTesting] = useState<"current" | "new" | null>(null);

  const handleTestCurrentTab = async () => {
    if (isTesting) return;
    setIsTesting("current");
    try {
      await onTestCurrentTab();
    } finally {
      setIsTesting(null);
    }
  };

  const handleTestNewTab = async () => {
    if (isTesting) return;
    setIsTesting("new");
    try {
      await onTestNewTab();
    } finally {
      setIsTesting(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* URL 配置 */}
      <div className="p-3 rounded-lg bg-zinc-900/80 border border-blue-500/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-blue-400 flex items-center gap-1.5">
            <NavigateIcon />
            URL
          </span>
        </div>
        {readOnly ? (
          <code
            className="block text-[11px] font-mono text-zinc-300 break-all leading-relaxed"
            title={url}
          >
            {url}
          </code>
        ) : (
          <input
            type="text"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://example.com"
            className="w-full h-8 px-3 text-xs bg-black/30 border border-zinc-700 rounded text-zinc-300 font-mono focus:border-blue-500/50 focus:outline-none transition-colors"
          />
        )}
      </div>

      {/* 新标签页开关 */}
      {!readOnly && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-white/5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-zinc-300">在新标签页打开</span>
            <span className="text-[9px] text-zinc-500">
              {newTab ? "每次执行创建新标签页" : "在当前标签页跳转"}
            </span>
          </div>
          <Toggle checked={newTab} onChange={onNewTabChange} />
        </div>
      )}

      {/* 测试按钮 */}
      <div className="flex gap-1.5">
        <button
          onClick={handleTestCurrentTab}
          disabled={isTesting !== null || readOnly}
          className={`
            flex-1 h-8 flex items-center justify-center gap-1.5 px-2 rounded-lg
            text-[10px] font-medium border transition-all duration-200
            ${
              isTesting === "current"
                ? "bg-blue-600/30 text-blue-400 border-blue-500/30"
                : "bg-blue-600/10 text-blue-400 border-blue-500/20 hover:bg-blue-600/20"
            }
            ${readOnly ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {isTesting === "current" ? (
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <RefreshIcon />
          )}
          <span>当前标签页跳转</span>
        </button>
        <button
          onClick={handleTestNewTab}
          disabled={isTesting !== null || readOnly}
          className={`
            flex-1 h-8 flex items-center justify-center gap-1.5 px-2 rounded-lg
            text-[10px] font-medium border transition-all duration-200
            ${
              isTesting === "new"
                ? "bg-violet-600/30 text-violet-400 border-violet-500/30"
                : "bg-violet-600/10 text-violet-400 border-violet-500/20 hover:bg-violet-600/20"
            }
            ${readOnly ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {isTesting === "new" ? (
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <NewTabIcon />
          )}
          <span>新标签页打开</span>
        </button>
      </div>

      {/* 等待加载状态指示 */}
      {!readOnly && waitForLoad && (
        <div className="flex items-center gap-2 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[9px] text-zinc-500">将等待页面加载完成</span>
        </div>
      )}
    </div>
  );
}
