# Dashboard ↔ SidePanel 联动规范文档

> 📋 本文档定义 Dashboard 工具集编排与 SidePanel 测试之间的数据传递协议

## 📄 元信息

| 字段 | 值 |
|------|-----|
| **创建时间** | 2026-03-24 10:00 |
| **状态** | Implemented |
| **优先级** | P0 |
| **负责人** | Claude |
| **预计完成** | 2026-03-24 |
| **实际完成** | 2026-03-24 |
| **相关 Issue** | - |
| **父 Spec** | [toolkit.md](./toolkit.md) |
| **依赖 Spec** | - |

---

## 🎯 快速上下文

> **一句话描述**: Dashboard 将编排好的工具集通过共享存储发送到 SidePanel，用户在 SidePanel 中手动测试

### 价值主张
- **用户问题**: Dashboard 无法直接与页面交互，测试需要在 SidePanel 进行
- **技术价值**: 通过 chrome.storage 实现解耦，SidePanel 无需事先打开
- **业务影响**: 提升用户体验，测试流程更可靠

### 边界定义
**包含**:
- ✅ Dashboard 发送工具集到共享存储
- ✅ SidePanel 监听存储变化并接收工具集
- ✅ 用户在 SidePanel 中手动测试（单个/连贯）
- ✅ 测试结果展示

**不包含**:
- ❌ Dashboard 直接执行测试
- ❌ 自动化测试调度
- ❌ 测试结果回传 Dashboard

---

## 🔗 关联资源

| 类型 | 路径/链接 | 说明 |
|------|----------|------|
| **实现文件** | `src/dashboard/utils/toolkitOperations.ts` | 发送工具集方法 |
| **实现文件** | `src/dashboard/components/toolkit/ToolkitEditor.tsx` | 操作面板按钮 |
| **实现文件** | `src/sidepanel/App.tsx` | 接收工具集消息 |
| **实现文件** | `src/sidepanel/components/TestPanel.tsx` | 测试面板增强 |
| **类型定义** | `src/shared/types.ts` | 消息类型定义 |
| **相关 Spec** | [toolkit.md](./toolkit.md) | 工具集基础规范 |

---

## 🎯 功能概述

### 目标
实现 Dashboard 与 SidePanel 之间的可靠数据传递，让用户可以在 Dashboard 中编排工具集，然后发送到 SidePanel 进行手动测试。

### 背景
当前问题：
1. Dashboard 有测试面板，但无法直接与页面交互
2. SidePanel 可以与页面交互，但需要手动输入工具
3. 消息传递方案不可靠（SidePanel 未打开时消息丢失）

解决方案（方案3 - 混合方案）：
- Dashboard 负责：编排工具集 + 写入共享存储
- SidePanel 负责：监听存储变化 + 加载工具集 + 手动测试

---

## 🏗️ 技术设计

### 数据流架构（方案3：存储 + 事件通知）

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      混合方案：存储 + 事件通知                          │
└─────────────────────────────────────────────────────────────────────────┘

步骤 1: Dashboard 写入存储
┌──────────────────┐     写入 toolkit     ┌──────────────────┐
│   Dashboard      │ ──────────────────▶ │ chrome.storage   │
│                  │                      │   .local         │
│  • 编排工具集    │                      │                  │
│  • 点击发送      │                      │  • 持久化存储    │
└──────────────────┘                      │  • 触发 onChanged │
                                          └──────────────────┘
                                                    │
                                                    │ onChanged 事件
                                                    ↓
步骤 2: SidePanel 监听变化 / 打开时读取
┌──────────────────┐
│   SidePanel      │
│                  │
│  • 监听 storage  │◀── chrome.storage.onChanged
│  • 打开时读取    │
│  • 自动加载工具集│
│  • 切换测试模式  │
└──────────────────┘

