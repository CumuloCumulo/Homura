#!/bin/bash

###############################################################################
# 类型冲突检查脚本
#
# 功能：
# - 检查重复的 interface 定义
# - 检查重复的 type 定义
# - 输出冲突位置
###############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 检查类型冲突...${NC}"

# 要检查的类型列表
TYPES=(
  "SelectorLogic"
  "UnifiedSelector"
  "SelectorScope"
  "SelectorAnchor"
  "SelectorTarget"
  "AtomicTool"
  "Blueprint"
  "ValidationResult"
  "BlueprintMeta"
  "AgentConfig"
)

# 检查 SDK 源码目录
SDK_SRC="/Users/cumulo/Projects/Homura-main/packages/sdk/src"
EXT_SRC="/Users/cumulo/Projects/Homura-main/src"

has_conflicts=false

# 检查每个类型
for type in "${TYPES[@]}"; do
  echo -e "\n检查类型: ${YELLOW}$type${NC}"

  # 在 SDK 中查找 - 使用更精确的匹配
  # 只匹配 "export interface TypeName" 或 "export type TypeName"（避免匹配 TypeNameMeta 等）
  sdk_count=$(grep -r "^export interface $type\[" "$SDK_SRC" 2>/dev/null | wc -l || echo 0)
  sdk_count=$((sdk_count + $(grep -r "^export interface $type " "$SDK_SRC" 2>/dev/null | wc -l || echo 0)))
  sdk_count=$((sdk_count + $(grep -r "^export type $type " "$SDK_SRC" 2>/dev/null | wc -l || echo 0)))
  sdk_count=$((sdk_count + $(grep -r "^export type $type\[" "$SDK_SRC" 2>/dev/null | wc -l || echo 0)))

  if [ "$sdk_count" -gt 1 ]; then
    echo -e "  ${RED}❌ SDK 中发现 $sdk_count 个 $type 定义${NC}"
    grep -rn "^export interface $type\|^export type $type" "$SDK_SRC" 2>/dev/null || true
    has_conflicts=true
  elif [ "$sdk_count" -eq 1 ]; then
    echo -e "  ${GREEN}✅ SDK 中有 1 个 $type 定义（正确）${NC}"
  else
    echo -e "  ${YELLOW}⚠️  SDK 中未找到 $type 定义${NC}"
  fi

  # 在扩展源码中查找（仅检查特定的 SDK 类型）
  if [[ "$type" =~ ^(SelectorLogic|UnifiedSelector|AtomicTool|Blueprint)$ ]]; then
    ext_count=$(grep -r "^export interface $type\[" "$EXT_SRC" 2>/dev/null | wc -l || echo 0)
    ext_count=$((ext_count + $(grep -r "^export interface $type " "$EXT_SRC" 2>/dev/null | wc -l || echo 0)))
    ext_count=$((ext_count + $(grep -r "^export type $type " "$EXT_SRC" 2>/dev/null | wc -l || echo 0)))

    if [ "$ext_count" -gt 0 ]; then
      echo -e "  ${RED}❌ 扩展中不应定义 SDK 类型 $type${NC}"
      grep -rn "^export interface $type\|^export type $type" "$EXT_SRC" 2>/dev/null || true
      has_conflicts=true
    fi
  fi
done

# 检查常见的冲突模式
echo -e "\n${YELLOW}检查常见冲突模式...${NC}"

# 检查 ValidationResult（应该只在一个地方定义）
validation_results=$(grep -r "export.*interface ValidationResult\|export.*type ValidationResult" "$SDK_SRC" "$EXT_SRC" 2>/dev/null | wc -l || echo 0)
if [ "$validation_results" -gt 1 ]; then
  echo -e "  ${RED}❌ 发现多个 ValidationResult 定义${NC}"
  grep -rn "export.*interface ValidationResult\|export.*type ValidationResult" "$SDK_SRC" "$EXT_SRC" 2>/dev/null || true
  has_conflicts=true
fi

# 检查是否有重复导出
echo -e "\n${YELLOW}检查重复导出...${NC}"
duplicate_exports=$(grep -r "export.*from.*selector" "$SDK_SRC/types" 2>/dev/null | grep "SelectorLogic" | wc -l || echo 0)
if [ "$duplicate_exports" -gt 1 ]; then
  echo -e "  ${YELLOW}⚠️  可能存在重复的 SelectorLogic 导出${NC}"
fi

# 总结
echo -e "\n${YELLOW}════════════════════════════════════════${NC}"
if [ "$has_conflicts" = true ]; then
  echo -e "${RED}❌ 发现类型冲突，请修复后重试${NC}"
  exit 1
else
  echo -e "${GREEN}✅ 无类型冲突${NC}"
  exit 0
fi
