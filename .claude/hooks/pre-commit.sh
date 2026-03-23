#!/bin/bash
# Claude Code Hook: 提交前完整检查
# 在用户准备提交代码时运行

echo "🔍 [Claude Hook] 运行提交前检查..."

# 检查是否有 TypeScript 错误
echo "1️⃣ 运行 TypeScript 类型检查..."
if ! npm run typecheck 2>&1 | tail -5; then
  echo "❌ 类型检查失败"
  exit 1
fi

# 检查类型重复
echo "2️⃣ 检查类型重复定义..."
if ! npm run check:duplicates 2>&1; then
  echo "❌ 发现类型重复定义"
  exit 1
fi

# 检查导入路径
echo "3️⃣ 检查导入路径..."
if ! npm run check:imports 2>&1; then
  echo "❌ 导入路径检查失败"
  exit 1
fi

# 运行 lint
echo "4️⃣ 运行 ESLint..."
if ! npm run lint 2>&1 | tail -10; then
  echo "⚠️ Lint 检查发现问题，运行 npm run lint:fix 修复"
fi

# 运行测试（如果有测试）
if [ -d "packages/sdk/src/selector/__tests__" ]; then
  echo "5️⃣ 运行测试..."
  npm test 2>&1 | tail -15
fi

echo "✅ 所有检查通过！"
