# 工具编辑器 UI 组件复用规范

> **一句话描述**: 将 RecordingPanel 中的工具编辑 UI 提取为共享组件，供 Dashboard 复用

- **用户问题**: Dashboard 和 Sidepanel 各自实现类似的工具编辑 UI，代码重复
- **技术价值**: 统一 UI 组件，减少代码重复，确保一致性
- **业务影响**: 提高开发效率，降低维护成本

---

## 📄 元信息

| 字段 | 值 |
|------|------|
| 状态 | Implemented |
| 创建时间 | 2026-03-24 |
| 实际完成 | 2026-03-24 |
| 负责人 | - |
| 相关 Spec | [toolkit.md](./toolkit.md) |

---

## 🔗 关联资源

| 类型 | 路径 | 说明 |
|------|------|------|
| 实现文件 | `src/shared/components/tool-editor/NavigateConfigPanel.tsx` | 导航配置面板 |
| 实现文件 | `src/shared/components/tool-editor/SelectorEditorPanel.tsx` | 选择器编辑面板 |
| 实现文件 | `src/shared/components/tool-editor/index.ts` | 导出文件 |
| 已修改 | `src/sidepanel/components/RecordingPanel.tsx` | 使用共享组件 |
| 已修改 | `src/dashboard/components/toolkit/ToolDetailEditor.tsx` | 使用共享组件 |
| SDK 类型 | `packages/sdk/src/types/primitives.ts` | 添加 newTab 参数 |
| 录制类型 | `src/shared/selectorBuilder/types.ts` | 添加 newTab 到 RecordedAction |

---

## 🏗️ 技术设计

### 当前架构分析

```
当前状态 (代码重复):
┌─────────────────────────────────────────────────────────────────────────┐
│                              RecordingPanel                              │
│  ┌─────────────┐  ┌───────────────┐  ┌─────────────────────────────────┐│
│  │ ActionCard  │  │ SelectorEditor│  │ NavigateConfig UI               ││
│  │ (内联)      │  │ (内联)        │  │ (内联)                          ││
│  └─────────────┘  └───────────────┘  └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
                                    ❌ 无法被 Dashboard 复用

┌─────────────────────────────────────────────────────────────────────────┐
│                            ToolDetailEditor                             │
│  ┌─────────────┐  ┌───────────────┐  ┌─────────────────────────────────┐│
│  │ 基本信息    │  │ 选择器编辑    │  │ 参数编辑                         ││
│  │ (简单实现)  │  │ (简单实现)    │  │ (简单实现)                      ││
│  └─────────────┘  └───────────────┘  └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 目标架构

```
目标状态 (组件复用):
┌─────────────────────────────────────────────────────────────────────────┐
│                        shared/components/tool-editor/                    │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ NavigateConfigPanel.tsx  - 导航配置面板                            ││
│  │  ├─ URL 输入框                                                      ││
│  │  ├─ 新标签页 Toggle                                                ││
│  │  └─ 测试按钮 (当前页/新标签页)                                      ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │ SelectorEditorPanel.tsx  - 选择器编辑面板                          ││
│  │  ├─ Scope 配置                                                     ││
│  │  ├─ Anchor 配置                                                    ││
│  │  ├─ Target 配置                                                    ││
│  │  └─ 锚点候选选择                                                   ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │ ToolTestPanel.tsx  - 工具测试面板 (复用 QuickActionPanel)          ││
│  │  ├─ 高亮/点击/读取按钮                                              ││
│  │  ├─ 输入测试                                                        ││
│  │  └─ 结果显示                                                        ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
          ↕                              ↕
┌─────────────────────┐    ┌─────────────────────────────────────────────┐
│   RecordingPanel    │    │          ToolDetailEditor                    │
│  (使用共享组件)      │    │         (使用共享组件)                      │
└─────────────────────┘    └─────────────────────────────────────────────┘
```

---

## 📝 类型定义

### 工具编辑器上下文类型

```typescript
// src/shared/types/tool-editor.ts

/**
 * 工具编辑器上下文
 * 统一 RecordingPanel 和 Dashboard 的工具编辑数据
 */
export interface ToolEditorContext {
  /** 工具类型 */
  action: PrimitiveAction;

  /** URL (仅 NAVIGATE) */
  url?: string;

  /** 选择器配置 (非 NAVIGATE) */
  selector?: {
    scope?: string;
    anchor?: {
      selector: string;
      value: string;
      matchMode: 'contains' | 'exact' | 'startsWith' | 'endsWith';
    };
    target: string;
  };

  /** 输入值 (仅 INPUT) */
  inputValue?: string;

