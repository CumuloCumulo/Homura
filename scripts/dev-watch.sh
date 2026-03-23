#!/bin/bash

###############################################################################
# 开发监听模式 - Vibe Coding 辅助
#
# 自动监听文件变化并运行检查
# 用法: npm run dev:watch
###############################################################################

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Homura Dev Watch Mode${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}监听文件变化... (Ctrl+C 退出)${NC}\n"

# 检查是否安装了 chokidar-cli
if ! command -v chokidar &> /dev/null; then
  echo -e "${YELLOW}⚠️  需要安装 chokidar-cli${NC}"
  echo -e "运行: ${GREEN}npm install -g chokidar-cli${NC}"
  echo -e "\n使用替代方案: ${BLUE}find + inotifywait${NC}\n"
  USE_FALLBACK=true
else
  USE_FALLBACK=false
fi

run_checks() {
  local file="$1"

  # 只检查 TypeScript 文件
  if [[ ! "$file" =~ \.(ts|tsx)$ ]]; then
    return
  fi

  echo -e "\n${YELLOW}[$(date '+%H:%M:%S')] 变化: $file${NC}"

  # 快速类型检查
  if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    echo -e "${RED}❌ 类型检查失败${NC}"
  else
    echo -e "${GREEN}✅ 类型检查通过${NC}"
  fi
}

export -f run_checks
export GREEN RED YELLOW BLUE NC

if [ "$USE_FALLBACK" = false ]; then
  # 使用 chokidar（推荐）
  chokidar "src/**/*.ts" "src/**/*.tsx" "packages/sdk/src/**/*.ts" \
    --silent \
    --command 'run_checks "$0"'
else
  # 使用 macOS fswatch 或 Linux inotifywait
  if command -v fswatch &> /dev/null; then
    fswatch -o -e ".*" -i "\\.ts$" src/ packages/sdk/src/ | \
    while read -r; do
      echo -e "\n${YELLOW}[$(date '+%H:%M:%S')] 检测到变化${NC}"
      if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
        echo -e "${RED}❌ 类型检查失败${NC}"
      else
        echo -e "${GREEN}✅ 类型检查通过${NC}"
      fi
    done
  else
    echo -e "${RED}❌ 需要安装文件监听工具${NC}"
    echo -e "macOS: ${GREEN}brew install fswatch${NC}"
    echo -e "或使用: ${GREEN}npm install -g chokidar-cli${NC}"
    exit 1
  fi
fi
