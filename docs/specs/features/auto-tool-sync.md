# Dashboard ↔ SidePanel 工具自动同步规范文档

> 📋 本文档定义 SidePanel 录制的工具自动同步到 Dashboard 工具库的协议

## 📄 元信息

| 字段 | 值 |
|------|-----|
| **创建时间** | 2026-03-24 14:30 |
| **状态** | Implemented |
| **优先级** | P1 |
| **负责人** | Claude |
| **预计完成** | 2026-03-24 |
| **实际完成** | 2026-03-24 16:45 |
| **相关 Issue** | - |
| **父 Spec** | [dashboard-sidepanel-bridge.md](./dashboard-sidepanel-bridge.md) |
| **依赖 Spec** | - |

---

## 🎯 快速上下文

> **一句话描述**: SidePanel 录制的工具自动同步到 Dashboard 工具库，实现即时开发工作流

### 价值主张
- **用户问题**: 手动将录制的动作转换为工具并添加到工具库很繁琐
- **技术价值**: 自动化工具生成和同步，减少操作步骤
- **业务影响**: 提升开发效率，实现真正的 Vibe Coding

### 边界定义
**包含**:
- ✅ SidePanel 录制完成后自动生成 AtomicTool
- ✅ 通过 chrome.storage 同步到 Dashboard
- ✅ Dashboard 监听变化并自动添加到工具库
- ✅ 支持去重（相同的 tool_id 不重复添加）
- ✅ 工具分类（最近录制 vs 长期保存）
- ✅ 支持所有操作类型（click, input, navigate 等）

**不包含**:
- ❌ 工具的自动编辑/优化（由用户手动处理）
- ❌ 工具的自动删除（由用户手动管理）

---

## 🔗 关联资源

| 类型 | 路径/链接 | 说明 |
|------|----------|------|
| **实现文件** | `src/sidepanel/utils/recordingToTool.ts` | 录制动作转工具 |
| **实现文件** | `src/sidepanel/components/RecordingPanel.tsx` | 发送工具到存储 |
| **实现文件** | `src/dashboard/App.tsx` | 监听工具并添加到库 |
| **实现文件** | `src/dashboard/components/toolkit/ToolkitEditor.tsx` | 工具库面板（含 Tab 分类） |
| **实现文件** | `packages/sdk/src/types/execution.ts` | AtomicTool 类型（含 source 字段） |
| **相关 Spec** | [dashboard-sidepanel-bridge.md](./dashboard-sidepanel-bridge.md) | Dashboard-SidePanel 联动 |

---

## 🏗️ 技术设计

### 数据流架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       工具自动同步架构                                    │
└─────────────────────────────────────────────────────────────────────────┘

步骤 1: SidePanel 录制完成
┌──────────────────┐     录制动作     ┌──────────────────┐
│   SidePanel      │ ──────────────▶ │ recordedActions  │
│  • 用户录制      │                 │  • 所有操作      │
│  • 点击"完成"    │                 │  • 含 navigate   │
└──────────────────┘                 └──────────────────┘
                          │
                          │ 批量转换为 AtomicTool[]
                          ↓
                   ┌──────────────────┐
                   │  AtomicTool[]    │
                   │  • tool_id       │
                   │  • name          │
                   │  • source: 'recorded' │
                   │  • selector_...  │
                   └──────────────────┘
                          │
                          │ 写入存储
                          ↓
步骤 2: 写入共享存储
┌──────────────────┐
│ chrome.storage   │ ◀── sendRecordedToolsToDashboard()
│   .local         │
│                  │ • RECORDED_TOOLS (工具数组)
└──────────────────┘
                          │
                          │ onChanged 事件
                          ↓
步骤 3: Dashboard 自动接收
┌──────────────────┐
│   Dashboard      │ ◀── chrome.storage.onChanged
│                  │
│  • 监听存储      │
│  • 批量添加工具  │
│  • 分类显示      │
└──────────────────┘
                          │
                          ↓
                   工具出现在"最近录制" Tab
```

### 工具分类设计

```
┌─────────────────────────────────────────────────────────────┐
│                      工具库分类                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📹 最近录制                 💾 长期保存                    │
│  ─────────────               ─────────────                   │
│  • source: 'recorded'        • source: 'manual'             │
│  • 录制时自动添加            • 用户手动保存                 │
│  • 可删除或保存              • source: 'imported'           │
│  • 空状态提示                • 导入的工具                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

