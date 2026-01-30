/**
 * =============================================================================
 * Homura Dashboard - Rule Book Editor
 * =============================================================================
 * 
 * Markdown editor for writing automation rules
 */

import React from 'react';
import { useToolStore } from '../stores/toolStore';

export function RuleBookEditor() {
  const { ruleBook, setRuleBook, tools, isRunning, setRunning, addLog, clearLogs } = useToolStore();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Insert tool reference at cursor
  const insertToolReference = (toolName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = ruleBook;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const insertion = `【${toolName}】`;
    
    setRuleBook(before + insertion + after);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
      textarea.focus();
    }, 0);
  };

  const handleRunMission = async () => {
    setRunning(true);
    clearLogs();
    
    addLog({
      timestamp: Date.now(),
      level: 'info',
      message: '开始执行任务...',
    });

    // TODO: Implement actual mission execution with AI
    // This is a placeholder for the orchestrator integration
    
    setTimeout(() => {
      addLog({
        timestamp: Date.now(),
        level: 'info',
        message: '任务执行完成（模拟）',
      });
      setRunning(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">规则书</h2>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            使用 Markdown 编写自动化规则，用【工具名】引用工具
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tool Insert Dropdown */}
          <ToolInsertDropdown tools={tools} onInsert={insertToolReference} />
          
          {/* Run Button */}
          <button
            onClick={handleRunMission}
            disabled={isRunning}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium
              transition-all duration-200
              ${isRunning
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-neon'
              }
            `}
          >
            {isRunning ? (
              <>
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>执行中...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>运行</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4 pb-48 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={ruleBook}
          onChange={(e) => setRuleBook(e.target.value)}
          placeholder="# 规则书标题

1. 第一步：使用【工具名称】执行操作
2. 如果满足条件...
"
          className="
            w-full h-full p-4 rounded-lg
            bg-zinc-900/50 border border-white/5
            text-sm text-zinc-300 font-mono leading-relaxed
            placeholder:text-zinc-700
            focus:border-violet-500/30 focus:outline-none
            resize-none
          "
        />
      </div>
    </div>
  );
}

interface ToolInsertDropdownProps {
  tools: { tool_id: string; name: string }[];
  onInsert: (name: string) => void;
}

function ToolInsertDropdown({ tools, onInsert }: ToolInsertDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs
          bg-zinc-900 border border-white/5 text-zinc-400
          hover:text-zinc-200 hover:border-white/10
          transition-colors
        "
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>插入工具</span>
      </button>

      {isOpen && (
        <div className="
          absolute right-0 top-full mt-1 w-48 py-1
          bg-zinc-900 border border-white/10 rounded-lg shadow-xl
          z-50
        ">
          {tools.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-500">
              还没有可用的工具
            </div>
          ) : (
            tools.map(tool => (
              <button
                key={tool.tool_id}
                onClick={() => {
                  onInsert(tool.name);
                  setIsOpen(false);
                }}
                className="
                  w-full px-3 py-2 text-left text-xs text-zinc-400
                  hover:bg-violet-500/10 hover:text-violet-400
                  transition-colors
                "
              >
                【{tool.name}】
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
