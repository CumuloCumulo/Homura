/**
 * =============================================================================
 * Homura - Shared ActionIcon Component
 * =============================================================================
 *
 * Icon component for primitive action types
 * Used across Dashboard and SidePanel
 */

import type { PrimitiveAction } from '@homura/sdk/types';

interface ActionIconProps {
  action: PrimitiveAction;
  /** Additional CSS classes */
  className?: string;
  /** Background color override */
  bgClass?: string;
  /** Text color override */
  textClass?: string;
}

const ICON_SIZE = 'w-3.5 h-3.5';

export function ActionIcon({
  action,
  className = '',
  bgClass = 'bg-zinc-800',
  textClass = 'text-zinc-400'
}: ActionIconProps) {
  const baseClass = 'shrink-0 rounded flex items-center justify-center';
  const sizeClass = 'w-7 h-7';

  return (
    <div className={`${baseClass} ${sizeClass} ${bgClass} ${textClass} ${className}`.trim()}>
      {action === 'CLICK' && <ClickIcon />}
      {action === 'INPUT' && <InputIcon />}
      {action === 'EXTRACT_TEXT' && <ExtractTextIcon />}
      {action === 'WAIT_FOR' && <WaitForIcon />}
      {action === 'NAVIGATE' && <NavigateIcon />}
    </div>
  );
}

function ClickIcon() {
  return (
    <svg className={ICON_SIZE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
    </svg>
  );
}

function InputIcon() {
  return (
    <svg className={ICON_SIZE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function ExtractTextIcon() {
  return (
    <svg className={ICON_SIZE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function WaitForIcon() {
  return (
    <svg className={ICON_SIZE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function NavigateIcon() {
  return (
    <svg className={ICON_SIZE} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
