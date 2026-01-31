/**
 * =============================================================================
 * Homura SidePanel - SmartStatus Component
 * =============================================================================
 * 
 * AI Decision Panel - Displays AI's thinking process with breathing animation
 * Shows the current AI strategy and allows user override
 */

import { motion, AnimatePresence } from 'framer-motion';

export type AIStatus = 'idle' | 'analyzing' | 'decided';
export type AIStrategy = 'path_selector' | 'scope_anchor_target' | null;
export type ViewMode = 'path' | 'structure';

interface SmartStatusProps {
  status: AIStatus;
  strategy: AIStrategy;
  reasoning?: string;
  containerType?: string;
  onOverride?: (mode: ViewMode) => void;
}

// Sparkles Icon Component
function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

// Brain Icon for AI thinking
function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

// Status messages based on state
function getStatusMessage(status: AIStatus, strategy: AIStrategy, containerType?: string): { text: string; highlight?: string; mode?: string } {
  if (status === 'idle') {
    return { text: '点击 AI 优化按钮开始分析' };
  }
  
  if (status === 'analyzing') {
    return { text: '正在分析 DOM 结构...' };
  }
  
  if (status === 'decided' && strategy) {
    if (strategy === 'scope_anchor_target') {
      const typeLabel = containerType === 'table' ? '表格' : containerType === 'list' ? '列表' : '重复';
      return {
        text: `检测到${typeLabel}结构，已切换至`,
        highlight: 'Anchor Mode',
        mode: 'structure',
      };
    } else {
      return {
        text: '使用路径语义分析，已切换至',
        highlight: 'Path Mode',
        mode: 'path',
      };
    }
  }
  
  return { text: '等待分析...' };
}

export function SmartStatus({ status, strategy, reasoning, containerType, onOverride }: SmartStatusProps) {
  const message = getStatusMessage(status, strategy, containerType);
  
  // Don't render anything in idle state
  if (status === 'idle') {
    return null;
  }
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -5, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="mx-3 mb-3"
      >
        <div className={`
          p-3 rounded-lg border transition-all duration-300
          ${status === 'analyzing' 
            ? 'bg-zinc-900/60 border-violet-500/30 shadow-neon' 
            : 'bg-zinc-900/80 border-violet-500/20'}
        `}>
          <div className="flex items-start gap-2.5">
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {status === 'analyzing' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <BrainIcon className="w-4 h-4 text-violet-400" />
                </motion.div>
              ) : (
                <SparklesIcon className="w-4 h-4 text-fuchsia-400 animate-pulse" />
              )}
            </div>
            
            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-300 leading-relaxed">
                {message.text}
                {message.highlight && (
                  <code className={`
                    ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono
                    ${message.mode === 'structure' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-violet-500/20 text-violet-400'}
                  `}>
                    {message.highlight}
                  </code>
                )}
              </p>
              
              {/* Reasoning (if provided) */}
              {reasoning && status === 'decided' && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-1.5 text-[10px] text-zinc-500 leading-relaxed"
                >
                  {reasoning}
                </motion.p>
              )}
              
              {/* Override buttons */}
              {status === 'decided' && onOverride && (
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() => onOverride('path')}
                    className={`
                      px-2 py-1 text-[9px] rounded border transition-all
                      ${strategy === 'path_selector'
                        ? 'bg-violet-500/20 border-violet-500/40 text-violet-400'
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'}
                    `}
                  >
                    Path
                  </button>
                  <button
                    onClick={() => onOverride('structure')}
                    className={`
                      px-2 py-1 text-[9px] rounded border transition-all
                      ${strategy === 'scope_anchor_target'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'}
                    `}
                  >
                    Structure
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Analyzing progress bar */}
          {status === 'analyzing' && (
            <motion.div
              className="mt-2.5 h-0.5 bg-zinc-800 rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: '50%' }}
              />
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
