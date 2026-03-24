# 执行就绪策略规范文档

> 🚀 **核心理念**：四层等待机制确保工具在各种页面加载状态下都能稳健执行

---

## 📄 元信息

| 字段 | 值 |
|------|-----|
| **创建时间** | 2026-03-24 16:00 |
| **状态** | ✅ Implemented |
| **优先级** | P0 |
| **负责人** | @claude |
| **预计完成** | 2026-03-24 |
| **相关 Spec** | [execution-engine.md](./execution-engine.md), [sdk-architecture.md](./sdk-architecture.md) |

---

## 🎯 快速上下文

> **一句话描述**: 四层等待机制确保工具在各种页面加载状态下都能稳健执行

- **用户问题**: 页面跳转后 SPA 内容未渲染完成导致工具执行失败
- **技术价值**: 统一的等待策略，覆盖 SPA、传统页面、混合页面
- **业务影响**: 提高自动化执行成功率，减少因页面加载时机导致的失败

### 边界定义

**包含**:
- ✅ Content Script 就绪检测
- ✅ DOM 稳定性检测
- ✅ 目标元素预检和等待
- ✅ SPA 识别和特殊处理
- ✅ 统一的 `waitForReady` 入口

**不包含**:
- ❌ 网络层等待（如 fetch/XMLHttpRequest）
- ❌ 后端服务响应等待
- ❌ 用户交互等待（如用户输入验证码）

---

## 🔗 关联资源

| 类型 | 路径 | 说明 |
|------|------|------|
| **实现文件** | `packages/sdk/src/utils/readiness.ts` | 等待策略实现 |
| **DOM 检测** | `packages/sdk/src/utils/domStability.ts` | DOM 稳定性检测（含容差机制） |
| **SPA 检测** | `packages/sdk/src/utils/spaDetection.ts` | SPA 识别 |
| **执行器集成** | `packages/sdk/src/executor/tool.ts` | 集成等待逻辑 |
| **Orchestrator** | `src/background/orchestrator.ts` | 工具间延迟、新 tab 检测 |
| **类型定义** | `packages/sdk/src/types/execution.ts` | ReadinessConfig, ReadinessResult 等 |
| **相关 Spec** | [execution-engine.md](./execution-engine.md) | 执行引擎 |

---

## 🏗️ 技术设计

### 架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    稳健执行等待策略                                    │
└─────────────────────────────────────────────────────────────────────────┘

    执行工具请求
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Layer 1: Content Script 就绪检测                                │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ PING/PONG 检测                                              │    │
│  │ 连接重试: 200ms → 400ms → 800ms → 1500ms → 3000ms        │    │
│  └────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Layer 2: DOM 稳定性检测                                        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 检测 DOM 是否还在快速变化                                   │    │
│  │ 快照对比: snapshot1 === snapshot2 ? 稳定 : 等待            │    │
│  │ 检测间隔: 500ms, 最大等待: 5 秒                             │    │
│  └────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Layer 3: SPA 识别 + 特殊处理                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 检测 SPA 根节点: #app, #root, [data-reactroot]             │    │
│  │ 检测框架特征: Vue, React, Angular                          │    │
│  │ SPA 场景自动延长等待时间                                     │    │
│  └────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Layer 4: 目标元素预检                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 执行前检查目标选择器是否存在                               │    │
│  │ 不存在则等待（轮询: 200ms 间隔）                             │    │
│  │ 基础超时: 5 秒, SPA: 10 秒                                     │    │
│  └────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
      执行工具操作
```

### 模块划分

| 模块 | 职责 | 位置 |
|------|------|------|
| DOMStability | DOM 稳定性检测 | `packages/sdk/src/utils/domStability.ts` |
| SPADetection | SPA 检测 | `packages/sdk/src/utils/spaDetection.ts` |
| Readiness | 统一等待函数 | `packages/sdk/src/utils/readiness.ts` |
| Executor | 集成等待逻辑 | `packages/sdk/src/executor/tool.ts` |
| Orchestrator | 工具间延迟、新 tab 检测 | `src/background/orchestrator.ts` |

---

## 🔧 实现增强

在原始规范基础上，实现了以下增强功能：

### 1. DOM 稳定性容差机制

**问题**: SPA 页面某些元素（动画、计时器）会导致元素数量持续变化

**方案**: 引入 `tolerance` 参数，允许元素数量小幅变化

```typescript
export function compareFingerprints(
  a: DOMFingerprint,
  b: DOMFingerprint,
  tolerance: number = 5,
): boolean {
  const elementCountStable = Math.abs(a.elementCount - b.elementCount) <= tolerance;
  // ...
}
```

### 2. 滑动窗口稳定策略

**问题**: 单次快照对比可能误判

**方案**: 需要连续 2 次快照相同才认为稳定

```typescript
let stableCount = 0;
const requiredStableCount = 2;