优势：
• 数据持久化，SidePanel 未打开也不丢失
• 使用 Chrome 原生事件机制，可靠高效
• Dashboard 和 SidePanel 完全解耦
```

### 模块划分

| 模块 | 职责 | 位置 | 状态 |
|------|------|------|------|
| Dashboard 操作面板 | 提供发送按钮 | `src/dashboard/components/toolkit/ToolkitEditor.tsx` | ✅ Done |
| 发送工具集方法 | 写入存储 | `src/dashboard/utils/toolkitOperations.ts` | ⏳ 更新中 |
| SidePanel 存储监听 | 监听 storage 变化 | `src/sidepanel/App.tsx` | ⏳ 更新中 |
| 测试面板增强 | 显示工具集 + 测试 | `src/sidepanel/components/TestPanel.tsx` | ✅ Done |

---

## 📝 类型定义

### 存储键名

```typescript
// chrome.storage.local 键名
const STORAGE_KEYS = {
  CURRENT_TOOLKIT: 'homura_current_toolkit',  // 当前待测试的工具集
} as const;
```

### 存储数据结构

```typescript
/**
 * 存储在 chrome.storage.local 中的工具集数据
 */
interface StoredToolkitData {
  toolkitId: string;
  toolkitName: string;
  tools: AtomicTool[];
  timestamp: string;  // ISO 格式时间戳
  version: string;    // 数据格式版本
}

/**
 * SidePanel 内部状态
 */
interface SidePanelTestState {
  toolkitId: string | null;
  toolkitName: string;
  tools: AtomicTool[];
  currentIndex: number;  // 当前选中的工具索引（用于单工具测试）
}

/**
 * 工具测试结果（仅用于 SidePanel 内部显示）
 */
interface ToolTestResult {
  toolId: string;
  toolName: string;
  success: boolean;
  duration: number;
  data?: unknown;
  error?: string;
  timestamp: string;
}
```

---

## 🔌 API 设计

### Dashboard 侧

```typescript
/**
 * 发送工具集到 SidePanel（通过共享存储）
 * @param toolkit - 工具集对象
 * @returns Promise<void>
 *
 * 流程：
 * 1. 将 toolkit 数据写入 chrome.storage.local
 * 2. SidePanel 通过 onChanged 事件自动接收
 * 3. 如果 SidePanel 未打开，数据持久保存，打开时自动加载
 */
export async function sendToolkitToSidePanel(
  toolkit: Toolkit
): Promise<void> {
  const data: StoredToolkitData = {
    toolkitId: toolkit.id,
    toolkitName: toolkit.name,
    tools: toolkit.tools,
    timestamp: new Date().toISOString(),
    version: '1.0',
  };

  await chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_TOOLKIT]: data });
}
```

### SidePanel 侧

```typescript
/**
 * 初始化时从存储加载工具集
 * @returns Promise<StoredToolkitData | null>
 */
export async function loadToolkitFromStorage(): Promise<StoredToolkitData | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_TOOLKIT);
  return result[STORAGE_KEYS.CURRENT_TOOLKIT] || null;
}

/**
 * 监听存储变化
 * @param callback - 存储变化时的回调
 * @returns Unlisten 函数
 */
