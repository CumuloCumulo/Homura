/**
 * =============================================================================
 * Homura Dashboard - Shared ViewButton Component
 * =============================================================================
 *
 * Tab button for view switching in editors
 */

interface ViewButtonProps {
  view: string;
  currentView: string;
  onClick: () => void;
  children: string;
  disabled?: boolean;
  /** Accent color (default: violet) */
  color?: 'violet' | 'fuchsia';
}

export function ViewButton({
  view,
  currentView,
  onClick,
  children,
  disabled = false,
  color = 'violet',
}: ViewButtonProps) {
  const colorClasses = {
    violet: {
      active: 'bg-violet-500/20 text-violet-400',
      inactive: 'text-zinc-500 hover:text-zinc-400',
    },
    fuchsia: {
      active: 'bg-fuchsia-500/20 text-fuchsia-400',
      inactive: 'text-zinc-500 hover:text-zinc-400',
    },
  };

  const isActive = currentView === view;
  const colorClass = isActive
    ? colorClasses[color].active
    : colorClasses[color].inactive;
  const disabledClass = disabled ? 'text-zinc-700 cursor-not-allowed' : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${colorClass} ${disabledClass}`}
    >
      {children}
    </button>
  );
}
