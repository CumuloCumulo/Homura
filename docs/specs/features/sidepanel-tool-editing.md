# SidePanel 工具编辑与反向同步规范文档

> 📋 本文档定义 SidePanel 中工具编辑及反向同步到 Dashboard 的技术规范

## 📄 元信息

| 字段 | 值 |
|------|-----|
| **创建时间** | 2026-03-25 13:30 |
| **状态** | Proposed |
| **优先级** | P1 |
| **负责人** | - |
| **预计完成** | 2026-03-26 |
| **实际完成** | - |
| **相关 Issue** | - |
| **父 Spec** | [toolkit.md](./toolkit.md) |
| **依赖 Spec** | - |

---

## 🎯 快速上下文

> **一句话描述**: 测试失败后切换到检查模式复用选择器编辑功能，修复后反向同步到 Dashboard

### 价值主张
- **用户问题**: 工具在 SidePanel 测试失败时，需要切换回 Dashboard 重新编辑选择器，流程繁琐
- **技术价值**: 复用现有检查模式的选择器编辑和测试能力，减少重复代码
- **业务影响**: 提升测试调试效率 50%，保持 UI 一致性

### 边界定义
**包含**:
- ✅ 测试失败后自动切换到检查模式
- ✅ 复用检查模式的选择器编辑功能
- ✅ 修改后原地测试验证
- ✅ 测试成功后反向同步到 Dashboard
- ✅ 同步后自动返回测试模式

**不包含**:
- ❌ 工具参数编辑（参数在 Dashboard 中管理）
- ❌ 新建工具（新建使用检查模式的原有流程）
- ❌ 工具删除（删除在 Dashboard 中进行）

---

## 🔗 关联资源

| 类型 | 路径/链接 | 说明 |
|------|----------|------|
| **实现文件** | `src/sidepanel/components/TestPanel.tsx` | 测试面板，需添加编辑入口 |
| **实现文件** | `src/sidepanel/components/InspectMode.tsx` | 检查模式（复用） |
| **实现文件** | `src/sidepanel/components/StructureView.tsx` | 选择器编辑（复用） |
| **实现文件** | `src/sidepanel/App.tsx` | 主应用，需添加状态传递 |
| **消息类型** | `src/shared/types.ts` | 消息类型定义 |
| **相关组件** | `src/dashboard/stores/toolkitStore.ts` | Dashboard 状态管理 |
| **状态管理** | `src/sidepanel/stores/recordingStore.ts` | 录制状态存储（需扩展） |
| **相关 Spec** | [toolkit.md](./toolkit.md) | 工具集规范 |

---

## 🎯 功能概述

### 目标
1. 在测试模式中，当工具测试失败时，显示"在检查模式中修复"按钮
2. 点击后自动切换到检查模式，加载失败工具的选择器
3. 利用检查模式现有的编辑功能修改选择器
4. 修改后使用检查模式的测试功能验证
5. 验证成功后，显示"同步到 Dashboard"按钮
6. 同步后自动返回测试模式，工具已更新

### 背景

**当前流程（繁琐）**:
```
Dashboard → 导出工具集到 SidePanel
  → 测试失败
  → 切换回 Dashboard 编辑
  → 重新导出到 SidePanel
  → 再次测试
```

**优化后流程（流畅）**:
```
Dashboard → 导出工具集到 SidePanel
  → 测试失败
  → 点击"在检查模式中修复"
  → 切换到检查模式编辑选择器
  → 原地测试验证
  → 点击"同步到 Dashboard"
  → 自动返回测试模式，工具已更新
```

### 复用现有能力

检查模式（InspectMode）已具备：
- ✅ Scope/Anchor/Target 选择器编辑（StructureView）
- ✅ AI 智能生成选择器
- ✅ 选择器实时验证
- ✅ 高亮预览功能
- ✅ 路径模式/结构模式切换

---

## 🏗️ 技术设计

### 架构位置

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SidePanel                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐      │
│  │   测试模式     │      │   检查模式     │      │   Dashboard   │      │
│  │   TestPanel    │─────│  InspectMode  │─────│ ToolkitStore  │      │
│  │               │      │               │      │               │      │
│  │ - 显示工具列表 │      │ - 选择器编辑   │      │ - updateTool()│      │
│  │ - 测试失败     │  ┌──│ - StructureView│      │ - 保存到存储  │      │
│  │   ↓           │  │  │ - AI 生成     │      │               │      │
│  │ "修复"按钮 ────┼──┘  │ - 测试验证     │      │               │      │
│  │               │      │               │      │               │      │
│  │ - 接收更新     │◇─┐  │ "同步"按钮 ────┼───→│ TOOL_UPDATED  │      │
│  │               │  │  │               │      │               │      │
│  └───────────────┘  │  └───────────────┘      └───────────────┘      │
│                     │                                               │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │                    recordingStore（扩展）                    │     │
│  │                                                             │     │
│  │  - editingToolkitId: string | null  // 正在编辑的工具集ID    │     │
│  │  - editingToolIndex: number | null  // 正在编辑的工具索引    │     │
│  │  - editingTool: AtomicTool | null  // 正在编辑的工具         │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 模块划分