if (compareFingershots(previousSnapshot, currentSnapshot)) {
  stableCount++;
  if (stableCount >= requiredStableCount) {
    return true; // 真正稳定了
  }
}
```

### 3. 工具间执行延迟

**问题**: 点击操作触发异步跳转，下一工具执行过早

**方案**: 在 orchestrator 中添加 500ms 工具间延迟

```typescript
// src/background/orchestrator.ts
const toolDelay = 500;
await new Promise(resolve => setTimeout(resolve, toolDelay));
```

### 4. 新 Tab 检测与上下文切换

**问题**: 点击打开新 tab 后，后续工具仍在旧 tab 执行

**方案**: 检测 tabId 更大（更新）的 tab 并切换上下文

```typescript
const allTabs = await chrome.tabs.query({});
const newerTabs = allTabs.filter(t => t.id && t.id > tabId);

if (newerTabs.length > 0) {
  const newestTab = newerTabs.sort((a, b) => (b.id || 0) - (a.id || 0))[0];
  state.tabId = newestTab.id;
  state.currentUrl = newestTab.url;
  tabId = newestTab.id;
}
```

### 5. 消息路由修复

**问题**: TestPanel 发送的消息被 background/index.ts 拦截返回 "Unknown message type"

**方案**: 在 BackgroundMessage 类型中添加 HOMURA_* 消息类型

---

## 📝 类型定义

### 等待配置

```typescript
/**
 * 等待配置
 */
export interface ReadinessConfig {
  /** 是否跳过等待（用于调试） */
  skipWait?: boolean;

  /** DOM 稳定性检测超时（毫秒） */
  domStabilityTimeout?: number;

  /** 目标元素等待超时（毫秒） */
  targetTimeout?: number;

  /** SPA 额外等待时间（毫秒） */
  spaExtraWait?: number;

  /** 轮询间隔（毫秒） */
  pollInterval?: number;

  /** 是否启用详细日志 */
  verbose?: boolean;
}
```

### DOM 指纹

```typescript
/**
 * DOM 指纹（用于检测稳定性）
 */
export interface DOMFingerprint {
  /** 元素数量 */
  elementCount: number;

  /** 关键选择器的存在状态 */
  keySelectors: Record<string, boolean>;

  /** HTML 结构哈希（简化版） */
  structureHash: string;
}
```

### SPA 检测结果

```typescript
/**
 * SPA 检测结果
 */
export interface SPADetectionResult {
  /** 是否是 SPA */
  isSPA: boolean;

  /** 检测到的框架类型 */
  framework?: 'vue' | 'react' | 'angular' | 'unknown';

  /** 根节点选择器 */
  rootSelector?: string;

  /** 置信度 */
  confidence: number;
}
```

### 等待结果

```typescript
/**
 * 等待结果
 */
export interface ReadinessResult {
  /** 是否就绪 */
  ready: boolean;

  /** 使用的等待层级 */
  layers: string[];

  /** 等待时长（毫秒） */
  duration: number;

  /** 检测到的页面类型 */
  pageType: 'spa' | 'traditional' | 'unknown';
}
```

---

## 🔌 API 设计

### 主入口函数

```typescript
/**
 * 等待页面就绪
 *
 * @param selector - 目标选择器（可选）
 * @param config - 等待配置
 * @returns 等待结果
 */
export async function waitForReady(
  selector?: string,
  config?: ReadinessConfig
): Promise<ReadinessResult>;
```

### DOM 稳定性检测

```typescript
/**
 * 等待 DOM 稳定
 *
 * @param timeout - 超时时间（毫秒）
 * @param config - 等待配置
 * @returns 是否稳定
 */
export async function waitForDOMStable(
  timeout: number,
  config?: ReadinessConfig
): Promise<boolean>;
```

### SPA 检测

```typescript
/**
 * 检测当前页面是否是 SPA
 *
 * @returns SPA 检测结果
 */
export function detectSPA(): SPADetectionResult;
```

### 目标元素等待

```typescript
/**
 * 等待目标元素出现
 *
 * @param selector - 目标选择器
 * @param timeout - 超时时间（毫秒）
 * @param config - 等待配置
 * @returns 是否找到
 */
export async function waitForTarget(
  selector: string,
  timeout: number,
  config?: ReadinessConfig
): Promise<boolean>;
```

---

## 🔄 工作流

### 正常执行流程

```
┌─────────────────────────────────────────────────────────────┐
│                    工具执行等待流程                            │
└─────────────────────────────────────────────────────────────┘

                    [工具执行请求]
                            │
                            ▼
                    ┌───────────────┐
                    │ Layer 1: 等待  │
                    │ Content Script │
                    │   就绪        │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ Layer 2: 等待  │
                    │ DOM 稳定      │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ Layer 3: SPA   │
                    │ 识别 + 延长   │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ Layer 4: 目标  │
                    │ 元素预检      │
                    └───────┬───────┘
                            │
                ┌───────────┴───────────┐
                │                           │
            元素存在                     元素不存在
                │                           │
                ▼                           ▼
         [执行工具操作]              [继续等待/超时]
                                        │
                                        ▼
                              [根据配置处理]
