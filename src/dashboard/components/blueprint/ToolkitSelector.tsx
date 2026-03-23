/**
 * =============================================================================
 * Homura Dashboard - Toolkit Selector
 * =============================================================================
 *
 * Component for selecting toolkits to associate with a blueprint
 */

import React from 'react';
import { useToolkitStore } from '../../stores/toolkitStore';

interface ToolkitSelectorProps {
  selectedToolkitId: string | null;
  onSelect: (toolkitId: string | null) => void;
  disabled?: boolean;
}

export function ToolkitSelector({
  selectedToolkitId,
  onSelect,
  disabled = false,
}: ToolkitSelectorProps) {
  const { toolkits } = useToolkitStore();
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedToolkit = selectedToolkitId
    ? toolkits.find((t) => t.id === selectedToolkitId)
    : null;

  return (
    <div className="relative">
      <label className="text-[10px] text-zinc-500 mb-1.5 block">
        关联工具集
      </label>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full h-9 px-3 flex items-center justify-between
          bg-zinc-900/80 border border-white/5 rounded
          text-xs text-zinc-300 text-left
          focus:border-fuchsia-500/30 focus:outline-none
          transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/10 cursor-pointer'}
        `}
      >
        <span className={selectedToolkit ? '' : 'text-zinc-600'}>
          {selectedToolkit?.name || '选择工具集...'}
        </span>
        <svg
          className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-zinc-900 border border-white/10 rounded-lg shadow-xl overflow-hidden">
            <div className="p-1.5 border-b border-white/5">
              <button
                onClick={() => {
                  onSelect(null);
                  setIsOpen(false);
                }}
                className="w-full h-7 px-2 flex items-center gap-2 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                无关联
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto p-1.5">
              {toolkits.map((toolkit) => (
                <button
                  key={toolkit.id}
                  onClick={() => {
                    onSelect(toolkit.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full h-9 px-2.5 flex items-center gap-2 rounded transition-colors
                    ${
                      selectedToolkitId === toolkit.id
                        ? 'bg-fuchsia-500/20 text-fuchsia-400'
                        : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
                    }
                  `}
                >
                  <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center">
                    <svg
                      className="w-2.5 h-2.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-[11px] font-medium">
                      {toolkit.name}
                    </div>
                    <div className="text-[9px] text-zinc-600">
                      {toolkit.tools.length} 个工具
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {toolkits.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-[10px] text-zinc-600">还没有工具集</p>
                <p className="text-[9px] text-zinc-700 mt-1">
                  先在工具集编排中创建
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