export function onToolkitChange(
  callback: (data: StoredToolkitData | null) => void
): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === 'local' && changes[STORAGE_KEYS.CURRENT_TOOLKIT]) {
      callback(changes[STORAGE_KEYS.CURRENT_TOOLKIT].newValue || null);
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

/**
 * 测试单个工具
 * @param tool - 要测试的工具
 * @returns Promise<ToolTestResult>
 */
export async function testSingleTool(
  tool: AtomicTool
): Promise<ToolTestResult>;

/**
 * 连贯测试所有工具
 * @param tools - 工具列表
 * @returns Promise<ToolTestResult[]>
 */
export async function testSequence(
  tools: AtomicTool[]
): Promise<ToolTestResult[]>;
```

---

## 🔄 工作流

### 发送工具集流程

```
1. 用户在 Dashboard 中完成工具集编排
   └→ 工具列表已准备好

2. 用户点击"发送到 SidePanel"按钮
   └→ 触发 sendToolkitToSidePanel()

3. Dashboard 将 toolkit 写入 chrome.storage.local
   └→ 数据持久化，触发 onChanged 事件

4. SidePanel 响应（两种方式）
   ├→ 场景A: SidePanel 已打开
   │   └→ onChanged 触发，自动加载工具集，切换到测试模式
   └→ 场景B: SidePanel 未打开
       └→ 数据保存在 storage 中，SidePanel 打开时读取

5. SidePanel 显示工具集
   └→ 用户可以看到工具列表，开始测试
```

### SidePanel 初始化流程

```
1. SidePanel 挂载
   └→ useEffect 触发

2. 从 chrome.storage.local 读取 CURRENT_TOOLKIT
   ├→ 有数据: 自动加载，切换到测试模式
   └→ 无数据: 显示空状态提示

3. 注册 storage.onChanged 监听器
   └→ 后续 Dashboard 发送时自动响应

4. 组件卸载时清理监听器
```

### 手动测试流程

```
方式 1: 单个工具测试
1. 用户在工具列表中点击某个工具的"测试"按钮
2. SidePanel 执行该工具
3. 显示执行结果（成功/失败 + 耗时）

方式 2: 连贯测试
1. 用户点击"连贯测试"按钮
2. SidePanel 依次执行所有工具
3. 显示每个工具的执行结果
```

### 错误处理

| 场景 | 处理 |
|------|------|
| 工具集为空 | 禁用发送按钮，显示提示 |
| 工具执行失败 | 在测试结果中显示错误信息 |
| Storage 读取失败 | 显示空状态，记录日志 |

---

## ✅ 验收标准

### 功能验收
- [x] Dashboard 可以将工具集写入共享存储
- [x] SidePanel 打开时自动读取存储中的工具集
- [x] SidePanel 监听存储变化，实时接收新工具集
- [x] 接收后自动切换到测试模式
- [x] 支持单个工具测试
- [x] 支持连贯测试所有工具
- [x] 测试结果正确显示

### 质量验收
- [x] `npm run typecheck` 通过
- [x] `npm run lint` 通过
- [x] 无明显性能问题（<100ms）

### 文档验收
- [x] JSDoc 注释完整
- [x] Spec 状态更新为 Implemented

---

## 🧪 测试策略

### 手动测试场景

1. **发送空工具集**
   - 预期：发送按钮禁用或显示错误

2. **发送时 SidePanel 未打开**
   - 预期：数据保存成功
   - 验证：打开 SidePanel 后自动加载工具集

3. **发送时 SidePanel 已打开**
   - 预期：SidePanel 实时接收并切换到测试模式

4. **SidePanel 打开时有历史数据**
   - 预期：自动加载上次的工具集

5. **单个工具测试**
   - 预期：工具执行，结果显示

6. **连贯测试**
   - 预期：所有工具依次执行，结果汇总显示

---

## 📋 TODO 清单

### 设计阶段
- [x] 类型定义
- [x] API 设计
- [x] 存储协议定义

### 实现阶段
- [x] Dashboard 发送方法（写入存储）
- [x] Dashboard 操作面板按钮
- [x] SidePanel 存储监听
- [x] SidePanel 初始化读取
- [x] TestPanel 工具集显示
- [x] 单个工具测试
- [x] 连贯测试

### 验收阶段
- [x] 手动测试
- [x] 文档更新
- [x] Spec 状态更新

---

## 📚 决策记录 (ADR)

| 决策 | 选择方案 | 理由 | 日期 |
|------|---------|------|------|
| 数据传递方式 | chrome.storage.local + onChanged | 解耦 Dashboard 和 SidePanel，数据持久化，SidePanel 无需事先打开 | 2026-03-24 |
| 消息传递方式 | ~~chrome.runtime.sendMessage~~ | 改用存储方案，消息方案不可靠（SidePanel 未打开时消息丢失） | 2026-03-24 |
| 测试结果存储 | 仅 SidePanel 内部 | 不需要回传 Dashboard，简化流程 | 2026-03-24 |
| 自动切换模式 | 接收后自动切换 | 提升用户体验，减少操作步骤 | 2026-03-24 |

---

## 📅 变更历史

| 日期 | 时间 | 版本 | 变更说明 | 作者 |
|------|------|------|----------|------|
| 2026-03-24 | 10:00 | 0.1.0 | 初始版本（消息传递方案） | Claude |
| 2026-03-24 | 11:00 | 1.0.0 | 实现完成（消息传递方案） | Claude |
| 2026-03-24 | 14:00 | 2.0.0 | 架构重构：改用存储 + 事件通知方案 | Claude |

---

## 📚 相关文档

- [toolkit.md](./toolkit.md) - 工具集基础规范
- [DEVELOPMENT.md](../DEVELOPMENT.md) - 开发规范
- [sdk-architecture.md](./architecture/sdk-architecture.md) - SDK 架构