保存操作: 最近录制 → 长期保存
┌─────────────────┐      点击 💾       ┌─────────────────┐
│  工具卡片       │ ──────────────────▶ │  source 更新     │
│  [💾 保存按钮]  │                     │  'recorded' →   │
└─────────────────┘                     │  'manual'       │
                                        └─────────────────┘
```

### 模块划分

| 模块 | 职责 | 位置 | 状态 |
|------|------|------|------|
| 录制转工具 | RecordedAction[] → AtomicTool[] | `src/sidepanel/utils/recordingToTool.ts` | ✅ 已实现 |
| 批量发送工具 | 写入存储（数组格式） | `src/sidepanel/components/RecordingPanel.tsx` | ✅ 已实现 |
| 接收工具 | 监听存储 + 批量添加到库 | `src/dashboard/App.tsx` | ✅ 已实现 |
| 工具分类面板 | Tab 切换显示 | `src/dashboard/components/toolkit/ToolkitEditor.tsx` | ✅ 已实现 |

---

## 📝 类型定义

### SDK 类型扩展

```typescript
// packages/sdk/src/types/execution.ts

/**
 * 工具来源类型
 */
export type ToolSource = 'recorded' | 'manual' | 'imported';

/**
 * 原子工具（扩展）
 */
export interface AtomicTool {
  tool_id: string;
  name: string;
  description?: string;
  parameters: Record<string, ToolParameter>;
  selector_logic: SelectorLogic;

  // 新增字段
  source?: ToolSource;      // 工具来源
  createdAt?: string;       // ISO 8601 时间戳
}
```

### 存储协议

```typescript
// chrome.storage.local 键名
const STORAGE_KEYS = {
  RECORDED_TOOLS: 'homura_recorded_tools',  // 录制的工具数组
} as const;

/**
 * 存储的工具数据结构
 */
interface RecordedToolsData {
  tools: AtomicTool[];
  timestamp: string;  // ISO 格式时间戳
  version: string;    // 数据格式版本
}
```

---

## 🔌 API 设计

### SidePanel 侧

```typescript
/**
 * 将录制的动作转换为工具
 * @param action - 录制的动作
 * @returns AtomicTool
 */
export function recordedActionToTool(
  action: RecordedAction
): AtomicTool {
  const toolId = generateToolId(action);
  const name = generateToolName(action);

  // navigate 操作特殊处理
  if (action.type === 'navigate') {
    return {
      tool_id: toolId,
      name,
      description: `录制于 ${new Date(action.timestamp).toLocaleString('zh-CN')}`,
      parameters: {},
      selector_logic: {
        target: {
          selector: '',
          action: 'NAVIGATE',
          params: { url: action.url || '' },
        },
        strategy: 'direct',
      },
      source: 'recorded',
      createdAt: new Date().toISOString(),
    };
  }

  // 其他操作
  const selectorLogic = {
    target: {
      selector: action.unifiedSelector?.fullSelector
        || action.elementAnalysis?.minimalSelector
        || '',
      action: convertActionType(action.type),
      params: action.value ? { value: action.value } : undefined,
    },
    strategy: action.unifiedSelector?.strategy === 'path'
      ? 'path_selector'
      : 'scope_anchor_target',
  };

  return {
    tool_id: toolId,
    name,
    description: `录制于 ${new Date(action.timestamp).toLocaleString('zh-CN')}`,
    parameters: {},
    selector_logic: selectorLogic,
    source: 'recorded',
    createdAt: new Date().toISOString(),
  };
}

/**
 * 发送录制的工具到 Dashboard
 * @param tools - 工具数组
 * @returns Promise<void>
 */
export async function sendRecordedToolsToDashboard(
  tools: AtomicTool[]
): Promise<void> {
  const data: RecordedToolsData = {
    tools,
    timestamp: new Date().toISOString(),
    version: '2.0',
  };

  await chrome.storage.local.set({
    [STORAGE_KEYS.RECORDED_TOOLS]: data,
  });
}
```

### Dashboard 侧

```typescript
/**
 * 监听录制工具变化
 */
