# Storage API 规范

## 📄 元信息

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 版本 | 0.1.0 |
| 创建时间 | 2026-03-24 17:45 |
| 作者 | Claude Code |
| 预计完成 | 2026-03-26 |

---

## 🎯 快速上下文

> **一句话描述**: 统一的 Chrome Storage 访问层，提供类型安全和自动同步

- **用户问题**: Storage 访问分散、键名硬编码、缺乏类型安全
- **技术价值**: 单一数据源、类型安全的存储访问、自动状态同步
- **业务影响**: 减少状态相关 bug，简化跨组件数据共享

---

## 🔗 关联资源

| 类型 | 路径 | 说明 |
|------|------|------|
| 工具函数 | `src/dashboard/utils/toolkitOperations.ts` | 工具集存储操作 |
| Orchestrator | `src/background/orchestrator.ts` | 执行状态存储 |
| 类型定义 | `src/shared/types.ts` | 存储数据类型 |

---

## 🏗️ 技术设计

### Storage 架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Homura Storage 架构                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     chrome.storage.local                         │   │
│  │  ┌────────────────────┐  ┌────────────────────┐                │   │
│  │  │ homura_toolkits    │  │ homura_current_    │                │   │
│  │  │ (Toolkit[])        │  │ toolkit (Toolkit)  │                │   │
│  │  └────────────────────┘  └────────────────────┘                │   │
│  │  ┌────────────────────┐  ┌────────────────────┐                │   │
│  │  │ homura_execution_  │  │ ai_api_key         │                │   │
│  │  │ state (ExecState)  │  │ (string)           │                │   │
│  │  └────────────────────┘  └────────────────────┘                │   │
│  │  ┌────────────────────┐                                         │   │
│  │  │ homura_tool_update │  ← 临时存储，用于跨组件同步             │   │
│  │  │ _{id}_{index}      │                                         │   │
│  │  └────────────────────┘                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    chrome.storage.session                        │   │
│  │  ┌────────────────────┐                                         │   │
│  │  │ recordingState     │  ← 跨 Service Worker 重启持久化         │   │
│  │  │ (RecordingState)   │                                         │   │
│  │  └────────────────────┘                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 存储键命名规范

| 前缀 | 用途 | 生命周期 | 示例 |
|------|------|----------|------|
| `homura_` | 全局数据 | 持久化 | `homura_toolkits` |
| `homura_current_` | 当前状态 | 持久化 | `homura_current_toolkit` |
| `homura_execution_` | 执行状态 | 持久化 | `homura_execution_state` |
| `homura_tool_update_` | 临时同步 | 短期 | `homura_tool_update_tk123_0` |
| `ai_` | AI 配置 | 持久化 | `ai_api_key` |
| `recordingState` | 录制状态 | 会话级 | `recordingState` |

---

## 📝 类型定义

### 存储键枚举

```typescript
/**
 * 存储键常量
 * 使用枚举确保键名一致性
 */
export const StorageKeys = {
  // 持久化存储
  TOOLKITS: 'homura_toolkits',
  CURRENT_TOOLKIT: 'homura_current_toolkit',
  EXECUTION_STATE: 'homura_execution_state',
  AI_API_KEY: 'ai_api_key',

  // 会话级存储
  RECORDING_STATE: 'recordingState',
} as const;

export type StorageKey = typeof StorageKeys[keyof typeof StorageKeys];
```

### 存储数据类型

```typescript
/**
 * 工具集列表存储结构
 */
interface StoredToolkits {
  toolkits: Toolkit[];
  lastUpdated: string;
  version: string;
}

/**
 * 当前工具集存储结构
 * 用于 Dashboard → SidePanel 传输
 */
interface StoredCurrentToolkit {
  toolkitId: string;
  toolkitName: string;
  tools: AtomicTool[];
  timestamp: string;
  version: string;
}

/**
 * 执行状态存储结构
 */
interface StoredExecutionState extends ExecutionState {
  version: string;
}

/**
 * 录制状态存储结构
 */
interface StoredRecordingState {
  isRecording: boolean;
  tabId: number | null;
  startTime: number | null;
}

/**
 * 工具更新临时存储
 */
interface StoredToolUpdate {
  toolkitId: string;
  toolIndex: number;
  updatedTool: AtomicTool;
  timestamp: number;
}
```

