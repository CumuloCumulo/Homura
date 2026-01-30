/**
 * =============================================================================
 * Homura SidePanel - Inspect Mode
 * =============================================================================
 * 
 * Element inspection interface for analyzing page elements
 */

import { useRecordingStore } from '../stores/recordingStore';
import { sendToContentScript } from '../utils/ensureContentScript';
import type { ElementAnalysis, AnchorCandidate } from '@shared/selectorBuilder';

export function InspectMode() {
  const { 
    isInspecting, 
    setInspecting, 
    analysis, 
    setMode,
    setSelectedElement,
    addLog 
  } = useRecordingStore();

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

  const handleBuildSelector = () => {
    if (analysis) {
      setSelectedElement(analysis.target);
      setMode('build');
    }
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
          <AnalysisCard analysis={analysis} onBuild={handleBuildSelector} />
        ) : (
          <EmptyState isInspecting={isInspecting} />
        )}
      </div>
    </div>
  );
}

interface AnalysisCardProps {
  analysis: ElementAnalysis;
  onBuild: () => void;
}

function AnalysisCard({ analysis, onBuild }: AnalysisCardProps) {
  const { containerType, anchorCandidates, relativeSelector, minimalSelector } = analysis;

  return (
    <div className="space-y-3">
      {/* Element Info */}
      <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5">
        <h3 className="text-xs font-medium text-zinc-300 mb-2">目标元素</h3>
        <code className="block text-[10px] font-mono text-violet-400 break-all">
          {minimalSelector}
        </code>
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

      {/* Build Button */}
      <button
        onClick={onBuild}
        className="
          w-full h-9 flex items-center justify-center gap-2
          bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 
          rounded-lg text-xs font-medium text-white
          hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-neon
          transition-all duration-200
        "
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
        <span>构建选择器</span>
      </button>
    </div>
  );
}

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