  /** 导航配置 (仅 NAVIGATE) */
  navigateConfig?: {
    newTab?: boolean;
    waitForLoad?: boolean;
  };
}

/**
 * 工具编辑器事件
 */
export interface ToolEditorEvents {
  /** URL 变更 */
  onUrlChange?: (url: string) => void;

  /** 选择器变更 */
  onSelectorChange?: (selector: ToolEditorContext['selector']) => void;

  /** 导航配置变更 */
  onNavigateConfigChange?: (config: ToolEditorContext['navigateConfig']) => void;

  /** 测试操作 */
  onTest?: (action: 'highlight' | 'click' | 'input' | 'extract', value?: string) => Promise<void>;

  /** 日志输出 */
  onLog?: (log: {
    timestamp: number;
    level: 'info' | 'error';
    message: string;
  }) => void;
}
```

---

## 🔌 组件 API 设计

### NavigateConfigPanel

```typescript
// src/shared/components/tool-editor/NavigateConfigPanel.tsx

export interface NavigateConfigPanelProps {
  /** 目标 URL */
  url: string;
  /** 是否在新标签页打开 */
  newTab: boolean;
  /** 是否等待页面加载 */
  waitForLoad?: boolean;

  /** 事件回调 */
  onUrlChange: (url: string) => void;
  onNewTabChange: (newTab: boolean) => void;
  onTestCurrentTab: () => Promise<void>;
  onTestNewTab: () => Promise<void>;

  /** UI 选项 */
  compact?: boolean;
}

/**
 * 导航配置面板
 *
 * 用途: 为 NAVIGATE 工具提供配置和测试 UI
 *
 * 特性:
 * - URL 输入和编辑
 * - 新标签页 Toggle 开关
 * - 测试按钮 (当前标签页 / 新标签页)
 * - 与 RecordingPanel 中的 UI 保持一致
 */
export function NavigateConfigPanel(props: NavigateConfigPanelProps): JSX.Element;
```

### SelectorEditorPanel

```typescript
// src/shared/components/tool-editor/SelectorEditorPanel.tsx

export interface SelectorEditorPanelProps {
  /** 选择器配置 */
  selector: {
    scope?: string;
    anchor?: {
      selector: string;
      value: string;
      matchMode: 'contains' | 'exact' | 'startsWith' | 'endsWith';
    };
    target: string;
  };

  /** 锚点候选 (从 ElementAnalysis 提取) */
  anchorCandidates?: Array<{
    selector: string;
    text?: string;
    attribute?: { value: string; name: string };
  }>;

  /** 事件回调 */
  onChange: (selector: SelectorEditorPanelProps['selector']) => void;
  onTest?: (action: 'highlight' | 'click' | 'extract', value?: string) => Promise<void>;
  onLog?: (log: {
    timestamp: number;
    level: 'info' | 'error';
    message: string;
  }) => void;

  /** UI 选项 */
  compact?: boolean;
  showTests?: boolean;
}

/**
 * 选择器编辑面板
 *
 * 用途: 为 CLICK/INPUT/EXTRACT_TEXT/WAIT_FOR 工具提供选择器编辑 UI
 *
 * 特性:
 * - Scope/Anchor/Target 配置
 * - 锚点候选选择
 * - 可选的测试面板
 */
export function SelectorEditorPanel(props: SelectorEditorPanelProps): JSX.Element;
```

---

## 🔄 工作流

### 组件提取流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 步骤 1: 从 RecordingPanel 提取 NavigateConfigPanel                      │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ 1.1 创建 src/shared/components/tool-editor/NavigateConfigPanel.tsx  ││
│ │ 1.2 将 RecordingPanel ActionCard 中 navigate 的展开 UI (768-862行)   ││
│ │     提取为独立组件                                                   ││
│ │ 1.3 修改 RecordingPanel 使用新组件                                   ││
│ └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 步骤 2: 从 RecordingPanel 提取 SelectorEditorPanel                      │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ 2.1 创建 src/shared/components/tool-editor/SelectorEditorPanel.tsx  ││
│ │ 2.2 将 RecordingPanel 中的 SelectorEditor (900-1161行) 提取          ││
│ │ 2.3 修改 RecordingPanel 使用新组件                                   ││
│ └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ 步骤 3: 在 Dashboard ToolDetailEditor 中使用共享组件                    │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ 3.1 检测 action 类型                                                ││
│ │ 3.2 NAVIGATE: 使用 NavigateConfigPanel                              ││
│ │ 3.3 其他: 使用 SelectorEditorPanel + QuickActionPanel               ││
│ └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### Dashboard ToolDetailEditor 集成

```typescript
// src/dashboard/components/toolkit/ToolDetailEditor.tsx

