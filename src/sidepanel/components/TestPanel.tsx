/**
 * =============================================================================
 * Homura SidePanel - Test Panel
 * =============================================================================
 *
 * Receives toolkit from Dashboard and allows manual testing
 */

import { useState, useEffect, useRef } from 'react';
import type { SidePanelTestState, ToolTestResult } from '@shared/types';
import type { AtomicTool, ExecutionState } from '@homura/sdk/types';
import { sendToContentScript } from '../utils/ensureContentScript';
import { ActionIcon } from '@shared/components/ActionIcon';
import { useRecordingStore } from '../stores/recordingStore';

const EXECUTION_STATE_CHECK_INTERVAL = 500; // ms

interface TestPanelProps {
  testState: SidePanelTestState;
  setTestState: React.Dispatch<React.SetStateAction<SidePanelTestState>>;
}

type TestStatus = 'idle' | 'running' | 'completed' | 'failed';

export function TestPanel({ testState }: TestPanelProps) {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [currentToolIndex, setCurrentToolIndex] = useState<number>(-1);
  const [results, setResults] = useState<ToolTestResult[]>([]);
  const [executionId, setExecutionId] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTools = testState.tools.length > 0;

  // 获取 recordingStore 中的 startEditingTool 方法
  const { startEditingTool } = useRecordingStore();

  // 轮询执行状态
  useEffect(() => {
    // 只有当有 executionId 且状态为 running 时才启动轮询
    if (!executionId) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // 如果状态不是 running，停止轮询
    if (testStatus !== 'running') {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    console.log('[TestPanel] Starting polling for executionId:', executionId);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'HOMURA_GET_STATE',
        });

        // 检查响应是否有效且 ID 匹配
        if (!response) {
          console.log('[TestPanel] No state in response yet, waiting...');
          return;
        }

        if (response.id !== executionId) {
          console.log(
            '[TestPanel] State ID mismatch, waiting for correct state...',
          );
          return;
        }

        const state = response as ExecutionState;
        console.log('[TestPanel] Poll result:', {
          id: state.id,
          status: state.status,
          currentIndex: state.currentIndex,
          historyLength: state.history.length,
        });

        // 更新当前工具索引
        setCurrentToolIndex(state.currentIndex);

        // 转换历史记录为测试结果
        const newResults: ToolTestResult[] = state.history.map((h) => {
          // 安全地提取错误信息
          let errorMessage: string | undefined = undefined;
          if (h.result.error) {
            if (typeof h.result.error === 'string') {
              errorMessage = h.result.error;
            } else if (
              typeof h.result.error === 'object' &&
              h.result.error !== null
            ) {
              // 类型断言：error 对象可能有 message 属性
              const errorObj = h.result.error as unknown as {
                message?: string;
                [key: string]: unknown;
              };
              errorMessage = errorObj.message || JSON.stringify(errorObj);
            } else {
              errorMessage = String(h.result.error);
            }
          }

          return {
            toolId: h.toolId,
            toolName: h.toolName,
            success: h.result.success,
            duration: h.result.metadata?.duration || 0,
            data: h.result.data,
            error: errorMessage,
            timestamp: h.timestamp,
          };
        });
        setResults(newResults);

        // 检查执行状态
        if (state.status === 'completed') {
          setTestStatus('completed');
          setExecutionId(null);
          setCurrentToolIndex(-1);
          setTimeout(() => setTestStatus('idle'), 2000);
        } else if (state.status === 'failed') {
          setTestStatus('failed');
          setExecutionId(null);
          setCurrentToolIndex(-1);
          setTimeout(() => setTestStatus('idle'), 2000);
        } else if (state.status === 'paused') {
          // 页面跳转后暂停，等待恢复
          setTestStatus('running');
        }
      } catch (error) {
        console.error('[TestPanel] Failed to poll execution state:', error);
      }
    }, EXECUTION_STATE_CHECK_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      console.log(
        '[TestPanel] Polling cleaned up for executionId:',
        executionId,
      );
    };
  }, [executionId, testStatus]);

  // 测试单个工具
  const testSingleTool = async (tool: AtomicTool, index: number) => {
    setCurrentToolIndex(index);
    setTestStatus('running');

    const startTime = Date.now();
    try {
      const response = await sendToContentScript<{
        success: boolean;
        data?: unknown;
        error?: string;
      }>({
        type: 'EXECUTE_TOOL',
        payload: { tool },
      });

      const duration = Date.now() - startTime;

      // 安全地提取错误信息
      let errorMessage: string | undefined = undefined;
      if (response?.error) {
        if (typeof response.error === 'string') {
          errorMessage = response.error;
        } else if (
          typeof response.error === 'object' &&
          response.error !== null
        ) {
          // 类型断言：error 对象可能有 message 属性
          const errorObj = response.error as {
            message?: string;
            [key: string]: unknown;
          };
          errorMessage = errorObj.message || JSON.stringify(errorObj);
        } else {
          errorMessage = String(response.error);
        }
      }

      const result: ToolTestResult = {
        toolId: tool.tool_id,
        toolName: tool.name,
        success: response?.success || false,
        duration,
        data: response?.data,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };

      setResults((prev) => {
        const newResults = [
          ...prev.filter((r) => r.toolId !== tool.tool_id),
          result,
        ];
        return newResults;
      });

      setTestStatus(response?.success ? 'completed' : 'failed');
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: ToolTestResult = {
        toolId: tool.tool_id,
        toolName: tool.name,
        success: false,
        duration,
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString(),
      };

      setResults((prev) => [...prev, result]);
      setTestStatus('failed');
    } finally {
      setTimeout(() => {
        setCurrentToolIndex(-1);
        setTestStatus('idle');
      }, 1000);
    }
  };

  // 连贯测试所有工具（使用 Orchestrator 支持跨页面执行）
  const testSequence = async () => {
    if (testState.tools.length === 0) return;

    // 清空状态和结果
    setResults([]);
    setCurrentToolIndex(-1);

    try {
      // 获取当前活动 tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        setTestStatus('failed');
        setTimeout(() => setTestStatus('idle'), 2000);
        return;
      }

      // 发送执行请求到 background orchestrator
      const response = await chrome.runtime.sendMessage({
        type: 'HOMURA_START_EXECUTION',
        payload: {
          tools: testState.tools.map((tool) => ({
            tool,
            params: {}, // TODO: 从测试面板获取参数
          })),
          tabId: tab.id,
        },
      });

      console.log('[TestPanel] Start execution response:', response);

      if (response && response.id) {
        // 先设置 executionId，再设置 testStatus
        // 这样确保 useEffect 在 executionId 存在时才启动轮询
        setExecutionId(response.id);
        setTestStatus('running');
      } else {
        console.error('[TestPanel] No execution ID in response:', response);
        setTestStatus('failed');
        setTimeout(() => setTestStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('[TestPanel] Failed to start execution:', error);
      setTestStatus('failed');
      setTimeout(() => setTestStatus('idle'), 2000);
    }
  };

  // 清除结果
  const clearResults = () => {
    setResults([]);
    setTestStatus('idle');
  };

  // 停止测试
  const stopTest = async () => {
    try {
      await chrome.runtime.sendMessage({
        type: 'HOMURA_CANCEL_EXECUTION',
      });
      console.log('[TestPanel] Execution cancelled');
    } catch (error) {
      console.error('[TestPanel] Failed to cancel execution:', error);
    }
    // 立即更新本地状态
    setTestStatus('idle');
    setExecutionId(null);
    setCurrentToolIndex(-1);
  };

  // 在检查模式中修复失败的工具
  const handleFixInInspect = (tool: AtomicTool, index: number) => {
    if (!testState.toolkitId) {
      console.error('[TestPanel] No toolkitId, cannot start editing');
      return;
    }

    console.log(
      '[TestPanel] Starting edit for tool:',
      tool.name,
      'at index:',
      index,
    );
    startEditingTool(testState.toolkitId, index, tool);
    // App 会监听 editingTool 变化并自动切换到检查模式
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-zinc-200 truncate">
              测试模式
            </h3>
            {hasTools && (
              <p className="text-[10px] text-zinc-500 mt-1">
                {testState.toolkitName || '未命名工具集'} (
                {testState.tools.length} 个工具)
              </p>
            )}
          </div>
          {results.length > 0 && (
            <button
              onClick={clearResults}
              className="text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              清除结果
            </button>
          )}
        </div>

        {hasTools && (
          <button
            onClick={testStatus === 'running' ? stopTest : testSequence}
            className={`
              w-full h-8 flex items-center justify-center gap-2 rounded text-xs font-medium
              transition-all duration-200
              ${
                testStatus === 'running'
                  ? 'bg-rose-600/90 text-white hover:bg-rose-500 hover:shadow-neon'
                  : testStatus === 'completed'
                    ? 'bg-emerald-600/90 text-white'
                    : testStatus === 'failed'
                      ? 'bg-rose-600/90 text-white'
                      : 'bg-violet-600/90 text-white hover:bg-violet-500 hover:shadow-neon'
              }
            `}
          >
            {testStatus === 'running' ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
                <span>停止测试</span>
              </>
            ) : testStatus === 'completed' ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>测试完成</span>
              </>
            ) : testStatus === 'failed' ? (
              <>
                <svg
                  className="w-4 h-4"
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
                <span>测试失败</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>连贯测试全部工具</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Tools List or Empty State */}
      <div className="flex-1 overflow-y-auto p-3">
        {!hasTools ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <svg
              className="w-12 h-12 text-zinc-700 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs text-zinc-600">
              在 Dashboard 中编排工具集后发送到这里进行测试
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {testState.tools.map((tool, index) => {
              const toolResult = results.find((r) => r.toolId === tool.tool_id);
              const isRunning =
                testStatus === 'running' && currentToolIndex === index;
              const wasTested = results.some((r) => r.toolId === tool.tool_id);

              return (
                <div
                  key={tool.tool_id}
                  className={`
                    p-3 rounded-lg border transition-all duration-200
                    ${
                      isRunning
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : toolResult?.success
                          ? 'bg-emerald-500/10 border-emerald-500/20'
                          : toolResult?.error
                            ? 'bg-rose-500/10 border-rose-500/20'
                            : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Index */}
                    <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 text-[9px] text-zinc-500">
                      {index + 1}
                    </span>

                    {/* Icon */}
                    <ActionIcon action={tool.selector_logic.target.action} />

                    {/* Tool Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-zinc-300 truncate">
                        {tool.name}
                      </h4>
                      <p className="text-[9px] text-zinc-600 truncate font-mono">
                        {tool.selector_logic.target.selector}
                      </p>
                    </div>

                    {/* Status / Test Button */}
                    <div className="flex items-center gap-2">
                      {isRunning ? (
                        <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      ) : toolResult ? (
                        toolResult.success ? (
                          <svg
                            className="w-4 h-4 text-emerald-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4 text-rose-400"
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
                        )
                      ) : (
                        <button
                          onClick={() => testSingleTool(tool, index)}
                          disabled={testStatus === 'running'}
                          className={`
                            px-3 py-1 rounded text-[10px] font-medium transition-colors
                            ${
                              testStatus === 'running'
                                ? 'opacity-50 cursor-wait'
                                : 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                            }
                          `}
                        >
                          {wasTested ? '重测' : '测试'}
                        </button>
                      )}

                      {toolResult && (
                        <span className="text-[9px] text-zinc-500">
                          {toolResult.duration}ms
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Error message */}
                  {toolResult?.error && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      <p className="text-[9px] text-rose-400 flex-1">
                        {toolResult.error}
                      </p>
                      <button
                        onClick={() => handleFixInInspect(tool, index)}
                        className="px-2 py-1 rounded text-[9px] font-medium bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors"
                        disabled={testStatus === 'running'}
                      >
                        在检查模式中修复
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="border-t border-white/5 p-3 bg-zinc-900/30">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-500">
              成功: {results.filter((r) => r.success).length} / {results.length}
            </span>
            <span className="text-zinc-600">
              总耗时: {results.reduce((sum, r) => sum + r.duration, 0)}ms
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
