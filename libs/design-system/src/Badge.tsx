import { type ReactNode } from 'react';
import { useStatusTokens } from './DesignSystemContext';
import type { StatusKey } from './tokens';

export type BadgeStatus = StatusKey;

export type BadgeProps = {
  /** When supplied, picks colors and the pulsing dot from the built-in status palette. */
  status?: BadgeStatus;
  /** Custom text. Defaults to the status name when `status` is set. */
  label?: ReactNode;
  /** Whether to show the leading dot. Defaults to true. */
  dot?: boolean;
  /** Force the dot to pulse. Defaults to true for `running` / `pushing` / `interrupted`. */
  pulse?: boolean;
  /** Override accent color when not using a status. */
  color?: string;
  /** Override background when not using a status. */
  background?: string;
  className?: string;
  /** Forwarded to the rendered `<span>` so tests can target it. */
  'data-testid'?: string;
};

const PULSE_KEYFRAMES = '@keyframes nc-badge-pulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }';

export function Badge({
  status,
  label,
  dot = true,
  pulse,
  color,
  background,
  className = '',
  'data-testid': dataTestId,
}: BadgeProps) {
  // Hooks must be called unconditionally; default to `pending` when no status
  // is supplied so we still get a valid palette for the fallback path.
  const statusTokens = useStatusTokens(status ?? 'pending');
  const cfg = status ? statusTokens : undefined;

  const fg = color ?? cfg?.color ?? 'var(--text-1)';
  const bg = background ?? cfg?.bg ?? 'var(--bg-3)';
  const dotColor = cfg?.dot ?? fg;
  const shouldPulse = pulse ?? cfg?.pulse ?? false;
  const text = label ?? cfg?.label ?? '';

  return (
    <span
      data-testid={dataTestId}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] font-mono text-[11px] font-medium tracking-wide ${className}`.trim()}
      style={{ background: bg, color: fg }}
    >
      {shouldPulse && <style>{PULSE_KEYFRAMES}</style>}
      {dot && (
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{
            background: dotColor,
            animation: shouldPulse ? 'nc-badge-pulse 1.4s ease-in-out infinite' : undefined,
          }}
        />
      )}
      {text}
    </span>
  );
}
