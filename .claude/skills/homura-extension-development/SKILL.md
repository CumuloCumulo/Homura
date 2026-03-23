---
name: homura-extension-development
description: "专门用于 Chrome Extension 功能开发的 skill"
---

# Homura Extension Development Skill

> 专门用于 Chrome Extension 功能开发的 skill

## 何时使用

当以下任务时使用此 skill：
- 修改 `src/background/`、`src/content/`、`src/sidepanel/`、`src/dashboard/`
- 添加新的 UI 组件
- 实现 Chrome 消息传递
- 集成 AI 服务

## 开发前检查

开始开发前，必须：
1. 阅读 `docs/DEVELOPMENT.md` 确认开发规范
2. 确认使用的导入：`@homura/sdk` vs `@shared/*`
3. 检查是否需要创建类型
4. 确认组件位置（sidepanel vs dashboard）

## 模块划分

### Background (`src/background/`)
- **职责**: Service Worker，智能层
- **主要文件**:
  - `index.ts` - 入口、消息路由、AI 初始化
  - `orchestrator.ts` - 任务编排
  - `messaging.ts` - 消息处理
- **注意**: Service Worker 生命周期，使用 `chrome.storage.session` 持久化状态

### Content (`src/content/`)
- **职责**: Content Script，执行层
- **主要文件**:
  - `index.tsx` - 入口
  - `messageHandler.ts` - 消息处理
  - `engine/` - SDK 包装
- **注意**: 必须注入到页面才能工作

### Sidepanel (`src/sidepanel/`)
- **职责**: 录制器 UI
- **使用**:
  - 记录用户操作
  - 元素检查
  - 选择器生成
- **风格**: 紧凑、渐进式披露

### Dashboard (`src/dashboard/`)
- **职责**: 管理中心 UI
- **使用**:
  - 工具库管理
  - Rule Book 编辑
  - 执行日志

## 导入规则（非常重要）

```typescript
// ✅ 正确：SDK 功能直接从 @homura/sdk 导入
import { analyzeElement, createUnifiedSelector } from '@homura/sdk/selector';
import { executeClick } from '@homura/sdk/primitives';
import { executeTool } from '@homura/sdk/executor';
import type { UnifiedSelector, AtomicTool } from '@homura/sdk/types';

// ✅ 正确：扩展特定功能从 @shared 导入
import type { HomuraMessage, MessageType } from '@shared/types';
import { sendMessageToContent, getActiveTab } from '@shared/utils';
import { STORAGE_KEYS, EXTENSION_IDS } from '@shared/constants';

// ❌ 错误：不要从 @shared 导入 SDK 功能
import type { UnifiedSelector } from '@shared/types';  // 已废弃
```

## 消息传递规范

### 消息类型定义
在 `src/shared/types.ts` 中定义：
```typescript
export type HomuraMessage =
  | { type: 'START_INSPECT'; timestamp: number }
  | { type: 'STOP_INSPECT'; timestamp: number }
  | { type: 'ACTION_RECORDED'; action: RecordedAction }
  // ...
```

### 发送消息
```typescript
import { sendMessageToContent } from '@shared/utils';

await sendMessageToContent({
  type: 'START_INSPECT',
  timestamp: Date.now()
});
```

### 处理消息
```typescript
chrome.runtime.onMessage.addListener((message: HomuraMessage) => {
  switch (message.type) {
    case 'START_INSPECT':
      // 处理逻辑
      break;
  }
});
```

## UI 组件规范

### 组件位置
- **Sidepanel 组件** → `src/sidepanel/components/`
- **Dashboard 组件** → `src/dashboard/components/`
- **共享组件** → `src/shared/components/`（如需要）

### 使用代码模板
- 函数: 输入 `hmf` + Tab
- 测试: 输入 `hmt` + Tab
- 组件: 输入 `hmc` + Tab

### UI 风格
- 紧凑布局（p-2/p-3，text-xs）
- 渐进式披露（默认收起）
- 舒缓动效（duration-200+）
- Deep Space 暗色系

## 状态管理

### Zustand Store
```typescript
// ✅ 正确：读取状态
const isRecording = useRecordingStore(state => state.isRecording);

// ✅ 正确：更新状态
useRecordingStore.getState().setRecording(true);

// ❌ 错误：在组件外直接使用 hook
const isRecording = useRecordingStore(state => state.isRecording);  // 错误！
```

### 持久化
```typescript
// 使用 chrome.storage.session 持久化
await chrome.storage.session.set({ recordingState: state });

// 读取持久化状态
const result = await chrome.storage.session.get('recordingState');
```

## 常见任务

### 添加新的 UI 组件
```
1. 使用 hmc 模板创建组件
2. 遵循 UI 风格规范
3. 添加到对应的 App.tsx
4. 测试功能
```

### 添加新的消息类型
```
1. 在 src/shared/types.ts 中定义类型
2. 在发送方添加消息发送逻辑
3. 在接收方添加消息处理逻辑
4. 测试消息传递
```

### 集成新的 AI 功能
```
1. 在 src/services/ai/types.ts 中定义类型
2. 在 src/services/ai/client.ts 中实现 API 调用
3. 在 src/services/ai/prompts.ts 中添加 Prompt 模板
4. 在调用方使用 AI 服务
```

## 自动化检查

开发 Extension 时，AI 必须：
- ✅ 每次修改后运行 `npm run typecheck`
- ✅ 完成功能后运行 `npm run lint:fix`
- ✅ 修改消息类型后运行 `npm run check:imports`
- ✅ 完成后建议运行 `npm run check:all`

## 常见错误

### "Could not establish connection"
**原因**: Content Script 未加载
**解决**:
1. 刷新目标页面
2. 检查是否在 chrome:// 页面（不支持）
3. 重新加载扩展

### Zustand store 使用错误
**错误**: `TS2352: Conversion may be a mistake`
**解决**: 使用 `as unknown as Type` 进行类型断言

### 导入路径错误
**错误**: 从错误的模块导入类型
**解决**: 检查导入路径，SDK 类型从 `@homura/sdk/types` 导入

## 调试技巧

### 查看 Background Console
```
1. 打开 chrome://extensions/
2. 点击扩展的 "Service Worker" 链接
3. 查看 Console 日志
```

### 查看 Content Script Console
```
1. 在目标页面上打开 DevTools (F12)
2. 查看 Console 日志
```

### 检查消息传递
```typescript
// 在消息发送和接收处添加日志
console.log('[Homura] Sending message:', message);
console.log('[Homura] Received message:', message);
```

## 相关文档

- [开发规范](../../docs/DEVELOPMENT.md)
- [项目 CLAUDE.md](../../CLAUDE.md)
- [强制规则](../rules.md)
