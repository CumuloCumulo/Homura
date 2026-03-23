#!/bin/bash

###############################################################################
# 快速检查脚本 - Vibe Coding 友好
#
# 用于在开发过程中快速验证代码质量
# 用法: npm run quick-check
###############################################################################

set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Homura 快速代码检查${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 解析参数
SKIP_TYPECHECK=false
SKIP_LINT=false
FAST_MODE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-typecheck)
      SKIP_TYPECHECK=true
      shift
      ;;
    --skip-lint)
      SKIP_LINT=true
      shift
      ;;
    --fast)
      FAST_MODE=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

ERRORS_FOUND=false

# 1. TypeScript 类型检查
if [ "$SKIP_TYPECHECK" = false ]; then
  echo -e "\n${YELLOW}1️⃣  TypeScript 类型检查...${NC}"
  if npm run typecheck --silent 2>&1; then
    echo -e "${GREEN}✅ 类型检查通过${NC}"
  else
    echo -e "${RED}❌ 类型检查失败${NC}"
    ERRORS_FOUND=true
  fi
fi

# 2. 类型冲突检查
echo -e "\n${YELLOW}2️⃣  类型冲突检查...${NC}"
if bash scripts/check-type-conflicts.sh > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 无类型冲突${NC}"
else
  echo -e "${RED}❌ 发现类型冲突${NC}"
  bash scripts/check-type-conflicts.sh
  ERRORS_FOUND=true
fi

# 3. 导入路径检查
echo -e "\n${YELLOW}3️⃣  导入路径检查...${NC}"
if bash scripts/check-import-paths.sh > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 导入路径正确${NC}"
else
  echo -e "${RED}❌ 发现错误导入${NC}"
  bash scripts/check-import-paths.sh
  ERRORS_FOUND=true
fi

# 4. ESLint 检查
if [ "$SKIP_LINT" = false ] && [ "$FAST_MODE" = false ]; then
  echo -e "\n${YELLOW}4️⃣  ESLint 检查...${NC}"
  if npm run lint --silent 2>&1; then
    echo -e "${GREEN}✅ ESLint 通过${NC}"
  else
    echo -e "${YELLOW}⚠️  ESLint 发现问题 (运行 npm run lint:fix 修复)${NC}"
  fi
fi

# 总结
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$ERRORS_FOUND" = true ]; then
  echo -e "${RED}❌ 发现需要修复的问题${NC}"
  exit 1
else
  echo -e "${GREEN}✅ 所有检查通过！${NC}"
  exit 0
fi
