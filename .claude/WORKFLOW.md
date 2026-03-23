# Homura 开发流程指南

本文档描述了如何在日常开发中有效使用 Homura 的质量保证设施。

## 🎯 核心原则

> **质量左移**：在编码阶段发现问题，而不是在 commit 时

## 📋 开发 Checklist

### 开始新功能时

- [ ] **1. 阅读相关规范**
  - `docs/DEVELOPMENT.md` - 开发规范
  - `docs/sdk-architecture.md` - SDK 架构

- [ ] **2. 确定类型归属**
  - 是可复用逻辑？→ 放入 `packages/sdk/src/types/`
  - 是扩展特定？→ 放入 `src/shared/types/`

- [ ] **3. 使用代码模板**
  - 在 VS Code 中输入 `hmf` / `hmt` / `hmc` 触发模板
  - 不要从 `templates/` 手动复制

### 编写代码时

- [ ] **1. 导入规则**
  ```typescript
  // ✅ 正确
  import { buildMinimalSelector } from '@homura/sdk/selector';
  import type { SelectorLogic } from '@homura/sdk/types';
  import type { ElementAnalysis } from '@shared/selectorBuilder/types';

  // ❌ 错误
  import { buildMinimalSelector } from './analyzer';
  ```

- [ ] **2. JSDoc 注释**
  - 所有导出函数/组件必须有 JSDoc
  - 包含 `@param`、`@returns`、`@example`

- [ ] **3. 错误处理**
  ```typescript
  try {
    // 代码
  } catch (error) {
    throw new Error(
      `Failed to 操作: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error }
    );
  }
  ```

### 提交代码前

- [ ] **1. 快速检查**（VS Code 任务）
  - 按 `Cmd+Shift+P` → "Tasks: Run Task"
  - 选择 "🔍 全部检查"

- [ ] **2. Lint 修复**
  ```bash
  npm run lint:fix
  ```

- [ ] **3. 测试**
  ```bash
  npm test           # 运行测试
  npm run test:ui    # UI 模式
  npm run test:coverage  # 覆盖率
  ```

- [ ] **4. Commit**
  - Husky 会自动运行 pre-commit 检查

## 🎹 VS Code 快捷键

| 操作 | 命令 |
|------|------|
| 查看所有任务 | `Cmd+Shift+P` → "Tasks: Run Task" |
| 运行类型检查 | `Cmd+Shift+P` → "Run Task" → "🔍 类型检查" |
| 触发函数模板 | 输入 `hmf` + `Tab` |
| 触发测试模板 | 输入 `hmt` + `Tab` |
| 触发组件模板 | 输入 `hmc` + `Tab` |
| 导入 SDK 类型 | 输入 `him` + `Tab` |

## 🔄 完整工作流

```
┌─────────────────────────────────────────────────────────────────┐
│                         开发新功能                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. 使用 Snippet 创建文件 (hmf/hmt/hmc)                          │
│     - 自动带 JSDoc                                               │
│     - 自动带错误处理                                             │
│     - 遵循代码风格                                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. 编写代码 + 测试 (TDD 推荐)                                   │
│     - 先写测试 (hmt)                                            │
│     - 再写实现 (hmf)                                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. 开发中检查 (随时运行)                                        │
│     - VS Code 任务 → "🔍 类型检查"                               │
│     - VS Code 任务 → "🔍 导入路径检查"                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. 提交前检查 (一次运行)                                        │
│     - npm run lint:fix                                         │
│     - npm run test                                             │
│     - VS Code 任务 → "🔍 全部检查"                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Git Commit                                                   │
│     - Husky Pre-commit 自动验证                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🚨 常见错误与修复

### 错误 1: 类型重复定义
```
❌ 错误: Duplicate identifier 'SelectorLogic'
✅ 修复: 删除扩展中的定义，从 SDK 导入
```

### 错误 2: 导入路径错误
```
❌ 错误: import type { AtomicTool } from '@shared/types'
✅ 修复: import type { AtomicTool } from '@homura/sdk/types'
```

### 错误 3: 缺少 JSDoc
```
❌ 错误: ESLint warning
✅ 修复: 使用 hmf 模板自动生成
```

## 📚 相关文档

- `docs/DEVELOPMENT.md` - 详细开发规范
- `docs/sdk-architecture.md` - SDK 架构
- `.vscode/homura.code-snippets` - 代码片段定义
- `.vscode/tasks.json` - 任务定义

## 💡 Vibe Coding 技巧

1. **让 Snippet 成为本能**
   - 记住前缀：`hmf` (function), `hmt` (test), `hmc` (component)
   - 直接输入触发，不需要打开 templates 目录

2. **定期运行检查**
   - 每完成一个函数 → 运行类型检查
   - 每完成一个模块 → 运行全部检查

3. **信任 Pre-commit Hook**
   - 它会阻止低质量代码进入仓库
   - 如果检查失败，认真阅读错误信息

4. **测试优先**
   - 使用 `hmt` 先写测试
   - 测试会驱动更好的代码设计
