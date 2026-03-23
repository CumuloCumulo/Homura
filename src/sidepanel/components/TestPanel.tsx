/**
 * =============================================================================
 * Homura SidePanel - Test Panel
 * =============================================================================
 *
 * Receives and executes toolkit/blueprint tests from Dashboard
 */

import { useState, useEffect } from 'react';
import type { Toolkit, Blueprint } from '@homura/sdk/types';

interface TestProgress {
  currentStep: number;
  totalSteps: number;
  currentToolName: string;
}

interface TestResult {
  toolName: string;
  success: boolean;
  duration?: number;
  error?: string;
}

interface TestLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}

type TestStatus = 'idle' | 'running' | 'completed' | 'failed';

export function TestPanel() {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [progress, setProgress] = useState<TestProgress>({
    currentStep: 0,
    totalSteps: 0,
    currentToolName: '',
  });
  const [results, setResults] = useState<TestResult[]>([]);
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [currentTest, setCurrentTest] = useState<{
    type: 'toolkit' | 'blueprint';
    name: string;
  } | null>(null);

  // Listen for test requests from Dashboard
  useEffect(() => {
    const handleMessage = (message: MessageEvent) => {
      if (message.data.type === 'TEST_TOOLKIT') {
        handleToolkitTest(message.data.payload);
      } else if (message.data.type === 'TEST_BLUEPRINT') {
        handleBlueprintTest(message.data.payload);
      } else if (message.data.type === 'STOP_TEST') {
        handleStopTest();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleToolkitTest = async (payload: {
    toolkit: Toolkit;
    tabId: number;
  }) => {
    setCurrentTest({ type: 'toolkit', name: payload.toolkit.name });
    setTestStatus('running');
    setResults([]);
    setLogs([]);
    setProgress({
      currentStep: 0,
      totalSteps: payload.toolkit.tools.length,
      currentToolName: '准备中...',
    });

    // Navigate to target URL if specified
    if (payload.toolkit.targetUrl) {
      await addLog('info', `导航到: ${payload.toolkit.targetUrl}`);
      try {
        await chrome.tabs.update(payload.tabId, {
          url: payload.toolkit.targetUrl,
        });
        await addLog('info', '等待页面加载...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        await addLog(
          'error',
          `导航失败: ${error instanceof Error ? error.message : '未知错误'}`,
        );
        setTestStatus('failed');
        sendResults(payload.tabId, []);
        return;
      }
    }

    // Execute each tool in sequence
    const testResults: TestResult[] = [];
    for (let i = 0; i < payload.toolkit.tools.length; i++) {
      const tool = payload.toolkit.tools[i];
      setProgress({
        currentStep: i + 1,
        totalSteps: payload.toolkit.tools.length,
        currentToolName: tool.name,
      });

      await addLog('info', `执行: ${tool.name}`);

      const startTime = Date.now();
      try {
        // Send execution request to content script
        const response = await chrome.tabs.sendMessage(payload.tabId, {
          type: 'EXECUTE_TOOL',
          payload: { tool },
        });

        const duration = Date.now() - startTime;

        if (response?.success) {
          await addLog('info', `✓ ${tool.name} 完成 (${duration}ms)`);
          testResults.push({
            toolName: tool.name,
            success: true,
            duration,
          });
        } else {
          await addLog(
            'error',
            `✗ ${tool.name} 失败: ${response?.error || '未知错误'}`,
          );
          testResults.push({
            toolName: tool.name,
            success: false,
            duration,
            error: response?.error || '未知错误',
          });
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        await addLog('error', `✗ ${tool.name} 错误: ${errorMsg}`);
        testResults.push({
          toolName: tool.name,
          success: false,
          duration,
          error: errorMsg,
        });
      }

      // Small delay between steps
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setResults(testResults);
    setTestStatus(testResults.every((r) => r.success) ? 'completed' : 'failed');

    // Send results back to Dashboard
    sendResults(payload.tabId, testResults);
  };

  const handleBlueprintTest = async (payload: {
    blueprint: Blueprint;
    tabId: number;
    testUrl?: string;
  }) => {
    setCurrentTest({ type: 'blueprint', name: payload.blueprint.meta.name });
    setTestStatus('running');
    setResults([]);
    setLogs([]);

    const toolsToExecute = payload.blueprint.toolkitId
      ? [] // TODO: Load toolkit by ID
      : payload.blueprint.skills;

    setProgress({
      currentStep: 0,
      totalSteps: toolsToExecute.length,
      currentToolName: '准备中...',
    });

    // Navigate to test URL if provided
    const targetUrl = payload.testUrl || payload.blueprint.meta.targetUrl;
    if (targetUrl) {
      await addLog('info', `导航到: ${targetUrl}`);
      try {
        await chrome.tabs.update(payload.tabId, { url: targetUrl });
        await addLog('info', '等待页面加载...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        await addLog(
          'error',
          `导航失败: ${error instanceof Error ? error.message : '未知错误'}`,
        );
        setTestStatus('failed');
        sendResults(payload.tabId, []);
        return;
      }
    }

    // Execute tools
    const testResults: TestResult[] = [];
    for (let i = 0; i < toolsToExecute.length; i++) {
      const tool = toolsToExecute[i];
      setProgress({
        currentStep: i + 1,
        totalSteps: toolsToExecute.length,
        currentToolName: tool.name,
      });

      await addLog('info', `执行: ${tool.name}`);

      const startTime = Date.now();
      try {
        const response = await chrome.tabs.sendMessage(payload.tabId, {
          type: 'EXECUTE_TOOL',
          payload: { tool },
        });

        const duration = Date.now() - startTime;

        if (response?.success) {
          await addLog('info', `✓ ${tool.name} 完成 (${duration}ms)`);
          testResults.push({
            toolName: tool.name,
            success: true,
            duration,
          });
        } else {
          await addLog(
            'error',
            `✗ ${tool.name} 失败: ${response?.error || '未知错误'}`,
          );
          testResults.push({
            toolName: tool.name,
            success: false,
            duration,
            error: response?.error || '未知错误',
          });
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        await addLog('error', `✗ ${tool.name} 错误: ${errorMsg}`);
        testResults.push({
          toolName: tool.name,
          success: false,
          duration,
          error: errorMsg,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setResults(testResults);
    setTestStatus(testResults.every((r) => r.success) ? 'completed' : 'failed');
    sendResults(payload.tabId, testResults);
  };

  const handleStopTest = () => {
    setTestStatus('failed');
    setProgress({
      currentStep: 0,
      totalSteps: 0,
      currentToolName: '已停止',
    });
    addLog('warn', '测试已停止');
  };

  const addLog = async (level: 'info' | 'warn' | 'error', message: string) => {
    const log: TestLog = {
      timestamp: Date.now(),
      level,
      message,
    };
    setLogs((prev) => [...prev, log]);
  };

  const sendResults = (_tabId: number, results: TestResult[]) => {
    // Get Dashboard tab to send results
    chrome.tabs
      .query({ url: 'chrome-extension://*/dashboard.html' })
      .then((tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'TEST_RESULT',
            payload: { results, logs },
          });
        }
      });
  };

  const getStatusColor = () => {
    switch (testStatus) {
      case 'running':
        return 'text-amber-400';
      case 'completed':
        return 'text-emerald-400';
      case 'failed':
        return 'text-rose-400';
      default:
        return 'text-zinc-600';
    }
  };

  const getStatusText = () => {
    switch (testStatus) {
      case 'running':
        return '执行中...';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return '等待测试';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-zinc-200">测试面板</h3>
            <p className="text-[10px] text-zinc-500 mt-1">
              接收来自 Dashboard 的测试请求
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${
                testStatus === 'running'
                  ? 'bg-amber-400 animate-pulse'
                  : testStatus === 'completed'
                    ? 'bg-emerald-400'
                    : testStatus === 'failed'
                      ? 'bg-rose-400'
                      : 'bg-zinc-700'
              }`}
            />
            <span className={`text-[10px] ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
        </div>

        {/* Current Test Info */}
        {currentTest && (
          <div className="p-3 bg-zinc-900/50 rounded border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-[9px] rounded ${
                    currentTest.type === 'toolkit'
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'bg-fuchsia-500/20 text-fuchsia-400'
                  }`}
                >
                  {currentTest.type === 'toolkit' ? '工具集' : '蓝图'}
                </span>
                <span className="text-xs text-zinc-300">
                  {currentTest.name}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress */}
      {testStatus === 'running' && (
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-2">
            <span className="truncate max-w-[150px]">
              {progress.currentToolName}
            </span>
            <span>
              {progress.currentStep} / {progress.totalSteps}
            </span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
              style={{
                width: `${(progress.currentStep / progress.totalSteps) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded border transition-all ${
                  result.success
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-rose-500/5 border-rose-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.success ? (
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
                  )}
                  <span className="text-xs text-zinc-300">
                    {result.toolName}
                  </span>
                  {result.duration && (
                    <span className="text-[9px] text-zinc-600 ml-auto">
                      {result.duration}ms
                    </span>
                  )}
                </div>
                {result.error && (
                  <p className="text-[10px] text-rose-400 mt-1">
                    {result.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="border-t border-white/5 max-h-48 overflow-y-auto">
        <div className="p-3 border-b border-white/5">
          <h4 className="text-[10px] text-zinc-500">执行日志</h4>
        </div>
        <div className="p-3 space-y-1">
          {logs.length === 0 ? (
            <p className="text-[10px] text-zinc-600 text-center py-4">
              等待测试开始...
            </p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-[9px] font-mono">
                <span
                  className={`${
                    log.level === 'error'
                      ? 'text-rose-400'
                      : log.level === 'warn'
                        ? 'text-amber-400'
                        : 'text-zinc-500'
                  }`}
                >
                  [{log.level.toUpperCase()}] {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