---

## 🔌 API 设计

### StorageService 类

```typescript
/**
 * 统一的存储访问层
 * 提供类型安全的存储操作和自动同步
 */
export class StorageService {
  // ===========================================================================
  // 工具集操作
  // ===========================================================================

  /**
   * 获取所有工具集
   * @returns 工具集列表
   */
  static async getToolkits(): Promise<Toolkit[]>;

  /**
   * 保存工具集列表
   * @param toolkits - 工具集列表
   */
  static async saveToolkits(toolkits: Toolkit[]): Promise<void>;

  /**
   * 获取单个工具集
   * @param toolkitId - 工具集 ID
   * @returns 工具集或 undefined
   */
  static async getToolkit(toolkitId: string): Promise<Toolkit | undefined>;

  /**
   * 保存单个工具集
   * @param toolkit - 工具集
   */
  static async saveToolkit(toolkit: Toolkit): Promise<void>;

  /**
   * 删除工具集
   * @param toolkitId - 工具集 ID
   */
  static async deleteToolkit(toolkitId: string): Promise<void>;

  // ===========================================================================
  // 当前工具集操作（Dashboard → SidePanel 传输）
  // ===========================================================================

  /**
   * 发送工具集到 SidePanel
   * 写入 homura_current_toolkit，触发 storage.onChanged
   * @param toolkit - 工具集
   */
  static async sendToolkitToSidePanel(toolkit: Toolkit): Promise<void>;

  /**
   * 获取当前工具集（SidePanel 使用）
   * @returns 当前工具集数据
   */
  static async getCurrentToolkit(): Promise<StoredCurrentToolkit | null>;

  /**
   * 清除当前工具集
   */
  static async clearCurrentToolkit(): Promise<void>;

  // ===========================================================================
  // 执行状态操作
  // ===========================================================================

  /**
   * 保存执行状态
   * @param state - 执行状态
   */
  static async saveExecutionState(state: ExecutionState): Promise<void>;

  /**
   * 加载执行状态
   * @returns 执行状态或 null
   */
  static async loadExecutionState(): Promise<ExecutionState | null>;

  /**
   * 清除执行状态
   */
  static async clearExecutionState(): Promise<void>;

  // ===========================================================================
  // 工具更新操作（SidePanel → Dashboard 同步）
  // ===========================================================================

  /**
   * 保存工具更新
   * @param toolkitId - 工具集 ID
   * @param toolIndex - 工具索引
   * @param updatedTool - 更新后的工具
   */
  static async saveToolUpdate(
    toolkitId: string,
    toolIndex: number,
    updatedTool: AtomicTool
  ): Promise<void>;

  /**
   * 获取工具更新
   * @param toolkitId - 工具集 ID
   * @param toolIndex - 工具索引
   * @returns 工具更新数据
   */
  static async getToolUpdate(
    toolkitId: string,
    toolIndex: number
  ): Promise<StoredToolUpdate | null>;

  /**
   * 清除工具更新
   * @param toolkitId - 工具集 ID
   * @param toolIndex - 工具索引
   */
  static async clearToolUpdate(
    toolkitId: string,
    toolIndex: number
  ): Promise<void>;

  // ===========================================================================
  // AI 配置操作
  // ===========================================================================

  /**
   * 保存 AI API Key
   * @param apiKey - API Key
   */
  static async saveApiKey(apiKey: string): Promise<void>;

  /**
   * 获取 AI API Key
   * @returns API Key 或 null
   */
  static async getApiKey(): Promise<string | null>;

  // ===========================================================================
  // 录制状态操作（会话级）
  // ===========================================================================

  /**
   * 保存录制状态
   * @param state - 录制状态
   */
  static async saveRecordingState(state: StoredRecordingState): Promise<void>;

  /**
   * 加载录制状态
   * @returns 录制状态或 null
   */
  static async loadRecordingState(): Promise<StoredRecordingState | null>;

  /**
   * 清除录制状态
   */
  static async clearRecordingState(): Promise<void>;
}
```