| 模块 | 职责 | 位置 | 状态 |
|------|------|------|------|
| TestPanel | 显示修复按钮，触发切换 | `src/sidepanel/components/TestPanel.tsx` | ⏳ 需修改 |
| recordingStore | 追踪编辑状态 | `src/sidepanel/stores/recordingStore.ts` | ⏳ 需扩展 |
| InspectMode | 接收编辑任务，显示同步按钮 | `src/sidepanel/components/InspectMode.tsx` | ⏳ 需修改 |
| App | 处理模式切换和状态传递 | `src/sidepanel/App.tsx` | ⏳ 需修改 |
| Background | 处理同步消息 | `src/background/index.ts` | ⏳ 需添加 |

### 依赖关系

```
toolkit.md (工具集基础)
    │
    └─→ sidepanel-tool-editing.md (本文档)
             │
             ├─→ TestPanel 修改
             ├─→ recordingStore 扩展
             ├─→ InspectMode 扩展
             └─→ Dashboard 同步
```

---

## 📝 类型定义

### 扩展 recordingStore

```typescript
// src/sidepanel/stores/recordingStore.ts

interface RecordingStore {
  // ... 现有字段 ...

  /** 正在编辑的工具集 ID（从测试模式传入） */
  editingToolkitId: string | null;
  /** 正在编辑的工具在工具集中的索引 */
  editingToolIndex: number | null;
  /** 正在编辑的工具（加载到检查模式） */
  editingTool: import('@homura/sdk/types').AtomicTool | null;

  /** 开始编辑工具（从测试模式调用） */
  startEditingTool: (
    toolkitId: string,
    toolIndex: number,
    tool: import('@homura/sdk/types').AtomicTool
  ) => void;

  /** 完成编辑（保存并返回测试模式） */
  finishEditing: () => void;

  /** 取消编辑 */
  cancelEditing: () => void;
}
```

### 新增消息类型

```typescript
// src/shared/types.ts

/**
 * SidePanel → Dashboard: 工具已更新，需要同步
 */
export interface ToolUpdatedMessage {
  type: 'TOOL_UPDATED';
  payload: {
    toolkitId: string;
    toolIndex: number;
    updatedTool: import('@homura/sdk/types').AtomicTool;
  };
}

/**
 * Dashboard → SidePanel: 同步完成确认
 */
export interface ToolSyncedMessage {
  type: 'TOOL_SYNCED';
  payload: {
    toolkitId: string;
    toolIndex: number;
  };
}

/**
 * Dashboard → SidePanel: 打开检查模式编辑特定工具
 */
export interface OpenInspectForToolMessage {
  type: 'OPEN_INSPECT_FOR_TOOL';
  payload: {
    toolkitId: string;
    toolIndex: number;
    tool: import('@homura/sdk/types').AtomicTool;
  };
}

// 添加到消息联合类型
export type ExtendedHomuraMessage =
  | HomuraMessage
  | SendToolkitToSidepanelMessage
  | ToolUpdatedMessage
  | ToolSyncedMessage
  | OpenInspectForToolMessage;
```

---

## 🔌 API 设计

### recordingStore Actions

```typescript
/**
 * 开始编辑工具
 * @param toolkitId - 工具集 ID
 * @param toolIndex - 工具在工具集中的索引
 * @param tool - 要编辑的工具
 */
startEditingTool: (
  toolkitId: string,
  toolIndex: number,
  tool: AtomicTool
) => void;

/**
 * 完成编辑
 * 保存修改并触发同步到 Dashboard
 */
finishEditing: async () => Promise<void>;

/**
 * 取消编辑
 * 放弃修改，返回测试模式
 */
cancelEditing: () => void;
```

### InspectMode 扩展

```typescript
interface InspectModeProps {
  /** 是否处于编辑模式（vs 新建模式） */
  isEditMode?: boolean;
}
```

---

## 🔄 工作流

