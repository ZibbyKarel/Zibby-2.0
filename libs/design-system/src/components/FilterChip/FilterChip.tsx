import { type ReactNode, type MouseEvent, type KeyboardEvent } from 'react';
import { useChipTokens } from '../../DesignSystemContext';
import type { ChipToneKey, Size } from '../../tokens';

export type FilterChipTone = ChipToneKey;
export type FilterChipSize = Extract<Size, 'sm' | 'md'>;

export type FilterChipProps = {
  children: ReactNode;
  /** When true, the chip renders in its tone-coloured "selected" appearance. */
  active?: boolean;
  /** Tone used when active. The inactive state always uses neutral colors. */
  tone?: FilterChipTone;
  size?: FilterChipSize;
  icon?: ReactNode;
  onToggle?: (next: boolean, e: MouseEvent | KeyboardEvent) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  /** Forwarded straight to the rendered `<button>`. Used by tests. */
  'data-testid'?: string;
};

const sizeClasses: Record<FilterChipSize, string> = {
  sm: 'h-5 px-2 text-[10px] gap-1',
  md: 'h-6 px-2.5 text-[11px] gap-1.5',
};

/**
 * Toggleable chip — typically used in filter rows where the user picks between
 * a small set of mutually-non-exclusive states. Visually flips between a muted
 * "off" look and the chip-tone palette when on.
 *
 * The component is uncontrolled UI-wise; consumers track the `active` state
 * themselves and respond to `onToggle`.
 */
export function FilterChip({
  children,
  active = false,
  tone = 'accent',
  size = 'md',
  icon,
  onToggle,
  disabled = false,
  className = '',
  title,
  'data-testid': dataTestId,
}: FilterChipProps) {
  const t = useChipTokens(tone);

  const baseClasses =
    'inline-flex items-center rounded-md border font-mono font-medium transition-colors whitespace-nowrap ' +
    'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ' +
    sizeClasses[size];

  const inactiveClasses =
    'bg-transparent border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-hover)]';

  const fire = (e: MouseEvent | KeyboardEvent) => {
    if (disabled) return;
    onToggle?.(!active, e);
  };

  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={title}
      data-testid={dataTestId}
      onClick={fire}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fire(e);
        }
      }}
      className={`${baseClasses} ${active ? '' : inactiveClasses} ${className}`.trim()}
      style={
        active
          ? { color: t.color, background: t.bg, borderColor: t.border }
          : undefined
      }
    >
      {icon && <span className="flex items-center">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
