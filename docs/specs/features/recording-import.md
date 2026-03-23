# 录制数据导入 Dashboard 规范文档

> 📋 本文档定义 SidePanel 录制数据导入到 Dashboard 工具库的技术规范

## 📄 元信息

- **创建日期**: 2026-03-23
- **状态**: Proposed
- **优先级**: P0
- **负责人**: -

---

## 🎯 功能概述

**目标**: 实现 SidePanel 录制数据到 Dashboard 工具库的完整数据流

用户在 SidePanel 录制页面操作后，可以一键保存到 Dashboard，自动转换为可复用的 AtomicTool。

**范围**:
- ✅ 录制数据转换为 AtomicTool
- ✅ Chrome Storage 同步机制
- ✅ Dashboard 导入 UI
- ✅ SidePanel 导出按钮
- ❌ AI 智能参数识别（后续功能）
- ❌ 多操作合并为复杂工具（后续功能）

---

## 🏗️ 技术设计

### 架构设计

```
SidePanel (录制层) → Chrome Storage → Dashboard (管理层)
     RecordingPanel      数据中转       Recording Import Dialog
                                         ↓
                                         Converter
                                         ↓
                                         ToolLibrary
```

### 模块划分

| 模块 | 职责 | 位置 |
|------|------|------|
| Converter | RecordedAction → AtomicTool 转换 | src/dashboard/utils/recordingConverter.ts |
| Storage | Chrome Storage 存取管理 | src/shared/storage/recordingStorage.ts |
| Import Dialog | 导入 UI 组件 | src/dashboard/components/RecordingImportDialog.tsx |
| Export Button | SidePanel 导出功能 | src/sidepanel/components/RecordingPanel.tsx |

---

## 📝 类型定义

### 扩展类型

\`\`\`typescript
// src/shared/storage/recordingStorage.ts

export interface RecordingData {
  id: string;
  name: string;
  actions: SerializableRecordedAction[];
  createdAt: string;
  url?: string;
  imported?: boolean;
}

export interface SerializableRecordedAction {
  id: string;
  name?: string;
  type: 'click' | 'input' | 'select' | 'scroll' | 'navigate';
  timestamp: number;
  elementAnalysis?: SerializableElementAnalysis;
  value?: string;
  unifiedSelector?: UnifiedSelector;
  url?: string;
  navigationType?: 'link' | 'form' | 'direct' | 'reload' | 'typed';
}
\`\`\`

---

## 🔌 API 设计

### 存储层 API

\`\`\`typescript
async function saveRecordingToStorage(recording: RecordingData): Promise<string>;
async function getRecordingsFromStorage(): Promise<RecordingData[]>;
async function getRecordingById(id: string): Promise<RecordingData | null>;
async function deleteRecordingFromStorage(id: string): Promise<void>;
async function markRecordingAsImported(id: string): Promise<void>;
\`\`\`

### 转换层 API

\`\`\`typescript
function convertRecordingToTools(
  actions: SerializableRecordedAction[],
  options?: ConversionOptions
): ConversionResult;

function convertActionToTool(
  action: SerializableRecordedAction,
  index: number,
  options?: ConversionOptions
): AtomicTool | null;

function detectParameters(
  action: SerializableRecordedAction
): Record<string, { type: string; required: boolean }>;
\`\`\`

---

## 🔄 工作流

### 用户操作流程

1. 用户在 SidePanel 录制操作 → 停止录制
2. 点击"保存到 Dashboard"按钮 → 保存到 Chrome Storage
3. 打开 Dashboard → 检测新录制 → 显示导入对话框
4. 预览录制操作和转换结果 → 确认导入
5. 工具添加到工具库 → 标记录制为已导入

---

## ✅ 验收标准

- [ ] SidePanel 可以保存录制到 Storage
- [ ] Dashboard 检测并显示待导入的录制
- [ ] 录制操作正确转换为 AtomicTool
- [ ] 参数自动识别（输入值、锚点值）
- [ ] TypeScript 类型检查通过
- [ ] 无 ESLint 错误