### React Hook

```typescript
/**
 * 监听存储变化的 React Hook
 * @param key - 存储键
 * @returns 存储值和设置函数
 */
function useStorage<T>(key: StorageKey): [T | null, (value: T) => Promise<void>];

/**
 * 监听当前工具集变化的 Hook
 * SidePanel 使用此 Hook 自动接收来自 Dashboard 的工具集
 */
function useCurrentToolkit(): {
  toolkit: StoredCurrentToolkit | null;
  isLoading: boolean;
  error: Error | null;
};
```

---

## 🔄 工作流

### Dashboard → SidePanel 工具集传输

```
1. Dashboard 调用 StorageService.sendToolkitToSidePanel(toolkit)
   └─► 写入 chrome.storage.local['homura_current_toolkit']

2. SidePanel 的 useCurrentToolkit Hook 监听到变化
   └─► storage.onChanged 触发
   └─► 自动更新 toolkit 状态
   └─► 组件重新渲染显示新工具集
```

### SidePanel → Dashboard 工具更新同步

```
1. SidePanel 编辑工具后调用 StorageService.saveToolUpdate(...)
   └─► 写入 chrome.storage.local['homura_tool_update_{id}_{index}']

2. Dashboard 监听到变化
   └─► storage.onChanged 触发
   └─► 读取更新数据
   └─► 应用到本地工具集
   └─► 清除临时存储
```

---

## ✅ 验收标准

### 功能验收

- [ ] 所有存储操作有类型安全
- [ ] 存储键使用常量，无硬编码字符串
- [ ] 跨组件数据同步正常工作
- [ ] Service Worker 重启后状态恢复

### 质量验收

- [ ] 类型检查通过：`npm run typecheck`
- [ ] 无 `any` 类型使用
- [ ] 所有公开方法有 JSDoc 注释
- [ ] 错误处理完善

### 文档验收

- [ ] 存储键列表完整
- [ ] 数据流图清晰
- [ ] 使用示例完整

---

## 🧪 测试策略

### 单元测试

- StorageService 各方法测试
- 序列化/反序列化测试
- 错误处理测试

### 集成测试

- Dashboard → SidePanel 数据传输测试
- Service Worker 重启恢复测试
- 并发写入测试

---

## 📋 TODO 清单

### 设计阶段
- [x] 存储键命名规范
- [x] 数据类型定义
- [ ] 版本迁移策略

### 实现阶段
- [ ] 创建 `src/shared/storage/StorageService.ts`
- [ ] 创建 `src/shared/storage/useStorage.ts` Hook
- [ ] 重构现有存储访问代码
- [ ] 添加数据版本管理

### 测试阶段
- [ ] 编写 StorageService 单元测试
- [ ] 编写跨组件同步集成测试

---

## 📚 决策记录

| 决策 | 选择方案 | 理由 |
|------|---------|------|
| 存储位置 | local + session 混合 | local 持久化数据，session 会话级状态 |
| 键命名 | `homura_` 前缀 | 避免与其他扩展冲突，易于识别 |
| 同步机制 | storage.onChanged | Chrome 原生支持，无需额外消息 |
| 版本管理 | 每个数据带 version 字段 | 支持未来数据迁移 |

---

## 📅 变更历史

| 日期 | 时间 | 版本 | 变更说明 | 作者 |
|------|------|------|----------|------|
| 2026-03-24 | 17:45 | 0.1.0 | 初始版本 | Claude Code |
