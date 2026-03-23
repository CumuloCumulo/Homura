/**
 * =============================================================================
 * Homura Dashboard - Rule Book Editor
 * =============================================================================
 *
 * Markdown editor for writing Rule Book with syntax highlighting
 */

import { useState, useEffect } from 'react';

interface RuleBookEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export function RuleBookEditor({ content, onChange, readOnly = false }: RuleBookEditorProps) {
  const [localContent, setLocalContent] = useState(content);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalContent(content);
    setHasChanges(false);
  }, [content]);

  const handleChange = (value: string) => {
    setLocalContent(value);
    setHasChanges(value !== content);
  };

  const handleSave = () => {
    onChange(localContent);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalContent(content);
    setHasChanges(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 px-4 py-2 border-b border-white/5 bg-zinc-900/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-medium text-zinc-300">Rule Book</h3>
          <span className="text-[9px] text-zinc-600">Markdown 格式</span>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-2.5 py-1 text-[10px] bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition-colors"
            >
              重置
            </button>
            <button
              onClick={handleSave}
              className="px-2.5 py-1 text-[10px] bg-fuchsia-500/20 text-fuchsia-400 rounded hover:bg-fuchsia-500/30 transition-colors"
            >
              保存
            </button>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden relative">
        <textarea
          value={localContent}
          onChange={(e) => handleChange(e.target.value)}
          readOnly={readOnly}
          placeholder="编写 Rule Book..."
          className="w-full h-full px-4 py-3 text-xs bg-zinc-950 text-zinc-300 font-mono leading-relaxed resize-none focus:outline-none"
          spellCheck={false}
        />

        {/* Line numbers (simplified) */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-zinc-900/50 border-r border-white/5 pt-3 select-none">
          {localContent.split('\n').map((_, index) => (
            <div
              key={index}
              className="text-[9px] text-zinc-700 text-right pr-2 leading-relaxed"
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Help / Template */}
      {content.trim().length === 0 && (
        <div className="p-4 border-t border-white/5 bg-zinc-900/30">
          <details className="group">
            <summary className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-400 select-none">
              Rule Book 模板 ▼
            </summary>
            <div className="mt-2 p-3 bg-zinc-900/50 rounded border border-white/5">
              <pre className="text-[9px] text-zinc-600 font-mono whitespace-pre-wrap">
{`# 规则名称

## 描述
简短描述这个自动化规则做什么

## 触发条件
- URL 匹配: \`https://example.com/*\`
- 页面元素存在: \`.submit-button\`

## 执行步骤
1. 等待页面加载完成
2. 填写表单字段
3. 点击提交按钮
4. 等待成功消息

## 验证
- 检查 URL 变为 \`/success\`
- 检查成功消息出现

## 错误处理
- 如果超时: 重试一次
- 如果元素不存在: 记录错误并继续`}
              </pre>
              <button
                onClick={() => handleChange(`# 规则名称

## 描述
简短描述这个自动化规则做什么

## 触发条件
- URL 匹配: \`https://example.com/*\`
- 页面元素存在: \`.submit-button\`

## 执行步骤
1. 等待页面加载完成
2. 填写表单字段
3. 点击提交按钮
4. 等待成功消息

## 验证
- 检查 URL 变为 \`/success\`
- 检查成功消息出现

## 错误处理
- 如果超时: 重试一次
- 如果元素不存在: 记录错误并继续
`)}
                className="mt-2 px-3 py-1.5 text-[10px] bg-fuchsia-500/10 text-fuchsia-400 rounded border border-fuchsia-500/20 hover:bg-fuchsia-500/20 transition-colors"
              >
                使用模板
              </button>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
