#!/bin/bash

###############################################################################
# Homura 文件生成脚本
#
# 用法:
#   npm run new:function [path/]FunctionName
#   npm run new:test [path/]FunctionName
#   npm run new:component [path/]ComponentName
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FILE_TYPE="$1"
FILE_PATH="$2"

if [ -z "$FILE_TYPE" ] || [ -z "$FILE_PATH" ]; then
  echo "用法: npm run new:$FILE_TYPE <path>/<name>"
  exit 1
fi

FULL_PATH="$PROJECT_ROOT/src/$FILE_PATH"

# 确保目录存在
mkdir -p "$(dirname "$FULL_PATH")"

case "$FILE_TYPE" in
  function)
    if [[ ! "$FILE_PATH" =~ \.ts$ ]]; then
      FULL_PATH="${FULL_PATH}.ts"
    fi

    NAME=$(basename "$FILE_PATH" .ts)
    cat > "$FULL_PATH" << 'EOF'
/**
 * =============================================================================
 * [FUNCTION_NAME]
 * =============================================================================
 *
 * [一句话描述功能]
 */

import type { [Type] } from '@homura/sdk/types';

/**
 * [函数描述]
 *
 * @param param1 - [参数说明]
 * @returns [返回值说明]
 * @throws [可能抛出的错误]
 *
 * @example
 * ```typescript
 * const result = functionName(arg1);
 * ```
 */
export function FUNCTION_NAME(
  param1: ParamType
): ReturnType {
  try {
    // 实现代码

    return result;
  } catch (error) {
    throw new Error(
      `Failed to 操作: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error }
    );
  }
}
EOF
    # 替换占位符
    sed -i '' "s/FUNCTION_NAME/$NAME/g" "$FULL_PATH"
    ;;

  test)
    if [[ ! "$FILE_PATH" =~ \.test\.ts$ ]]; then
      FULL_PATH="${FULL_PATH}.test.ts"
    fi

    NAME=$(basename "$FILE_PATH" .test.ts)
    cat > "$FULL_PATH" << 'EOF'
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FUNCTION_NAME } from '../FUNCTION_PATH';

describe('FUNCTION_NAME', () => {
  beforeEach(() => {
    // 每个测试前的设置
  });

  afterEach(() => {
    // 每个测试后的清理
  });

  it('should 预期行为', () => {
    // Arrange
    const input = testData;

    // Act
    const result = FUNCTION_NAME(input);

    // Assert
    expect(result).toBeDefined();
    expect(result).toEqual(expectedResult);
  });

  it('should throw error when 条件', () => {
    // Arrange
    const input = badInput;

    // Act & Assert
    expect(() => FUNCTION_NAME(input)).toThrow();
  });
});
EOF
    sed -i '' "s/FUNCTION_NAME/$NAME/g" "$FULL_PATH"
    ;;

  component)
    if [[ ! "$FILE_PATH" =~ \.tsx$ ]]; then
      FULL_PATH="${FULL_PATH}.tsx"
    fi

    NAME=$(basename "$FILE_PATH" .tsx)
    cat > "$FULL_PATH" << 'EOF'
/**
 * =============================================================================
 * COMPONENT_NAME
 * =============================================================================
 *
 * [组件描述]
 */

import { useState } from 'react';

interface COMPONENT_NAMEProps {
  /** 属性说明 */
  propName: PropType;
  /** 可选属性说明 */
  optionalProp?: string;
  /** 回调函数说明 */
  onCallback?: (data: DataType) => void;
}

/**
 * [组件描述]
 *
 * @param props - 组件属性
 * @returns React 组件
 *
 * @example
 * ```tsx
 * <COMPONENT_NAME propName="value" onCallback={(data) => console.log(data)} />
 * ```
 */
export function COMPONENT_NAME({
  propName,
  optionalProp,
  onCallback,
}: COMPONENT_NAMEProps) {
  const [state, setState] = useState(defaultValue);

  const handleAction = () => {
    // 处理逻辑
    onCallback?.(result);
  };

  return (
    <div className="container-class">
      {/* 组件 JSX */}
    </div>
  );
}
EOF
    sed -i '' "s/COMPONENT_NAME/$NAME/g" "$FULL_PATH"
    ;;

  *)
    echo "未知类型: $FILE_TYPE"
    echo "支持的类型: function, test, component"
    exit 1
    ;;
esac

echo -e "${GREEN}✅ 已创建: $FULL_PATH${NC}"
echo -e "${YELLOW}📝 请编辑文件替换占位符${NC}"