useEffect(() => {
  const handleStorageChange = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === 'local' && changes[STORAGE_KEYS.RECORDED_TOOLS]) {
      const newData = changes[STORAGE_KEYS.RECORDED_TOOLS].newValue
        as RecordedToolsData | undefined;

      if (newData?.tools) {
        for (const tool of newData.tools) {
          const existingTool = tools.find(t => t.tool_id === tool.tool_id);

          if (existingTool) {
            // 更新现有工具，保留 source
            updateTool(tool.tool_id, {
              ...tool,
              source: existingTool.source || tool.source,
            });
          } else {
            // 添加新工具
            addTool(tool);
          }
        }
      }
    }
  };

  chrome.storage.onChanged.addListener(handleStorageChange);
  return () => chrome.storage.onChanged.removeListener(handleStorageChange);
}, [tools, addTool, updateTool]);

/**
 * 初始化时检查已有工具
 */
useEffect(() => {
  const checkRecordedTools = async () => {
    const result = await chrome.storage.local.get(STORAGE_KEYS.RECORDED_TOOLS);
    const data = result[STORAGE_KEYS.RECORDED_TOOLS] as RecordedToolsData | undefined;

    if (data?.tools) {
      for (const tool of data.tools) {
        const existingTool = tools.find(t => t.tool_id === tool.tool_id);
        if (!existingTool) {
          addTool(tool);
        }
      }
    }
  };
  checkRecordedTools();
}, []);
```

### Store 操作

```typescript
// src/dashboard/stores/toolStore.ts

interface ToolStore {
  // ... existing

  /**
   * 保存录制工具到长期库
   * @param toolId - 工具 ID
   */
  saveTool: (toolId: string) => void;
}

// 实现
saveTool: (toolId) =>
  set((state) => ({
    tools: state.tools.map((t) =>
      t.tool_id === toolId
        ? { ...t, source: 'manual' as const }
        : t
    ),
  })),
```

---

## ✅ 验收标准

### 功能验收
- [x] SidePanel 录制完成后自动生成所有工具（包括 navigate）
- [x] 工具批量同步到 Dashboard
- [x] 重复的 tool_id 会更新而非重复添加
- [x] 工具按来源分类显示（最近录制 / 长期保存）
- [x] 支持"保存"操作将工具移到长期库
- [x] 删除硬编码的 TEST_TOOLS

### 质量验收
- [x] `npm run typecheck` 通过
- [x] `npm run lint` 通过
- [x] 无明显性能问题

### 文档验收
- [x] JSDoc 注释完整
- [x] Spec 状态更新为 Implemented

---

## 🧪 测试策略

### 手动测试场景

1. **首次录制同步**
   - 预期：所有录制的工具出现在"最近录制" Tab

2. **包含 navigate 的录制**
   - 预期：navigate 工具正确同步，使用 direct 策略

3. **保存操作**
   - 预期：保存后工具移到"长期保存" Tab

4. **重复录制相同动作**
   - 预期：更新现有工具，保留 source 状态

---

## 📚 决策记录 (ADR)

| 决策 | 选择方案 | 理由 | 日期 |
|------|---------|------|------|
| 存储格式 | 工具数组而非单个工具 | 支持批量同步，减少存储操作 | 2026-03-24 |
| 工具分类 | 基于 source 字段 | 简单可靠，支持扩展 | 2026-03-24 |
| navigate 支持 | 特殊处理，direct 策略 | SDK 规范，无需 selector | 2026-03-24 |
| TEST_TOOLS | 删除硬编码加载 | 避免污染用户数据 | 2026-03-24 |

---

## 📅 变更历史

| 日期 | 时间 | 版本 | 变更说明 | 作者 |
|------|------|------|----------|------|
| 2026-03-24 | 14:30 | 0.1.0 | 初始版本 | Claude |
| 2026-03-24 | 15:00 | 1.0.0 | 实现完成（方案b） | Claude |
| 2026-03-24 | 16:45 | 2.0.0 | 批量同步 + 工具分类 + navigate 支持 | Claude |

---

## 📚 相关文档

- [dashboard-sidepanel-bridge.md](./dashboard-sidepanel-bridge.md) - Dashboard-SidePanel 联动
- [DEVELOPMENT.md](../DEVELOPMENT.md) - 开发规范
- [sdk-architecture.md](./architecture/sdk-architecture.md) - SDK 架构
