# Dashboard 工具更新监听规范文档

> 📋 本文档定义 Dashboard 监听 SidePanel 工具更新并同步到工具库的技术规范

## 📄 元信息

| 字段 | 值 |
|------|-----|
| **创建时间** | 2026-03-25 14:30 |
| **状态** | Proposed - 暂缓 |
| **优先级** | P2 |
| **负责人** | - |
| **预计完成** | 2026-03-26 |
| **实际完成** | - |
| **相关 Issue** | - |
| **父 Spec** | [sidepanel-tool-editing.md](./sidepanel-tool-editing.md) |
| **依赖 Spec** | [auto-tool-sync.md](./auto-tool-sync.md) |

---

## 🎯 快速上下文

> **一句话描述**: Dashboard 监听 SidePanel 发送的工具更新，自动同步到工具库

### 价值主张
- **用户问题**: 在 SidePanel 测试模式中修复工具后，需要手动回到 Dashboard 更新工具
- **技术价值**: 自动同步更新，减少手动操作，保持数据一致性
- **业务影响**: 提升调试效率，实现流畅的"测试-修复-同步"工作流

### 边界定义
**包含**:
- ✅ Dashboard 监听 TOOL_UPDATED 消息
- ✅ 自动更新工具库中对应的工具
- ✅ 同步到 toolkitStore（如果工具属于某个工具集）
- ✅ 保存到 chrome.storage 持久化
- ✅ 返回 TOOL_SYNCED 确认消息

**不包含**:
- ❌ 工具的创建和删除（使用现有流程）
- ❌ 工具集的创建和删除（使用现有流程）
- ❌ 工具参数的编辑（在 Dashboard 中进行）

---

## 🔗 关联资源

| 类型 | 路径/链接 | 说明 |
|------|----------|------|
| **实现文件** | `src/dashboard/App.tsx` | 添加消息监听 |
| **实现文件** | `src/dashboard/stores/toolStore.ts` | 工具库状态管理 |
| **实现文件** | `src/dashboard/stores/toolkitStore.ts` | 工具集状态管理 |
| **实现文件** | `src/background/index.ts` | TOOL_UPDATED 消息处理 |
| **实现文件** | `src/sidepanel/stores/recordingStore.ts` | 发送 TOOL_UPDATED |
| **相关 Spec** | [sidepanel-tool-editing.md](./sidepanel-tool-editing.md) | SidePanel 工具编辑 |
| **相关 Spec** | [auto-tool-sync.md](./auto-tool-sync.md) | 录制工具自动同步 |

---

## 🏗️ 技术设计

### 当前架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        现有工具同步架构                                    │
└─────────────────────────────────────────────────────────────────────────┘

SidePanel                          Background                      Dashboard
┌──────────────┐                   ┌──────────────┐               ┌──────────────┐
│ TestPanel    │                   │              │               │              │
│              │ TOOL_UPDATED      │              │               │              │
│ finishEditing│ ────────────────▶ │ 存储 update  │               │              │
│              │                   │              │               │              │
└──────────────┘                   └──────────────┘               └──────────────┘
                                          │
                                          │ chrome.storage.local
                                          │ homura_tool_update_${id}_${idx}
                                          ▼
                                   ┌──────────────┐
                                   │  ❌ 无监听   │  ← 问题：Dashboard 不监听
                                   └──────────────┘
```

### 目标架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        工具更新同步架构                                    │
└─────────────────────────────────────────────────────────────────────────┘

SidePanel                          Background                      Dashboard
┌──────────────┐                   ┌──────────────┐               ┌──────────────┐
│ TestPanel    │                   │              │               │ App.tsx      │
│              │ TOOL_UPDATED      │              │               │              │
│ finishEditing│ ────────────────▶ │ 存储 update  │ ──storage──▶ │ ✅ 监听更新  │
│              │                   │              │    change     │              │
│              │                   │              │               │ updateTool() │
│              │                   │              │               │      │       │
│              │                   │              │               │      ▼       │
│              │                   │              │               │ toolStore    │
│              │                   │              │               │      │       │
│              │ ◀────────────────│ ◀─────────── │ ◀──────────── │      ▼       │
│              │  TOOL_SYNCED     │  转发确认    │  发送确认     │ toolkitStore │
│              │                   │              │               │              │
└──────────────┘                   └──────────────┘               └──────────────┘
```

