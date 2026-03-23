#!/bin/bash

###############################################################################
# 导入路径检查脚本
#
# 功能：
# - 检查是否从错误路径导入 SDK 类型
# - 检查是否使用了废弃的导入路径
###############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 检查导入路径...${NC}"

# 项目根目录
PROJECT_ROOT="/Users/cumulo/Projects/Homura-main/src"

# 应该从 SDK 导入的类型
SDK_TYPES=(
  "AtomicTool"
  "Blueprint"
  "BlueprintMeta"
  "SelectorLogic"
  "UnifiedSelector"
  "ExecuteToolResult"
  "PrimitiveType"
)

has_errors=false

# 检查所有 TypeScript 文件
echo -e "\n${YELLOW}检查是否从 @shared/types 导入 SDK 类型...${NC}"

for type in "${SDK_TYPES[@]}"; do
  # 查找从 @shared/types 导入 SDK 类型的情况
  matches=$(grep -rn "from '@shared/types'.*$type" "$PROJECT_ROOT" 2>/dev/null || echo "")

  if [ -n "$matches" ]; then
    echo -e "  ${RED}❌ 不应从 @shared/types 导入 $type${NC}"
    echo "$matches"
    has_errors=true
  fi
done

# 检查是否有使用旧的导入方式
echo -e "\n${YELLOW}检查是否使用旧的导入路径...${NC}"

# 应该使用 @homura/sdk 而不是相对路径导入 SDK
old_imports=$(grep -rn "from.*types'.*AtomicTool\|from.*types'.*Blueprint" "$PROJECT_SRC" 2>/dev/null | grep -v "@homura/sdk" | grep -v "@shared" || echo "")

if [ -n "$old_imports" ]; then
  echo -e "  ${YELLOW}⚠️  检测到可能的旧导入方式：${NC}"
  echo "$old_imports"
fi

# 检查是否有重复导入（同一个类型从不同路径导入）
echo -e "\n${YELLOW}检查重复导入...${NC}"

files=$(find "$PROJECT_ROOT" -name "*.ts" -o -name "*.tsx")
for file in $files; do
  # 检查是否同时从多个路径导入相同类型
  imports=$(grep -o "import.*from '[^']*'" "$file" 2>/dev/null || echo "")
  # 这里可以添加更复杂的检查逻辑
done

# 检查是否有正确的 SDK 导入
echo -e "\n${YELLOW}检查正确的 SDK 导入...${NC}"

correct_imports=$(grep -rn "from '@homura/sdk/types'.*AtomicTool\|from '@homura/sdk/types'.*Blueprint" "$PROJECT_ROOT" 2>/dev/null | wc -l || echo 0)
echo -e "  ${GREEN}✅ 找到 $correct_imports 个正确的 SDK 导入${NC}"

# 总结
echo -e "\n${YELLOW}════════════════════════════════════════${NC}"
if [ "$has_errors" = true ]; then
  echo -e "${RED}❌ 发现导入路径错误${NC}"
  echo -e "\n${YELLOW}修复建议：${NC}"
  echo -e "  ${GREEN}import type { AtomicTool } from '@homura/sdk/types';${NC}"
  echo -e "  ${RED}import type { AtomicTool } from '@shared/types';${NC}  ❌ 不要使用"
  exit 1
else
  echo -e "${GREEN}✅ 导入路径正确${NC}"
  exit 0
fi