### 正常流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. 测试模式 - 工具测试失败                                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. TestPanel 显示失败状态                                                  │
│    - 工具卡片显示 ❌ 标记                                                  │
│    - 显示"在检查模式中修复"按钮                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. 用户点击"在检查模式中修复"                                              │
│    - TestPanel 调用 recordingStore.startEditingTool()                    │
│    - 传入: toolkitId, toolIndex, failedTool                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. App.tsx 监听 editingTool 变化                                          │
│    - 检测到 editingTool !== null                                          │
│    - 自动切换 currentMode = 'inspect'                                     │
│    - InspectMode 接收 isEditMode = true                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. InspectMode 加载编辑状态                                               │
│    - 从 recordingStore 读取 editingTool                                   │
│    - 将 AtomicTool 转换为 UnifiedSelector/SelectorDraft                   │
│    - StructureView 显示当前选择器                                         │
│    - 顶部显示"正在编辑: {工具名称}"                                        │
│    - 底部显示"同步到 Dashboard"按钮（替换"保存到工具库"）                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. 用户在检查模式中编辑选择器                                              │
│    - 使用 StructureView 编辑 scope/anchor/target                         │
│    - 或使用 AI 生成新选择器                                               │
│    - 使用现有的测试功能验证修改                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 7. 用户点击"同步到 Dashboard"                                            │
│    - InspectMode 调用 recordingStore.finishEditing()                     │
│    - 发送 TOOL_UPDATED 消息到 Dashboard                                   │
│    - Dashboard 更新 toolkitStore                                         │
│    - Dashboard 保存到 chrome.storage                                     │
│    - Dashboard 返回 TOOL_SYNCED 确认                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 8. 返回测试模式                                                           │
│    - 自动切换 currentMode = 'test'                                       │
│    - TestPanel 中的工具已更新                                             │
│    - 可以继续测试后续工具                                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### UI 状态流转

```
测试模式                      检查模式
┌─────────────────┐         ┌─────────────────┐
│   TestPanel     │         │  InspectMode    │
│                 │         │                 │
│ ┌─────────────┐ │         │ ┌─────────────┐ │
│ │工具列表     │ │  修复   │ │编辑选择器   │ │
│ │             │ │ ──────→ │ │             │ │
│ │[工具1] ✓    │ │         │ │Scope: [编辑] │ │
│ │[工具2] ✗   │ │         │ │Anchor:[编辑] │ │
│ │ [修复按钮]  │ │         │ │Target:[编辑] │ │
│ │             │ │         │ │             │ │
│ └─────────────┘ │         │ │[同步按钮]   │ │
│                 │   返回   │ └─────────────┘ │
│                 │ ◄────── │                 │
└─────────────────┘         └─────────────────┘
```

### 错误处理

| 场景 | 处理 | 返回 |
|------|------|------|
| 选择器无效 | 禁用同步按钮，显示错误提示 | - |
| 同步时 Dashboard 未打开 | 提示用户打开 Dashboard | 错误提示 |
| 同步时 toolkitId 不匹配 | 提示工具集已变更，取消同步 | 错误提示 |
| 用户取消编辑 | 返回测试模式，不保存修改 | - |

---

## 🎨 UI 设计

### TestPanel 修改

```typescript
// 失败工具卡片
<div className="tool-card failed">
  <div className="tool-info">
    <span>工具名称</span>
    <span>❌ 失败: {error}</span>
  </div>
  <button onClick={handleFixInInspect}>
    在检查模式中修复
  </button>
</div>

// 修复按钮处理
const handleFixInInspect = (tool: AtomicTool, index: number) => {
  recordingStore.startEditingTool(
    testState.toolkitId!,
    index,
    tool
  );
  // App 会自动切换到检查模式
};
```

### InspectMode 修改（编辑模式）

```typescript
// 顶部状态栏
{isEditMode && (
  <div className="edit-mode-header">
    <div className="flex items-center gap-2">
      <span className="text-zinc-400">正在编辑:</span>
      <span className="text-violet-400">{editingTool.name}</span>
    </div>
    <button onClick={handleCancelEdit} className="text-xs text-zinc-500">
      取消
    </button>
  </div>
)}

// 底部操作栏（编辑模式）
{isEditMode ? (
  <div className="edit-mode-actions">
    <button
      onClick={handleSyncToDashboard}
      disabled={!hasChanges || !isValid}
    >
      同步到 Dashboard
    </button>
    {syncStatus === 'syncing' && <SyncSpinner />}
    {syncStatus === 'success' && <SyncSuccessMessage />}
  </div>
) : (
  // 原有的"保存到工具库"按钮
  <ActionBar ... />
)}
```

### App.tsx 监听编辑状态

