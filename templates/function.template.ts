/**
 * =============================================================================
 * [功能名称]
 * =============================================================================
 *
 * [一句话描述功能]
 *
 * @module [模块名]
 */

import type { [需要导入的类型] } from '[路径]';

/**
 * [函数描述]
 *
 * @param param1 - [参数说明]
 * @param param2 - [参数说明]
 * @returns [返回值说明]
 * @throws [可能抛出的错误]
 *
 * @example
 * ```typescript
 * const result = functionName(arg1, arg2);
 * ```
 */
export function functionName(
  param1: Param1Type,
  param2: Param2Type
): ReturnType {
  try {
    // 实现代码

    return result;
  } catch (error) {
    throw new Error(
      `Failed to [操作]: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error }
    );
  }
}
