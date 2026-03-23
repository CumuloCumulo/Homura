/**
 * =============================================================================
 * Homura Dashboard - Blueprint Test Panel
 * =============================================================================
 *
 * Panel for testing blueprints by sending them to SidePanel
 */

import { useState, useEffect } from 'react';
import { useBlueprintStore } from '../../stores/blueprintStore';

interface TestResult {
  step: number;
  name: string;
  success: boolean;
  duration?: number;
  error?: string;
}

interface TestLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}

interface BlueprintTestPanelProps {
  blueprintId: string | null;
}

export function BlueprintTestPanel({ blueprintId }: BlueprintTestPanelProps) {
  const { blueprints } = useBlueprintStore();
  const [isTesting, setIsTesting] = useState(false);
  const [testId, setTestId] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentStepName, setCurrentStepName] = useState<string>('');
  const [testUrl, setTestUrl] = useState('https://example.com');

  const blueprint = blueprintId
    ? blueprints.find((bp) => bp.meta.id === blueprintId)
    : null;

  // Listen for test results
  useEffect(() => {
    const handleMessage = (message: MessageEvent) => {
      if (message.data.type === 'TEST_PROGRESS') {
        setCurrentStep(message.data.payload.currentStep);
        setTotalSteps(message.data.payload.totalSteps);
        setCurrentStepName(message.data.payload.currentStepName);
      } else if (
        message.data.type === 'TEST_RESULT' &&
        message.data.requestMessageId === testId
      ) {
        setIsTesting(false);
        setResults(message.data.payload.results);
        if (message.data.payload.logs) {
          setLogs(message.data.payload.logs);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [testId]);

  const handleStartTest = async () => {
    if (!blueprint) return;

    // Get active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab.id) {
      alert('无法获取当前标签页');
      return;
    }

    const newTestId = `test_${Date.now()}`;
    setTestId(newTestId);
    setIsTesting(true);
    setCurrentStep(0);
    setTotalSteps(blueprint.skills.length);
    setResults([]);
    setLogs([]);

    // Send test message to SidePanel
    chrome.runtime.sendMessage({
      type: 'TEST_BLUEPRINT',
      payload: {
        blueprint,
        tabId: tab.id,
        testUrl,
      },
      messageId: newTestId,
    });
  };

  const handleStopTest = () => {
    if (!testId) return;
    chrome.runtime.sendMessage({
      type: 'STOP_TEST',
      payload: { testId },
    });
    setIsTesting(false);
  };

  if (!blueprint) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-sm text-zinc-400">选择蓝图开始测试</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-zinc-200">蓝图测试</h3>
            <p className="text-[10px] text-zinc-500 mt-1">
              端到端自动化流程测试
            </p>
          </div>
          {!isTesting ? (
            <button
              onClick={handleStartTest}
              disabled={blueprint.skills.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-lg text-xs font-medium text-white hover:from-fuchsia-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              开始测试
            </button>
          ) : (
            <button
              onClick={handleStopTest}
              className="px-4 py-2 bg-rose-500/20 text-rose-400 rounded-lg text-xs font-medium border border-rose-500/30 hover:bg-rose-500/30 transition-all"
            >
              停止测试
            </button>
          )}
        </div>

        {/* Test URL Input */}
        <div className="mb-3">
          <label className="text-[10px] text-zinc-500 mb-1.5 block">
            测试 URL
          </label>
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full h-8 px-3 text-xs bg-zinc-900/80 border border-white/5 rounded text-zinc-300 font-mono focus:border-fuchsia-500/30 focus:outline-none"
          />
        </div>

        {/* Progress */}
        {isTesting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>正在执行: {currentStepName}</span>
              <span>
                {currentStep} / {totalSteps}
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Blueprint Info */}
      <div className="px-4 py-3 border-b border-white/5 bg-zinc-900/30">
        <div className="flex items-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-600">工具数:</span>
            <span className="text-zinc-400 font-medium">
              {blueprint.skills.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-600">Rule Book:</span>
            <span
              className={`font-medium ${blueprint.rules && blueprint.rules.trim().length > 20 ? 'text-emerald-400' : 'text-zinc-600'}`}
            >
              {blueprint.rules && blueprint.rules.trim().length > 20
                ? '已配置'
                : '未配置'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-600">版本:</span>
            <span className="text-zinc-400 font-mono">
              {blueprint.meta.version}
            </span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {results.length === 0 && !isTesting ? (
          <div className="text-center py-8">
            <p className="text-xs text-zinc-600">点击"开始测试"执行蓝图</p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((result, index) => (
              <ResultItem key={index} result={result} index={index} />
            ))}
          </div>
        )}
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="border-t border-white/5 p-3 max-h-32 overflow-y-auto">
          <h4 className="text-[10px] text-zinc-500 mb-2">执行日志</h4>
          <div className="space-y-1">
            {logs.map((log, index) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ResultItemProps {
  result: TestResult;
  index: number;
}

function ResultItem({ result, index }: ResultItemProps) {
  return (
    <div
      className={`
      p-3 rounded border transition-all
      ${
        result.success
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-rose-500/5 border-rose-500/20'
      }
    `}
    >
      <div className="flex items-start gap-3">
        <div
          className={`
          shrink-0 w-6 h-6 rounded flex items-center justify-center
          ${result.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}
        `}
        >
          {result.success ? (
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
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-zinc-300">{result.name}</h4>
            <span className="text-[9px] text-zinc-600">#{index + 1}</span>
          </div>
          {result.error && (
            <p className="text-[10px] text-rose-400 mt-1">{result.error}</p>
          )}
          {result.duration && (
            <p className="text-[9px] text-zinc-600 mt-1">{result.duration}ms</p>
          )}
        </div>
      </div>
    </div>
  );
}