```typescript
// 监听 editingTool 变化，自动切换模式
useEffect(() => {
  const { editingTool, editingToolIndex } = useRecordingStore.getState();

  if (editingTool !== null) {
    // 有工具正在编辑，切换到检查模式
    setCurrentMode('inspect');
  } else if (currentMode === 'inspect' && editingTool === null) {
    // 检查模式但没有编辑任务，可能刚完成编辑
    // 可以保持或返回测试模式
  }
}, [editingTool, editingToolIndex]);
```

---

## ✅ 验收标准

### 功能验收
- [ ] 测试失败的工具显示"在检查模式中修复"按钮
- [ ] 点击修复按钮自动切换到检查模式
- [ ] 检查模式显示工具当前选择器
- [ ] 可以使用检查模式的所有编辑功能
- [ ] 编辑后可以原地测试验证
- [ ] 验证成功后显示"同步到 Dashboard"按钮
- [ ] 同步成功后自动返回测试模式
- [ ] 返回后工具已更新，可以继续测试

### 质量验收
- [ ] `npm run typecheck` 通过
- [ ] `npm run lint` 通过
- [ ] 测试覆盖率 ≥ 80%
- [ ] 模式切换流畅，无明显卡顿（<100ms）
- [ ] 选择器高亮响应时间 <50ms

### 文档验收
- [ ] Spec 状态更新为 Implemented
- [ ] JSDoc 注释完整

---

## 🧪 测试策略

### 单元测试

```typescript
describe('recordingStore - 编辑模式', () => {
  it('should start editing tool', () => {
    // 测试 startEditingTool 功能
  });

  it('should finish editing and sync', async () => {
    // 测试 finishEditing 同步逻辑
  });

  it('should cancel editing', () => {
    // 测试 cancelEditing 功能
  });
});
```

### 集成测试

- [ ] 测试模式 → 检查模式 → 测试模式流程
- [ ] 编辑 → 同步到 Dashboard 流程
- [ ] Dashboard 未打开时的错误处理
- [ ] 工具集变更时的错误处理

### E2E 测试场景

1. **场景1：失败后编辑成功**
   - 导出工具集到 SidePanel
   - 测试失败
   - 点击"在检查模式中修复"
   - 编辑选择器
   - 原地测试成功
   - 同步回 Dashboard
   - 自动返回测试模式
   - 在测试模式验证工具已更新

2. **场景2：取消编辑**
   - 测试失败
   - 进入检查模式
   - 编辑选择器
   - 点击"取消"
   - 返回测试模式
   - 工具保持原样

3. **场景3：多次编辑同一工具**
   - 第一次编辑失败
   - 返回测试模式，再次进入检查模式
   - 第二次编辑成功
   - 只同步最后一次修改

---

## 📋 TODO 清单

### 设计阶段
- [x] 类型定义
- [x] API 设计
- [x] UI 设计
- [x] 工作流设计

### 实现阶段
- [ ] 扩展 recordingStore 添加编辑状态
- [ ] TestPanel 添加修复按钮
- [ ] InspectMode 添加编辑模式支持
- [ ] App.tsx 添加模式切换逻辑
- [ ] 添加消息类型定义
- [ ] Dashboard 同步处理

### 验收阶段
- [ ] 单元测试
- [ ] 集成测试
- [ ] E2E 测试
- [ ] 文档更新

---

## 📚 决策记录 (ADR)

| 决策 | 选择方案 | 理由 | 日期 |
|------|---------|------|------|
| 编辑方式 | 复用检查模式 | 复用现有功能，减少重复代码，保持 UI 一致性 | 2026-03-25 |
| 模式切换 | 自动切换 | 减少用户操作，流畅的编辑体验 | 2026-03-25 |
| 同步策略 | 手动同步 | 用户可能需要多次编辑尝试，手动同步更可控 | 2026-03-25 |
| 状态存储 | 扩展 recordingStore | 集中管理录制和编辑状态 | 2026-03-25 |

---

## 📅 变更历史

| 日期 | 时间 | 版本 | 变更说明 | 作者 |
|------|------|------|----------|------|
| 2026-03-25 | 13:30 | 0.1.0 | 初始版本（新建弹窗方案） | - |
| 2026-03-25 | 14:00 | 0.2.0 | 修改为复用检查模式方案 | - |

---

## 📚 相关文档

- [DEVELOPMENT.md](../../DEVELOPMENT.md) - 开发规范
- [toolkit.md](./toolkit.md) - 工具集规范
- [SDK Architecture](../architecture/sdk-architecture.md) - SDK 架构
