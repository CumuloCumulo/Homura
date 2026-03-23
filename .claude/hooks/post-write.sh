#!/bin/bash
# Claude Code Hook: 自动运行代码检查
# 在每次写文件后自动触发

# 获取修改的文件
CHANGED_FILE="$1"

# 跳过非 TypeScript 文件
if [[ ! "$CHANGED_FILE" =~ \.(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

# 跳过测试文件和类型声明文件
if [[ "$CHANGED_FILE" =~ (__tests__|\.d\.ts|\.spec\.) ]]; then
  exit 0
fi

# 跳过 node_modules 和 dist
if [[ "$CHANGED_FILE" =~ (node_modules|dist) ]]; then
  exit 0
fi

echo "🔍 [Claude Hook] 检查文件: $CHANGED_FILE"

# 根据修改的文件类型运行不同的检查
if [[ "$CHANGED_FILE" =~ packages/sdk/ ]]; then
  # SDK 修改：运行类型检查
  echo "📦 SDK 文件修改，运行类型检查..."
  npm run typecheck -- --noEmit 2>&1 | head -20

  # 如果修改了类型文件，检查重复定义
  if [[ "$CHANGED_FILE" =~ types/.*\.ts$ ]]; then
    echo "🔍 检查类型重复定义..."
    npm run check:duplicates 2>&1 | head -10
  fi
elif [[ "$CHANGED_FILE" =~ src/ ]]; then
  # 扩展修改：运行快速类型检查
  echo "🔌 Extension 文件修改，运行快速检查..."
  npx tsc --noEmit --pretty false 2>&1 | grep -E "(error TS|Found [0-9]+ error)" | head -10
fi

echo "✅ 检查完成"
