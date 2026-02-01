/**
 * =============================================================================
 * Homura SidePanel - PathVisualizer Component
 * =============================================================================
 * 
 * Vertical Ancestor Stepper - Renders the ancestor path as an interactive
 * vertical stepper from target element to semantic root
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { AncestorInfo, PathSelector } from '@shared/selectorBuilder';
import type { UnifiedSelector } from '@shared/types';
import { sendToContentScript } from '../utils/ensureContentScript';

interface PathVisualizerProps {
  ancestorPath: AncestorInfo[];
  pathSelector?: PathSelector;
  targetSelector?: string;
  unifiedSelector?: UnifiedSelector | null;  // New prop for unified selector
  onPathChange?: (includedDepths: number[]) => void;
  onLog?: (log: { timestamp: number; level: 'info' | 'error'; message: string }) => void;
}

type ActionType = 'highlight' | 'click' | 'extract' | 'input' | null;

// Get color based on semantic score
function getScoreColor(score: number): { text: string; bg: string } {
  if (score >= 0.7) {
    return { text: 'text-emerald-400', bg: 'bg-emerald-500/20' };
  } else if (score >= 0.4) {
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/20' };
  }
  return { text: 'text-zinc-500', bg: 'bg-zinc-700/50' };
}

// Checkbox Icon
function CheckIcon({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      {checked ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      )}
    </svg>
  );
}

// Tree branch icon
function TreeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
    </svg>
  );
}

interface AncestorItemProps {
  ancestor: AncestorInfo;
  index: number;
  isLast: boolean;
  included: boolean;
  onToggle: () => void;
}

function AncestorItem({ ancestor, index, isLast, included, onToggle }: AncestorItemProps) {
  const scoreColors = getScoreColor(ancestor.semanticScore);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ x: 4 }}
      className="relative"
    >
      {/* Vertical connector line */}
      {!isLast && (
        <div className="absolute left-[11px] top-7 bottom-0 w-px bg-zinc-800" />
      )}
      
      <div 
        onClick={onToggle}
        className={`
          flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer
          transition-all duration-200
          ${included 
            ? ancestor.isSemanticRoot
              ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50'
              : 'bg-zinc-900/80 border-zinc-700/50 hover:border-zinc-600'
            : 'bg-zinc-950/50 border-zinc-800/30 opacity-50 hover:opacity-70'}
        `}
      >
        {/* Checkbox */}
        <button
          className={`
            shrink-0 w-[22px] h-[22px] flex items-center justify-center
            rounded-full transition-colors
            ${included 
              ? ancestor.isSemanticRoot 
                ? 'text-emerald-400' 
                : 'text-violet-400'
              : 'text-zinc-600'}
          `}
        >
          <CheckIcon checked={included} className="w-[18px] h-[18px]" />
        </button>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Tag + Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-zinc-500">
              {ancestor.tagName}
            </span>
            <code className={`
              text-[10px] font-mono truncate
              ${included ? 'text-violet-400' : 'text-zinc-600'}
            `}>
              {ancestor.selector}
            </code>
            {ancestor.isSemanticRoot && (
              <span className="px-1.5 py-0.5 text-[8px] rounded bg-emerald-500/20 text-emerald-400 font-medium">
                语义根
              </span>
            )}
          </div>
          
          {/* Classes preview */}
          {ancestor.classes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {ancestor.classes.slice(0, 4).map((cls, i) => (
                <span 
                  key={i} 
                  className={`
                    text-[8px] font-mono px-1 py-0.5 rounded
                    ${included ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-900 text-zinc-700'}
                  `}
                >
                  .{cls}
                </span>
              ))}
              {ancestor.classes.length > 4 && (
                <span className="text-[8px] text-zinc-700">
                  +{ancestor.classes.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Semantic Score */}
        <div className={`
          shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono
          ${scoreColors.bg} ${scoreColors.text}
        `}>
          {Math.round(ancestor.semanticScore * 100)}%
        </div>
      </div>
    </motion.div>
  );
}

export function PathVisualizer({ 
  ancestorPath, 
  pathSelector, 
  targetSelector, 
  unifiedSelector,
  onPathChange,
  onLog 
}: PathVisualizerProps) {
  // Track which ancestors are included in the path
  const [includedDepths, setIncludedDepths] = React.useState<Set<number>>(() => {
    // Default: include all ancestors with score >= 0.3 or semantic roots
    const defaults = new Set<number>();
    ancestorPath.forEach((a, i) => {
      if (a.semanticScore >= 0.3 || a.isSemanticRoot) {
        defaults.add(i);
      }
    });
    return defaults;
  });
  
  // Quick actions state
  const [isLoading, setIsLoading] = React.useState<ActionType>(null);
  const [inputValue, setInputValue] = React.useState('');
  const [extractedText, setExtractedText] = React.useState<string | null>(null);
  
  // Reset when ancestorPath changes
  React.useEffect(() => {
    const defaults = new Set<number>();
    ancestorPath.forEach((a, i) => {
      if (a.semanticScore >= 0.3 || a.isSemanticRoot) {
        defaults.add(i);
      }
    });
    setIncludedDepths(defaults);
    // Also reset extracted text when element changes
    setExtractedText(null);
  }, [ancestorPath]);
  
  const handleToggle = (index: number) => {
    const newSet = new Set(includedDepths);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setIncludedDepths(newSet);
    onPathChange?.(Array.from(newSet).sort((a, b) => a - b));
  };
  
  // Generate the current path selector based on included items
  const generatedSelector = React.useMemo(() => {
    if (pathSelector?.fullSelector) {
      return pathSelector.fullSelector;
    }
    
    // Build from included ancestors
    const parts: string[] = [];
    const sortedIndices = Array.from(includedDepths).sort((a, b) => b - a); // Reverse order (root first)
    
    sortedIndices.forEach(i => {
      const ancestor = ancestorPath[i];
      if (ancestor) {
        parts.push(ancestor.selector);
      }
    });
    
    if (targetSelector) {
      parts.push(targetSelector);
    }
    
    return parts.join(' ') || targetSelector || '*';
  }, [ancestorPath, includedDepths, pathSelector, targetSelector]);

  // Quick action handler for Path mode
  const handleAction = async (action: ActionType, value?: string) => {
    if (!action) return;
    setIsLoading(action);
    
    try {
      const selectorToUse = unifiedSelector?.fullSelector || generatedSelector;
      
      const payload = {
        targetSelector: selectorToUse,
        action,
        inputValue: value,
        strategy: 'path' as const,
        // No scope/anchor for path mode
        scopeSelector: undefined,
        anchorSelector: undefined,
        anchorValue: undefined,
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
        onLog?.({ timestamp: Date.now(), level: 'info', message: msg });
      } else {
        onLog?.({ timestamp: Date.now(), level: 'error', message: result.error || `${actionNames[action]}失败` });
      }
    } catch (error) {
      onLog?.({ timestamp: Date.now(), level: 'error', message: `操作失败: ${error}` });
    } finally {
      setIsLoading(null);
    }
  };
  
  if (!ancestorPath.length) {
    return (
      <div className="p-3 text-center text-xs text-zinc-500">
        无祖先路径数据
      </div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-3 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <TreeIcon className="w-4 h-4 text-violet-400" />
        <h3 className="text-xs font-medium text-zinc-300">元素路径</h3>
        <span className="text-[9px] text-zinc-600">
          ({ancestorPath.length} 层)
        </span>
      </div>
      
      {/* Target Element Preview */}
      {targetSelector && (
        <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-violet-400 font-medium">TARGET</span>
            <code className="text-[10px] font-mono text-violet-300 truncate">
              {targetSelector}
            </code>
          </div>
        </div>
      )}
      
      {/* Ancestor Steps */}
      <div className="space-y-1.5 pl-1">
        {ancestorPath.map((ancestor, index) => (
          <AncestorItem
            key={`${ancestor.depth}-${ancestor.selector}`}
            ancestor={ancestor}
            index={index}
            isLast={index === ancestorPath.length - 1}
            included={includedDepths.has(index)}
            onToggle={() => handleToggle(index)}
          />
        ))}
      </div>
      
      {/* Generated Selector Preview */}
      <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-violet-500/20">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] text-zinc-500">生成的选择器</span>
          <button
            onClick={() => navigator.clipboard.writeText(generatedSelector)}
            className="text-[9px] text-violet-400 hover:text-violet-300 transition-colors"
          >
            复制
          </button>
        </div>
        <code className="block text-[10px] font-mono text-violet-300 break-all leading-relaxed">
          {generatedSelector}
        </code>
        {pathSelector?.confidence !== undefined && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[9px] text-zinc-600">置信度:</span>
            <span className={`text-[9px] font-mono ${
              pathSelector.confidence >= 0.7 ? 'text-emerald-400' : 
              pathSelector.confidence >= 0.4 ? 'text-yellow-400' : 'text-zinc-500'
            }`}>
              {Math.round(pathSelector.confidence * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Quick Actions for Path Mode */}
      <div className="p-2.5 rounded-lg bg-zinc-800/60 border border-violet-500/20">
        <h4 className="text-[10px] font-medium text-violet-400 mb-2 flex items-center gap-1.5">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          快速操作
          <span className="ml-auto px-1.5 py-0.5 text-[8px] rounded bg-violet-500/20 text-violet-400">
            Path
          </span>
        </h4>
        
        <div className="space-y-1.5">
          {/* Action Buttons Row */}
          <div className="flex gap-1.5">
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
    </motion.div>
  );
}