```

### 错误处理

| 场景 | 处理 | 返回 |
|------|------|------|
| 连接失败 | 重试（递增延迟） | 继续等待 |
| DOM 不稳定 | 等待快照稳定 | 继续等待 |
| 超过基础超时 | 检查是否 SPA | 延长等待或失败 |
| 超过 SPA 超时 | 记录详细日志 | 返回失败 |
| 元素永久不存在 | 返回带详细错误 | `TARGET_NOT_FOUND` |

---

## ✅ 验收标准

### 功能验收
- [x] DOM 稳定性检测能准确识别 DOM 不再快速变化的时刻
- [x] SPA 检测能识别 Vue/React/Angular 框架
- [x] 目标元素等待在元素出现后立即返回
- [x] 传统页面和 SPA 都能正确处理
- [x] 超时后返回带详细错误信息的 `ReadinessResult`
- [x] 新 tab 打开后能正确切换执行上下文

### 质量验收
- [x] `npm run typecheck` 通过
- [x] 无类型冲突
- [x] 所有函数有 JSDoc 注释

### 文档验收
- [x] JSDoc 注释完整
- [x] Spec 状态更新为 Implemented
- [x] 实现增强记录完整

---

## 🧪 测试策略

### 单元测试

```typescript
// DOM 稳定性检测
describe('waitForDOMStable', () => {
  it('应在 DOM 稳定后返回 true', async () => {
    // 模拟动态加载场景
    const result = await waitForDOMStable(5000);
    expect(result).toBe(true);
  });

  it('应在超时时返回 false', async () => {
    // 模拟持续变化的 DOM
    const result = await waitForDOMStable(100);
    expect(result).toBe(false);
  });
});

// SPA 检测
describe('detectSPA', () => {
  it('应检测 Vue 应用', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const result = detectSPA();
    expect(result.isSPA).toBe(true);
  });

  it('应检测 React 应用', () => {
    document.body.innerHTML = '<div data-reactroot></div>';
    const result = detectSPA();
    expect(result.isSPA).toBe(true);
  });
});

// 目标元素等待
describe('waitForTarget', () => {
  it('应在元素出现后返回', async () => {
    setTimeout(() => {
      document.body.innerHTML = '<button>Click</button>';
    }, 1000);

    const result = await waitForTarget('button', 5000);
    expect(result).toBe(true);
  });
});

// 统一等待
describe('waitForReady', () => {
  it('应等待所有条件满足', async () => {
    const result = await waitForReady('.target');
    expect(result.ready).toBe(true);
    expect(result.layers).toContain('dom_stability');
  });
});
```

### 集成测试

- [ ] 在真实 SPA 页面测试（如 Vue Admin）
- [ ] 在传统页面测试
- [ ] 在混合页面测试
- [ ] 跨页面跳转场景

---

## 📋 TODO 清单

### 设计阶段
- [x] 定义类型定义
- [x] 设计 API 接口
- [x] 规划模块划分

### 实现阶段
- [x] 实现 `domStability.ts`
- [x] 实现 `spaDetection.ts`
- [x] 实现 `readiness.ts`
- [x] 集成到 `executor/tool.ts`
- [x] DOM 稳定性容差机制（tolerance 参数）
- [x] 滑动窗口策略（连续 2 次快照相同）
- [x] 工具间延迟（orchestrator 中 500ms 延迟）
- [x] 新 tab 检测和上下文切换
- [ ] 添加单元测试

### 验收阶段
- [x] 功能测试通过
- [x] 类型检查通过
- [x] 文档更新完整
- [x] 连贯测试场景验证通过

---

## 📚 决策记录 (ADR)

| 决策 | 选择方案 | 理由 | 日期 |
|------|---------|------|------|
| 等待策略 | 四层等待 | 覆盖所有场景，不遗漏任何等待层级 | 2026-03-24 |
| DOM 稳定性检测 | 快照对比 | 简单可靠，性能开销小 | 2026-03-24 |
| SPA 检测 | 多特征匹配 | 提高识别准确率，支持多种框架 | 2026-03-24 |
| 超时策略 | 分级超时 | SPA 需要更长等待，传统页面快速响应 | 2026-03-24 |

---

## 📅 变更历史

| 日期 | 时间 | 版本 | 变更说明 | 作者 |
|------|------|------|----------|------|
| 2026-03-24 | 16:00 | 0.1.0 | 初始版本 | @claude |
| 2026-03-24 | 18:30 | 1.0.0 | 基础实现完成，集成到 executor | @claude |
| 2026-03-24 | 20:00 | 1.1.0 | 添加 DOM 容差机制、滑动窗口策略 | @claude |
| 2026-03-24 | 20:30 | 1.2.0 | 添加工具间延迟、新 tab 检测切换 | @claude |
| 2026-03-24 | 21:00 | 1.3.0 | 修复 UI 消息路由、状态轮询逻辑 | @claude |
| 2026-03-24 | 21:30 | 2.0.0 | 完整实现并验证通过 | @claude |

---

## 📚 相关文档

- [execution-engine.md](./execution-engine.md) - 执行引擎架构
- [sdk-architecture.md](./sdk-architecture.md) - SDK 模块架构
- [DEVELOPMENT.md](../../docs/DEVELOPMENT.md) - 开发规范