import { NavigateConfigPanel } from '@shared/components/tool-editor/NavigateConfigPanel';
import { SelectorEditorPanel } from '@shared/components/tool-editor/SelectorEditorPanel';
import { QuickActionPanel } from '@shared/components/QuickActionPanel'; // 已存在，移动位置

export function ToolDetailEditor({ toolkitId, tool }: ToolDetailEditorProps) {
  // ...

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {/* ... */}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 基本信息 Section */}
        {/* ... */}

        {/* 动态配置 Section - 根据工具类型显示不同内容 */}
        {action === 'NAVIGATE' ? (
          <NavigateConfigPanel
            url={getUrlFromTool(editingTool)}
            newTab={getNewTabFromTool(editingTool)}
            waitForLoad={getWaitForLoadFromTool(editingTool)}
            onUrlChange={(url) => handleNavigateParamChange('url', url)}
            onNewTabChange={(newTab) => handleNavigateParamChange('newTab', newTab)}
            onTestCurrentTab={handleTestCurrentTab}
            onTestNewTab={handleTestNewTab}
          />
        ) : (
          <SelectorEditorPanel
            selector={getSelectorFromTool(editingTool)}
            anchorCandidates={/* 从 tool 转换或留空 */}
            onChange={handleSelectorChange}
            onTest={handleToolTest}
            onLog={handleLog}
            compact={false}
            showTests={true}
          />
        )}

        {/* 参数 Section - 保持现有实现 */}
        {/* ... */}
      </div>
    </div>
  );
}
```

---

## ✅ 验收标准

### 功能验收
- [ ] `NavigateConfigPanel` 组件实现完整，包含 URL 输入、新标签页开关、测试按钮
- [ ] `SelectorEditorPanel` 组件实现完整，包含 Scope/Anchor/Target 配置
- [ ] Dashboard ToolDetailEditor 使用共享组件
- [ ] RecordingPanel 重构使用共享组件
- [ ] UI 样式与原 RecordingPanel 保持一致

### 质量验收
- [ ] 运行 `npm run typecheck` 无错误
- [ ] 运行 `npm run lint` 无警告
- [ ] 组件有完整的 TypeScript 类型定义
- [ ] 组件有 JSDoc 注释

### 文档验收
- [ ] 组件导出在 `@shared/components` 中
- [ ] 本 Spec 状态更新为 `Implemented`

---

## 🧪 测试策略

### 单元测试
```typescript
// src/shared/components/tool-editor/NavigateConfigPanel.test.tsx

describe('NavigateConfigPanel', () => {
  it('should render URL input', () => {
    // ...
  });

  it('should render new tab toggle', () => {
    // ...
  });

  it('should call onUrlChange when URL changes', () => {
    // ...
  });

  it('should call onTestCurrentTab when button clicked', () => {
    // ...
  });
});
```

### 集成测试
- 在 Dashboard 中测试 NAVIGATE 工具编辑
- 在 Dashboard 中测试 CLICK/INPUT 工具编辑
- 确认测试按钮功能正常

---

## 📋 TODO 清单

### 设计阶段
- [x] 分析现有 RecordingPanel 组件
- [x] 设计共享组件 API
- [x] 定义数据类型

### 实现阶段
- [x] 创建 `src/shared/components/tool-editor/` 目录
- [x] 实现 `NavigateConfigPanel.tsx`
- [x] 实现 `SelectorEditorPanel.tsx`
- [x] 实现 `Toggle.tsx` (内置在 NavigateConfigPanel 中)
- [x] 更新 `RecordingPanel.tsx` 使用共享组件
- [x] 更新 `ToolDetailEditor.tsx` 使用共享组件
- [x] 添加 `newTab` 参数到 SDK 类型

### 验收阶段
- [x] 运行类型检查
- [x] 构建 SDK
- [ ] 手动测试 UI 交互
- [x] 更新 Spec 状态

---

## 📚 决策记录

| 决策 | 选择方案 | 理由 |
|------|---------|------|
| 组件位置 | `src/shared/components/tool-editor/` | 跨 Sidepanel 和 Dashboard 共享 |
| 数据结构 | 复用现有接口，最小化改动 | 保持与 AtomicTool 和 RecordedAction 的兼容性 |
| newTab 参数 | 添加到 SDK NavigateParams 类型 | 支持设置新标签页/当前标签页导航 |

---

## 📅 变更历史

| 日期 | 时间 | 版本 | 变更说明 | 作者 |
|------|------|------|----------|------|
| 2026-03-24 | - | 0.1.0 | 初始版本 | - |
| 2026-03-24 | - | 1.0.0 | 实现完成 | - |
