# 技术规范 (Technical Specifications)

> 本目录包含 Homura 项目的所有技术规范文档

## 📁 规范文档目录

### 类型规范
- [类型系统规范](./type-system.md) - 类型定义、命名约定、导入规则
- [数据结构规范](./data-structures.md) - 核心数据结构定义

### API 规范
- [SDK API 规范](./sdk-api.md) - SDK 模块 API 定义
- [扩展 API 规范](./extension-api.md) - Chrome 扩展消息 API
- [Dashboard API 规范](./dashboard-api.md) - Dashboard 组件 API

### 开发规范
- [代码风格规范](./code-style.md) - 代码风格、命名约定
- [测试规范](./testing.md) - 测试策略、覆盖率要求
- [错误处理规范](./error-handling.md) - 错误处理、日志记录

## 🎯 规范驱动开发流程

1. **编写规范** → 在 `specs/` 中创建或更新规范文档
2. **代码审查** → PR 时检查是否符合规范
3. **自动化检查** → 使用 ESLint、TypeScript 规则强制执行
4. **文档同步** → 代码变更时同步更新规范

## 📝 规范文档模板

```markdown
# [规范标题]

> 一句话描述规范目的

## 背景与动机
为什么需要这个规范

## 核心约定
- 约定 1
- 约定 2

## 示例代码
\`\`\`typescript
// ✅ 正确示例
// ❌ 错误示例
\`\`\`

## 检查清单
- [ ] 检查项 1
- [ ] 检查项 2

## 参考资料
- 链接到相关文档
```

---

*保持规范清晰、简洁、可执行*
