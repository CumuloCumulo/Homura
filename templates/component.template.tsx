/**
 * =============================================================================
 * [组件名称]
 * =============================================================================
 *
 * [组件描述]
 */

import { useState } from 'react';
import type { [Props类型] } from './types';

interface [ComponentName]Props {
  /** [属性说明] */
  propName: PropType;
  /** [可选属性说明] */
  optionalProp?: string;
  /** [回调函数说明] */
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
 * <[ComponentName] propName="value" onCallback={(data) => console.log(data)} />
 * ```
 */
export function [ComponentName]({
  propName,
  optionalProp,
  onCallback,
}: [ComponentName]Props) {
  const [state, setState] = useState(defaultValue);

  const handleAction = () => {
    // 处理逻辑
    onCallback?.(result);
  };

  return (
    <div className="[container-class]">
      {/* 组件 JSX */}
    </div>
  );
}
