/**
 * =============================================================================
 * Homura SidePanel - Test Panel
 * =============================================================================
 *
 * Receives toolkit from Dashboard and allows manual testing
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  const hasTools = useMemo(
    () => testState.tools.length > 0,
    [testState.tools.length],
  );

  // 防止重复点击的锁
  const isExecutingRef = useRef(false);
  // 停止请求标志（用于立即取消）
  const stopRequestedRef = useRef(false);

  // 使用 useMemo 缓存结果统计
  const resultStats = useMemo(() => {
    const successCount = results.filter((r) => r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    return { successCount, totalDuration, total: results.length };
  }, [results]);

  // 获取 recordingStore 中的 startEditingTool 方法
  const { startEditingTool } = useRecordingStore();

  /**
   * 取消当前执行
   * 在开始新测试前调用，确保不会有并发执行
   */
  const cancelCurrentExecution = useCallback(async (): Promise<void> => {
    if (executionId) {
      try {
        await chrome.runtime.sendMessage({
          type: 'HOMURA_CANCEL_EXECUTION',
        });
        console.log('[TestPanel] Cancelled previous execution:', executionId);
      } catch (error) {
        console.warn('[TestPanel] Failed to cancel previous execution:', error);
      }
      setExecutionId(null);
    }
    stopRequestedRef.current = false;
    isExecutingRef.current = false;
  }, [executionId]);

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

        // 更新当前工具索引（立即）
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
                code?: string;
                [key: string]: unknown;
              };
              errorMessage = errorObj.message || JSON.stringify(errorObj);
            } else {
              errorMessage = String(h.result.error);
            }
          }

          const result = {
            toolId: h.toolId,
            toolName: h.toolName,
            success: h.result.success,
            duration: h.result.metadata?.duration || 0,
            data: h.result.data,
            error: errorMessage,
            timestamp: h.timestamp,
          };

          // 输出每个工具的执行结果
          if (result.success) {
            console.log(
              `[TestPanel] ✓ Tool ${h.index + 1}/${state.tools.length} SUCCEEDED: ${h.toolName} (${result.duration}ms)`,
            );
          } else {
            console.log(
              `[TestPanel] ✗ Tool ${h.index + 1}/${state.tools.length} FAILED: ${h.toolName} (${result.duration}ms)`,
            );
            console.log(
              `[TestPanel]   Error: ${errorMessage || 'Unknown error'}`,
            );
          }

          return result;
        });
        setResults(newResults);

        // 检查执行状态
        if (state.status === 'completed') {
          console.log(`[TestPanel] ===== Sequential test COMPLETED =====`);
          console.log(`[TestPanel] Total tools: ${state.tools.length}`);
          console.log(
            `[TestPanel] Success: ${newResults.filter((r) => r.success).length}/${newResults.length}`,
          );
          console.log(
            `[TestPanel] Total duration: ${newResults.reduce((sum, r) => sum + r.duration, 0)}ms`,
          );
          console.log(`[TestPanel] ========================================`);

          setTestStatus('completed');
          setExecutionId(null);
          setCurrentToolIndex(-1);
          isExecutingRef.current = false; // 释放执行锁
          setTimeout(() => setTestStatus('idle'), 2000);
        } else if (state.status === 'failed') {
          console.log(`[TestPanel] ===== Sequential test FAILED =====`);
          console.log(
            `[TestPanel] Failed at tool ${state.currentIndex + 1}/${state.tools.length}`,
          );
          console.log(`[TestPanel] ========================================`);

          setTestStatus('failed');
          setExecutionId(null);
          setCurrentToolIndex(-1);
          isExecutingRef.current = false; // 释放执行锁
          setTimeout(() => setTestStatus('idle'), 2000);
        } else if (state.status === 'paused') {
          console.log(
            `[TestPanel] ===== Sequential test PAUSED (navigation) =====`,
          );
          console.log(`[TestPanel] Waiting for page navigation to complete...`);
          console.log(`[TestPanel] ========================================`);

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
    // 如果正在进行连贯测试，禁止单个测试
    if (isExecutingRef.current) {
      console.log(
        '[TestPanel] Cannot test single tool during sequence execution',
      );
      return;
    }

    setCurrentToolIndex(index);
    setTestStatus('running');

    // 输出工具详细信息
    console.log(`[TestPanel] ===== Testing single tool =====`);
    console.log(`[TestPanel] Index: ${index + 1}/${testState.tools.length}`);
    console.log(`[TestPanel] Tool ID: ${tool.tool_id}`);
    console.log(`[TestPanel] Tool Name: ${tool.name}`);
    console.log(`[TestPanel] Action: ${tool.selector_logic.target.action}`);
    console.log(
      `[TestPanel] Target Selector: ${tool.selector_logic.target.selector}`,
    );
    if (tool.selector_logic.scope) {
      console.log(
        `[TestPanel] Scope Selector: ${tool.selector_logic.scope.selector}`,
      );
    }
    if (tool.selector_logic.anchor) {
      console.log(
        `[TestPanel] Anchor: ${tool.selector_logic.anchor.type} = "${tool.selector_logic.anchor.value}"`,
      );
    }
    console.log(`[TestPanel] ===============================`);

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
            code?: string;
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

      // 输出结果
      if (result.success) {
        console.log(
          `[TestPanel] ✓ Tool SUCCEEDED: ${tool.name} (${duration}ms)`,
        );
        if (result.data) {
          console.log(`[TestPanel]   Extracted data:`, result.data);
        }
      } else {
        console.log(`[TestPanel] ✗ Tool FAILED: ${tool.name} (${duration}ms)`);
        console.log(`[TestPanel]   Error: ${errorMessage || 'Unknown error'}`);
      }

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

      console.log(`[TestPanel] ✗ Tool EXCEPTION: ${tool.name} (${duration}ms)`);
      console.log(`[TestPanel]   Exception:`, error);
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

    // 防止重复点击：如果已经在执行，先取消
    if (isExecutingRef.current) {
      console.log('[TestPanel] Already executing, cancelling previous...');
      await cancelCurrentExecution();
      // 短暂等待确保取消完成
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 设置执行锁
    isExecutingRef.current = true;
    stopRequestedRef.current = false;

    console.log(
      '[TestPanel] Starting sequential test, tool count:',
      testState.tools.length,
    );

    // 立即更新 UI 状态（不等待轮询）
    setCurrentToolIndex(0);
    setTestStatus('running');
    setResults([]);

    try {
      // 获取当前活动 tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        setTestStatus('failed');
        isExecutingRef.current = false;
        setTimeout(() => setTestStatus('idle'), 2000);
        return;
      }

      // 检查是否在准备过程中被取消
      if (stopRequestedRef.current) {
        console.log('[TestPanel] Execution was cancelled before start');
        setTestStatus('idle');
        setCurrentToolIndex(-1);
        isExecutingRef.current = false;
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

      // 再次检查是否被取消
      if (stopRequestedRef.current) {
        console.log('[TestPanel] Execution was cancelled after start request');
        if (response?.id) {
          await chrome.runtime.sendMessage({
            type: 'HOMURA_CANCEL_EXECUTION',
          });
        }
        setTestStatus('idle');
        setCurrentToolIndex(-1);
        isExecutingRef.current = false;
        return;
      }

      if (response && response.id) {
        const newExecutionId = response.id;
        console.log('[TestPanel] Setting executionId:', newExecutionId);
        setExecutionId(newExecutionId);
      } else {
        console.error('[TestPanel] No execution ID in response:', response);
        setTestStatus('failed');
        isExecutingRef.current = false;
        setTimeout(() => setTestStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('[TestPanel] Failed to start execution:', error);
      setTestStatus('failed');
      isExecutingRef.current = false;
      setTimeout(() => setTestStatus('idle'), 2000);
    }
  };

  // 清除结果
  const clearResults = useCallback(() => {
    setResults([]);
    setTestStatus('idle');
  }, []);

  // 停止测试
  const stopTest = useCallback(async () => {
    // 设置停止请求标志，让正在进行的操作知道需要停止
    stopRequestedRef.current = true;

    try {
      await chrome.runtime.sendMessage({
        type: 'HOMURA_CANCEL_EXECUTION',
      });
      console.log('[TestPanel] Execution cancelled');
    } catch (error) {
      console.error('[TestPanel] Failed to cancel execution:', error);
    }

    // 立即更新本地状态（不等待后台确认）
    setTestStatus('idle');
    setExecutionId(null);
    setCurrentToolIndex(-1);
    isExecutingRef.current = false;
  }, []);

  // 在检查模式中修复失败的工具
  const handleFixInInspect = useCallback(
    (tool: AtomicTool, index: number) => {
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
    },
    [testState.toolkitId, startEditingTool],
  );

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
                      ) : null}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => testSingleTool(tool, index)}
                        disabled={testStatus === 'running'}
                        className={`
                          px-2 py-1 rounded text-[10px] font-medium transition-colors
                          ${
                            testStatus === 'running'
                              ? 'opacity-50 cursor-wait'
                              : 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                          }
                        `}
                      >
                        {wasTested ? '重测' : '测试'}
                      </button>
                      <button
                        onClick={() => handleFixInInspect(tool, index)}
                        disabled={testStatus === 'running'}
                        className={`
                          px-2 py-1 rounded text-[10px] font-medium transition-colors
                          ${
                            testStatus === 'running'
                              ? 'opacity-50 cursor-wait'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                          }
                        `}
                        title="在检查模式中编辑选择器"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Error message or duration */}
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                    {toolResult?.error ? (
                      <p className="text-[9px] text-rose-400 flex-1 truncate">
                        {toolResult.error}
                      </p>
                    ) : toolResult ? (
                      <span className="text-[9px] text-zinc-500">
                        耗时: {toolResult.duration}ms
                      </span>
                    ) : (
                      <span className="text-[9px] text-zinc-600">
                        点击测试或编辑选择器
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Results Summary */}
      {resultStats.total > 0 && (
        <div className="border-t border-white/5 p-3 bg-zinc-900/30">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-500">
              成功: {resultStats.successCount} / {resultStats.total}
            </span>
            <span className="text-zinc-600">
              总耗时: {resultStats.totalDuration}ms
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
