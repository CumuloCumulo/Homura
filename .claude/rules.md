# Homura 项目级开发规范

> 本文件定义 AI 在 vibe coding 中必须遵循的规则

---

## 🔴 强制规则（不得违反）

### R1: SDK 导入规则

**规则**: SDK 功能必须从 `@homura/sdk` 导入，扩展特定功能从 `@shared/*` 导入

```typescript
// ✅ 正确
import { analyzeElement } from '@homura/sdk/selector';
import type { AtomicTool } from '@homura/sdk/types';
import { sendMessageToContent } from '@shared/utils';

// ❌ 错误
import { analyzeElement } from './selector';
import type { AtomicTool } from '@shared/types';
```

### R2: 类型定义位置

**规则**: 新类型定义前，必须确认是否已存在

- SDK 通用类型 → `packages/sdk/src/types/`
- 扩展特定类型 → `src/shared/types.ts`
- 局部类型 → 文件内部 `type` 定义

### R3: 函数签名规范

**规则**: 参数顺序：必需 → 可选 → 上下文

```typescript
// ✅ 正确
async function executeTool(
  tool: AtomicTool,                    // 必需
  params: Record<string, unknown>,     // 必需
  context?: ExecutionContext           // 可选上下文
): Promise<ExecuteToolResult>

// ❌ 错误：上下文在前
async function executeTool(
  context?: ExecutionContext,
  tool: AtomicTool,
  params: Record<string, unknown>
)
```

### R4: 错误处理规范

**规则**: 不得吞掉错误，必须使用 Error 对象

```typescript
// ✅ 正确
try {
  // ...
} catch (error) {
  throw new Error(`Failed to ...: ${error instanceof Error ? error.message : 'Unknown'}`, { cause: error });
}

// ❌ 错误
catch (e) { console.error(e); return null; }
```

### R5: 命名规范

- **Blueprint**（不是 Mission/Workflow）
- **Skill** / **AtomicTool**（不是 Tool/Action）
- **Rule Book**（不是 Script）
- **AI Agent**（不是 Worker/Executor）

---

## 🟡 推荐实践（应遵循）

### P1: Spec-Driven Development

```
1. 📋 先读 docs/DEVELOPMENT.md 确认规范
2. 🔤 定义类型（检查冲突）
3. 💻 实现代码（加 JSDoc）
4. ✅ 运行 npm run check:all
```

### P2: 提交前检查

在建议提交代码前，应自动运行：
```bash
npm run check:all      # 全部检查
npm run lint:fix       # 修复 lint 问题
npm test               # 运行测试
```

### P3: 修改 SDK 后

修改 `packages/sdk/` 后，必须：
```bash
npm run build:sdk      # 重新编译 SDK
```

---

## 🟢 自动化检查

AI 在以下情况应主动运行检查：

| 触发条件 | 运行命令 |
|----------|----------|
| 修改类型定义 | `npm run check:duplicates` |
| 修改导入语句 | `npm run check:imports` |
| 完成功能实现 | `npm run typecheck` |
| 用户说"完成"或提交 | `npm run check:all` |

---

## 📁 关键文件参考

| 文件 | 用途 |
|------|------|
| `docs/DEVELOPMENT.md` | 完整开发规范 |
| `docs/sdk-architecture.md` | SDK 架构 |
| `docs/naming-convention.md` | 命名规范 |
| `.claude/WORKFLOW.md` | 开发工作流 |