### 方案选择

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| **A. Storage 监听** | Dashboard 监听 chrome.storage.onChanged | 与现有模式一致，简单可靠 | 需要额外的存储读写 |
| **B. Runtime 消息** | Dashboard 监听 chrome.runtime.onMessage | 直接通信，无存储开销 | 需要新的监听模式 |

**决策**: 采用 **方案 A（Storage 监听）**
- 与现有的 `replaceRecordedTools` 模式一致
- Background 已经实现了存储逻辑
- 可靠性高，不依赖页面是否打开

### 模块划分

| 模块 | 职责 | 位置 | 状态 |
|------|------|------|------|
| Dashboard App | 监听存储变化，更新工具 | `src/dashboard/App.tsx` | ⏳ 需修改 |
| toolStore | 更新单个工具 | `src/dashboard/stores/toolStore.ts` | ✅ 已有 updateTool |
| toolkitStore | 更新工具集中的工具 | `src/dashboard/stores/toolkitStore.ts` | ⏳ 需添加方法 |
| Background | 存储更新数据 | `src/background/index.ts` | ✅ 已实现 |

---

## 📝 类型定义

### 存储数据结构

```typescript
// 存储键模式
const TOOL_UPDATE_KEY_PATTERN = 'homura_tool_update_${toolkitId}_${toolIndex}';

// 存储的数据结构
interface ToolUpdateData {
  toolkitId: string;
  toolIndex: number;
  updatedTool: AtomicTool;
  timestamp: number;
}
```

### 消息类型（已存在）

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
    updatedTool: AtomicTool;
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
```

---

## 🔌 API 设计

### Dashboard App.tsx 新增监听

```typescript
/**
 * 监听工具更新
 * 当 SidePanel 中的工具被编辑后，自动同步到 Dashboard
 */
useEffect(() => {
  const handleStorageChange = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName !== 'local') return;

    // 检查是否有工具更新
    for (const key of Object.keys(changes)) {
      if (key.startsWith('homura_tool_update_')) {
        const updateData = changes[key].newValue as ToolUpdateData | undefined;

        if (updateData?.updatedTool) {
          console.log('[Dashboard] Tool update received:', {
            toolkitId: updateData.toolkitId,
            toolIndex: updateData.toolIndex,
            toolName: updateData.updatedTool.name,
          });

          // 1. 更新工具库
          updateTool(updateData.updatedTool.tool_id, updateData.updatedTool);

          // 2. 更新工具集（如果工具属于某个工具集）
          updateToolInToolkit(
            updateData.toolkitId,
            updateData.toolIndex,
            updateData.updatedTool
          );

          // 3. 清理存储（可选，避免重复处理）
          chrome.storage.local.remove(key);

          // 4. 发送确认（可选，用于通知 SidePanel）
          chrome.runtime.sendMessage({
            type: 'TOOL_SYNCED',
            payload: {
              toolkitId: updateData.toolkitId,
              toolIndex: updateData.toolIndex,
            },
          });
        }
      }
    }
  };

  chrome.storage.onChanged.addListener(handleStorageChange);
  return () => chrome.storage.onChanged.removeListener(handleStorageChange);
}, [updateTool, updateToolInToolkit]);
```

### toolkitStore 新增方法

```typescript
// src/dashboard/stores/toolkitStore.ts

interface ToolkitStore {
  // ... 现有方法 ...

  /**
   * 更新工具集中的单个工具
   * @param toolkitId - 工具集 ID
   * @param toolIndex - 工具在工具集中的索引
   * @param updatedTool - 更新后的工具
   */
  updateToolInToolkit: (
    toolkitId: string,
    toolIndex: number,
    updatedTool: AtomicTool
  ) => void;
}

// 实现
updateToolInToolkit: (toolkitId, toolIndex, updatedTool) =>
  set((state) => ({
    toolkits: state.toolkits.map((toolkit) =>
      toolkit.id === toolkitId
        ? {
            ...toolkit,
            tools: toolkit.tools.map((tool, idx) =>
              idx === toolIndex ? updatedTool : tool
            ),
            updatedAt: Date.now(),
          }
        : toolkit
    ),
  })),
