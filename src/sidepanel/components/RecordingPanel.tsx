/**
 * =============================================================================
 * Homura SidePanel - Recording Panel
 * =============================================================================
 * 
 * Record user actions for tool generation
 */

import { useRecordingStore } from '../stores/recordingStore';
import { sendToContentScript } from '../utils/ensureContentScript';
import type { RecordedAction } from '@shared/selectorBuilder';

export function RecordingPanel() {
  const { 
    isRecording, 
    setRecording, 
    recordedActions, 
    clearRecordedActions,
    addLog,
    isProcessing,
    setProcessing
  } = useRecordingStore();

  const handleStartRecording = async () => {
    try {
      await sendToContentScript({ type: 'START_RECORDING' });
      setRecording(true);
      clearRecordedActions();
      addLog({
        timestamp: Date.now(),
        level: 'info',
        message: '开始录制，请在页面上操作',
      });
    } catch (error) {
      addLog({
        timestamp: Date.now(),
        level: 'error',
        message: `启动录制失败: ${error}`,
      });
    }
  };

  const handleStopRecording = async () => {
    try {
      await sendToContentScript({ type: 'STOP_RECORDING' });
      setRecording(false);
      addLog({
        timestamp: Date.now(),
        level: 'info',
        message: `录制结束，共 ${recordedActions.length} 个操作`,
      });
    } catch (error) {
      console.error('Stop recording error:', error);
      setRecording(false);
    }
  };

  const handleGenerateTool = async () => {
    if (recordedActions.length === 0) {
      addLog({
        timestamp: Date.now(),
        level: 'error',
        message: '没有可用的录制操作',
      });
      return;
    }

    setProcessing(true);
    addLog({
      timestamp: Date.now(),
      level: 'info',
      message: '正在使用 AI 生成工具...',
    });

    try {
      const result = await sendToContentScript<{ success: boolean; tool?: { name: string }; error?: string }>({
        type: 'AI_GENERATE_TOOL',
        payload: { actions: recordedActions },
      });

      if (result.success && result.tool) {
        addLog({
          timestamp: Date.now(),
          level: 'info',
          message: `工具生成成功: ${result.tool.name}`,
        });
        // TODO: Open dialog to confirm and save tool
      } else {
        addLog({
          timestamp: Date.now(),
          level: 'error',
          message: `生成失败: ${result.error}`,
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

  return (
    <div className="flex flex-col h-full">
      {/* Control Panel */}
      <div className="p-3 border-b border-white/5">
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            className="
              w-full h-10 flex items-center justify-center gap-2
              bg-rose-600/80 rounded-lg text-sm font-medium text-white
              hover:bg-rose-500 hover:shadow-lg
              transition-all duration-200
            "
          >
            <div className="w-3 h-3 rounded-full bg-white" />
            <span>开始录制</span>
          </button>
        ) : (
          <button
            onClick={handleStopRecording}
            className="
              w-full h-10 flex items-center justify-center gap-2
              bg-zinc-800 border border-rose-500/30 rounded-lg 
              text-sm font-medium text-rose-400
              hover:bg-rose-500/10
              transition-all duration-200
            "
          >
            <div className="w-3 h-3 rounded bg-rose-500 animate-pulse" />
            <span>停止录制</span>
          </button>
        )}
      </div>

      {/* Recorded Actions */}
      <div className="flex-1 overflow-y-auto p-3">
        {recordedActions.length === 0 ? (
          <EmptyState isRecording={isRecording} />
        ) : (
          <div className="space-y-2">
            {recordedActions.map((action, index) => (
              <ActionItem key={index} action={action} index={index} />
            ))}
          </div>
        )}
      </div>

      {/* Generate Button */}
      {recordedActions.length > 0 && !isRecording && (
        <div className="p-3 border-t border-white/5">
          <button
            onClick={handleGenerateTool}
            disabled={isProcessing}
            className="
              w-full h-9 flex items-center justify-center gap-2
              bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 
              rounded-lg text-xs font-medium text-white
              hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-neon
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
          >
            {isProcessing ? (
              <>
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                <span>AI 生成中...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>AI 生成工具</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function ActionItem({ action, index }: { action: RecordedAction; index: number }) {
  const actionIcons = {
    click: '👆',
    input: '⌨️',
    select: '📋',
    scroll: '📜',
  };

  const time = new Date(action.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="p-2.5 rounded-lg bg-zinc-900/50 border border-white/5">
      <div className="flex items-start gap-2">
        <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded bg-zinc-800 text-xs">
          {actionIcons[action.type] || '•'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-300 uppercase">
              {action.type}
            </span>
            <span className="text-[9px] text-zinc-600">{time}</span>
          </div>
          <code className="block text-[10px] font-mono text-zinc-500 truncate mt-1">
            {action.elementAnalysis.minimalSelector}
          </code>
          {action.value && (
            <p className="text-[10px] text-violet-400 mt-1">
              输入: "{action.value}"
            </p>
          )}
        </div>
        <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-zinc-800 text-[9px] text-zinc-500">
          {index + 1}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ isRecording }: { isRecording: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-8">
      <div className={`
        w-12 h-12 rounded-full border flex items-center justify-center mb-3
        ${isRecording 
          ? 'bg-rose-500/10 border-rose-500/30' 
          : 'bg-zinc-900 border-white/5'
        }
      `}>
        {isRecording ? (
          <div className="w-4 h-4 rounded-full bg-rose-500 animate-pulse" />
        ) : (
          <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        {isRecording ? '正在录制操作...' : '点击"开始录制"'}
      </p>
      <p className="text-[10px] text-zinc-600 mt-1">
        {isRecording ? '在页面上执行操作' : '录制你的页面操作'}
      </p>
    </div>
  );
}
