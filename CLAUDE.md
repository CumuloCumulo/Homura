# Homura 项目 - Claude Code 开发指南

> 📋 本文件定义 Claude Code 在 Homura 项目中的行为规范

---

## 🎯 核心原则

### Spec-Driven Development
在编写代码前，必须：
1. 阅读 `docs/DEVELOPMENT.md` 确认开发规范
2. 检查 `docs/specs/` 是否有相关规范文档
3. 确认类型定义位置（SDK vs @shared）
4. 使用代码模板（hmf/hmt/hmc）

### 质量左移
- 开发中随时运行检查，不要等到 commit
- 信任 Git Hooks，它们会阻止低质量代码
- 测试优先（TDD），使用 `hmt` 模板

---

## 📁 关键文档（优先阅读）

| 文档 | 何时阅读 | 内容 |
|------|----------|------|
| `docs/DEVELOPMENT.md` | 🚨 开发任何功能前 | 完整开发规范、API 设计、类型系统 |
| `docs/sdk-architecture.md` | 📦 修改 SDK 时 | SDK 模块架构、导入规则 |
| `docs/naming-convention.md` | 📝 命名时 | 统一命名约定 |
| `.claude/rules.md` | ⚠️ 编写代码时 | 强制编码规则 |

---

## 🔴 强制规则（不得违反）

### SDK 导入规则
```typescript
// ✅ 正确
import { analyzeElement } from '@homura/sdk/selector';
import type { AtomicTool } from '@homura/sdk/types';
import { sendMessageToContent } from '@shared/utils';

// ❌ 错误
import { analyzeElement } from './selector';
import type { AtomicTool } from '@shared/types';  // SDK 类型不应从 @shared 导入
```

### 类型定义规则
1. **SDK 通用类型** → `packages/sdk/src/types/`
2. **扩展特定类型** → `src/shared/types.ts`
3. **局部类型** → 文件内部 `type` 定义

### 函数签名规则
参数顺序：**必需 → 可选 → 上下文**

```typescript
// ✅ 正确
async function executeTool(
  tool: AtomicTool,                    // 必需
  params: Record<string, unknown>,     // 必需
  context?: ExecutionContext           // 可选上下文
): Promise<ExecuteToolResult>
```

---

## 🟢 自动化检查触发规则

AI 在以下情况**必须自动运行**检查：

| 触发条件 | 运行命令 | 说明 |
|----------|----------|------|
| 修改类型定义 | `npm run check:duplicates` | 检查类型冲突 |
| 修改导入语句 | `npm run check:imports` | 验证导入路径 |
| 完成功能实现 | `npm run typecheck` | TypeScript 类型检查 |
| 用户说"完成"/"提交" | `npm run check:all` | 全部检查 |
| 修改 SDK | `npm run build:sdk` | 重新编译 SDK |

---

## 🛠️ 开发工作流

### 新功能开发
```
1. 📋 阅读 docs/DEVELOPMENT.md
2. 🔤 定义类型（检查冲突）
3. 💻 使用代码模板（hmf/hmt/hmc）实现
4. ✅ 运行 npm run typecheck
5. 🧪 编写测试
6. 📚 更新文档（如需要）
```

### 提交前检查
```
1. npm run lint:fix
2. npm run test
3. npm run check:all
4. git commit（Husky 自动验证）
```

---

## 📦 项目架构

```
Homura/
├── packages/sdk/           # @homura/sdk - 可复用核心引擎
│   ├── src/types/         # SDK 类型定义
│   ├── src/selector/      # 选择器引擎
│   ├── src/primitives/    # 原子操作
│   ├── src/executor/      # 工具执行
│   └── src/utils/         # 工具函数
│
└── src/                   # Chrome Extension
    ├── background/        # Service Worker（智能层）
    ├── content/          # Content Script（执行层）
    ├── sidepanel/        # 录制器 UI
    ├── dashboard/        # 管理中心
    ├── services/ai/      # AI 服务
    └── shared/           # 扩展特定类型（不要放 SDK 通用代码）
```

---

## 🎨 代码风格

### 命名规范
- **Blueprint**（不是 Mission/Workflow）
- **Skill** / **AtomicTool**（不是 Tool/Action）
- **Rule Book**（不是 Script）
- **AI Agent**（不是 Worker/Executor）

### JSDoc 注释
所有导出函数/组件必须有 JSDoc：
```typescript
/**
 * 执行工具
 * @param tool - 要执行的工具
 * @param params - 工具参数
 * @param context - 执行上下文（可选）
 * @returns 执行结果
 * @example
 * const result = await executeTool(tool, { username: 'alice' });
 */
```

### 错误处理
```typescript
try {
  // ...
} catch (error) {
  throw new Error(
    `Failed to ...: ${error instanceof Error ? error.message : 'Unknown'}`,
    { cause: error }
  );
}
```

---

## 🔍 常见错误预防

| 错误 | 预防方法 |
|------|----------|
| 类型重复定义 | 使用 `npm run check:duplicates` 检查 |
| 导入路径错误 | 使用 `npm run check:imports` 检查 |
| 缺少 JSDoc | 使用代码模板（hmf/hmt/hmc） |
| 吞掉错误 | 遵循错误处理规范 |

---

## 🚀 快捷命令

```bash
# 开发
npm run dev              # 开发模式
npm run build:sdk        # 构建 SDK
npm run build:extension  # 构建扩展

# 检查
npm run typecheck        # 类型检查
npm run lint:fix         # 修复 lint
npm run check:duplicates # 类型冲突检查
npm run check:imports    # 导入路径检查
npm run check:all        # 全部检查

# 测试
npm test                 # 运行测试
npm run test:ui          # UI 模式
npm run test:coverage    # 覆盖率
```

---

## 💡 Vibe Coding 最佳实践

1. **信任文档** - 开发前先读 DEVELOPMENT.md
2. **使用模板** - 记住 hmf（函数）/ hmt（测试）/ hmc（组件）
3. **频繁检查** - 每完成一个函数就 typecheck
4. **测试优先** - 使用 hmt 先写测试，驱动更好的设计
5. **信任 Hooks** - Git Hooks 会保护代码质量

---

## 📚 更多信息

- 📖 [完整开发规范](docs/DEVELOPMENT.md)
- 🏗️ [SDK 架构](docs/sdk-architecture.md)
- 📝 [命名规范](docs/naming-convention.md)
- 🔧 [开发工作流](.claude/WORKFLOW.md)
- ⚠️ [强制规则](.claude/rules.md)