```

---

## 🔄 工作流

### 正常流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. SidePanel 测试失败，用户点击"在检查模式中修复"                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. 切换到检查模式，编辑选择器                                              │
│    - 用户修改 scope/anchor/target                                        │
│    - 原地测试验证                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. 用户点击"同步到 Dashboard"                                            │
│    - InspectMode 调用 recordingStore.finishEditing()                     │
│    - finishEditing 发送 TOOL_UPDATED 消息                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. Background 处理消息                                                    │
│    - 接收 TOOL_UPDATED 消息                                              │
│    - 存储到 chrome.storage.local                                         │
│    - 返回 { success: true }                                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. Dashboard 监听存储变化                                                 │
│    - 检测到 homura_tool_update_${id}_${idx} 变化                         │
│    - 读取更新数据                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. Dashboard 更新状态                                                     │
│    - 调用 toolStore.updateTool() 更新工具库                              │
│    - 调用 toolkitStore.updateToolInToolkit() 更新工具集                  │
│    - Zustand persist 自动保存到 chrome.storage                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 7. Dashboard 清理并发送确认                                               │
│    - 删除存储中的更新数据（避免重复处理）                                  │
│    - 发送 TOOL_SYNCED 消息（可选）                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 8. SidePanel 收到确认（可选）                                             │
│    - 自动切换回测试模式                                                   │
│    - 显示工具已更新                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 错误处理

| 场景 | 处理 | 结果 |
|------|------|------|
| toolkitId 不存在 | 忽略工具集更新，只更新工具库 | 工具库已更新 |
| toolIndex 越界 | 忽略工具集更新，只更新工具库 | 工具库已更新 |
| Dashboard 未打开 | 存储保持，下次打开时处理 | 延迟更新 |
| 存储写入失败 | 记录错误，不阻塞流程 | 同步失败但可重试 |

---

## ✅ 验收标准

### 功能验收
- [ ] Dashboard 监听工具更新存储变化
- [ ] 工具库中的工具自动更新
- [ ] 工具集中的工具自动更新
- [ ] 更新后 Zustand persist 自动保存
- [ ] 更新数据被清理，避免重复处理
- [ ] SidePanel 收到确认后自动返回测试模式

### 质量验收
- [ ] `npm run typecheck` 通过
- [ ] `npm run lint` 通过
- [ ] 无控制台错误
- [ ] 更新延迟 < 100ms

### 文档验收
- [ ] Spec 状态更新为 Implemented
- [ ] JSDoc 注释完整

---

## 🧪 测试策略

### 手动测试场景

1. **场景1：基本同步**
   - Dashboard 打开
   - SidePanel 测试失败
   - 编辑工具并同步
   - 预期：Dashboard 工具库和工具集同时更新

2. **场景2：Dashboard 未打开**
   - Dashboard 关闭
   - SidePanel 编辑工具并同步
   - 打开 Dashboard
   - 预期：Dashboard 启动时检测到更新并处理

3. **场景3：工具不属于任何工具集**
   - 编辑独立的工具
   - 预期：只更新工具库，不影响工具集

4. **场景4：多次编辑同一工具**
   - 编辑工具 A，同步
   - 再次编辑工具 A，同步
   - 预期：每次更新都成功

---

## 📋 TODO 清单

### 设计阶段
- [x] 类型定义
- [x] API 设计
- [x] 方案选择

### 实现阶段
- [x] Dashboard App.tsx 添加存储监听
- [x] toolkitStore 添加 updateToolByIndex 方法
- [x] toolkitOperations 添加 updateToolInToolkitByIndex 函数

### 鴚收阶段
- [ ] 手动测试场景
- [ ] 类型检查通过
- [ ] 文档更新
- [ ] 手动测试场景
- [ ] 类型检查通过
- [ ] 文档更新

---

## 📚 决策记录 (ADR)

| 决策 | 选择方案 | 理由 | 日期 |
|------|---------|------|------|
| 通信方式 | Storage 监听 | 与现有模式一致，可靠性高 | 2026-03-25 |
| 确认机制 | 可选确认 | 不阻塞流程，提升可靠性 | 2026-03-25 |
| 存储清理 | 自动清理 | 避免重复处理 | 2026-03-25 |

---

## 📅 变更历史

| 日期 | 时间 | 版本 | 变更说明 | 作者 |
|------|------|------|----------|------|
| 2026-03-25 | 14:30 | 0.1.0 | 初始版本 | Claude |
| 2026-03-25 | 15:30 | 1.0.0 | 实现完成 | Claude |

---

## 📚 相关文档

- [sidepanel-tool-editing.md](./sidepanel-tool-editing.md) - SidePanel 工具编辑
- [auto-tool-sync.md](./auto-tool-sync.md) - 录制工具自动同步
- [DEVELOPMENT.md](../../DEVELOPMENT.md) - 开发规范
