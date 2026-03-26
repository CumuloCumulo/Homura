# API 规范索引

Homura 项目的 API 规范文档，定义所有跨组件通信和数据存储的接口。

---

## 📁 文档列表

| 文档 | 状态 | 描述 |
|------|------|------|
| [message-protocol.md](./message-protocol.md) | Draft | Chrome Extension 消息通信协议 |
| [storage-api.md](./storage-api.md) | Draft | 统一的存储访问层 |

---

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Homura 通信架构                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────┐                      ┌─────────────┐                  │
│   │  Dashboard  │                      │  SidePanel  │                  │
│   │             │                      │             │                  │
│   │  - 管理工具集│                      │  - 测试工具 │                  │
│   │  - 编辑工具 │                      │  - 录制操作 │                  │
│   └──────┬──────┘                      └──────┬──────┘                  │
│          │                                    │                          │
│          │     ┌─────────────────────┐        │                          │
│          │     │   Storage Layer     │        │                          │
│          ├────►│  (chrome.storage)   │◄───────┤                          │
│          │     │                     │        │                          │
│          │     │  - homura_toolkits  │        │                          │
│          │     │  - homura_current_* │        │                          │
│          │     │  - homura_tool_update_*     │                          │
│          │     └─────────────────────┘        │                          │
│          │                                    │                          │
│          └────────────┬───────────────────────┘                          │
│                       │                                                  │
│                       ▼                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                      Background                                  │   │
│   │                                                                  │   │
│   │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │   │
│   │   │ Orchestrator│    │ AI Service  │    │  Messaging  │        │   │
│   │   │             │    │             │    │             │        │   │
│   │   │ - 执行编排  │    │ - 选择器生成│    │ - 消息路由  │        │   │
│   │   │ - 状态管理  │    │ - 工具生成  │    │ - 状态同步  │        │   │
│   │   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │   │
│   │          │                  │                  │                │   │
│   │          └──────────────────┼──────────────────┘                │   │
│   │                             │                                    │   │
│   └─────────────────────────────┼────────────────────────────────────┘   │
│                                 │                                        │
│                                 ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     Content Script                               │   │
│   │                                                                  │   │
│   │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │   │
│   │   │  Selector   │    │  Executor   │    │  Recorder   │        │   │
│   │   │   Engine    │    │  Primitives │    │   Mode      │        │   │
│   │   └─────────────┘    └─────────────┘    └─────────────┘        │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 消息流汇总

### Dashboard ↔ SidePanel

| 消息类型 | 方向 | 触发条件 |
|----------|------|----------|
| `SEND_TOOLKIT_TO_SIDEPANEL` | Dashboard → SidePanel | 用户点击"发送到测试" |
| `TOOL_UPDATED` | SidePanel → Dashboard | 工具在检查模式中编辑完成 |
| `TOOL_SYNCED` | Dashboard → SidePanel | 工具更新同步完成 |

### SidePanel ↔ Background

| 消息类型 | 方向 | 触发条件 |
|----------|------|----------|
| `HOMURA_START_EXECUTION` | SidePanel → Background | 开始连贯测试 |
| `HOMURA_CANCEL_EXECUTION` | SidePanel → Background | 停止测试 |
| `HOMURA_GET_STATE` | SidePanel → Background | 轮询执行状态 |
| `HOMURA_RESUME_EXECUTION` | Background 内部 | 页面跳转后恢复执行 |

### Background ↔ Content Script

| 消息类型 | 方向 | 触发条件 |
|----------|------|----------|
| `EXECUTE_TOOL` | Background → Content | 执行工具 |
| `PING` | Background → Content | 检查就绪状态 |
| `START_RECORDING` | Background → Content | 开始录制 |
| `STOP_RECORDING` | Background → Content | 停止录制 |

---

## 📝 快速参考

### 存储键

```typescript
// 工具集
'homura_toolkits'              // Toolkit[] - 所有工具集
'homura_current_toolkit'       // StoredCurrentToolkit - 当前测试工具集
'homura_tool_update_{id}_{idx}' // StoredToolUpdate - 工具更新临时存储

// 执行
'homura_execution_state'       // ExecutionState - 执行状态

// 配置
'ai_api_key'                   // string - AI API Key

// 会话级
'recordingState'               // StoredRecordingState - 录制状态
```

### 错误码

```typescript
enum ErrorCode {
  TARGET_NOT_FOUND = 'TARGET_NOT_FOUND',
  SCOPE_NOT_FOUND = 'SCOPE_NOT_FOUND',
  ANCHOR_NOT_FOUND = 'ANCHOR_NOT_FOUND',
  ACTION_FAILED = 'ACTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  PAGE_NOT_READY = 'PAGE_NOT_READY',
  UNKNOWN = 'UNKNOWN',
}
```

---

## 🔗 相关文档

- [开发规范](../../DEVELOPMENT.md)
- [SDK 架构](../architecture/sdk-architecture.md)
- [执行流程](../workflows/execution-flow.md)
