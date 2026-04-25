import { type ReactNode } from 'react';

export type BadgeStatus =
  | 'pending'
  | 'blocked'
  | 'running'
  | 'pushing'
  | 'review'
  | 'done'
  | 'failed'
  | 'cancelled'
  | 'interrupted';

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
};

type Cfg = { label: string; color: string; bg: string; dot: string; pulse?: boolean };

const statusMap: Record<BadgeStatus, Cfg> = {
  pending:     { label: 'pending',     color: 'var(--text-2)',  bg: 'var(--bg-3)',           dot: 'var(--text-3)' },
  blocked:     { label: 'blocked',     color: 'var(--text-2)',  bg: 'var(--bg-3)',           dot: 'var(--text-3)' },
  running:     { label: 'running',     color: 'var(--emerald)', bg: 'rgba(16,185,129,.12)',  dot: 'var(--emerald)', pulse: true },
  pushing:     { label: 'pushing',     color: 'var(--sky)',     bg: 'rgba(56,189,248,.12)',  dot: 'var(--sky)',     pulse: true },
  review:      { label: 'review',      color: 'var(--violet)',  bg: 'rgba(167,139,250,.12)', dot: 'var(--violet)' },
  done:        { label: 'done',        color: 'var(--emerald)', bg: 'rgba(16,185,129,.10)',  dot: 'var(--emerald)' },
  failed:      { label: 'failed',      color: 'var(--rose)',    bg: 'rgba(244,63,94,.10)',   dot: 'var(--rose)' },
  cancelled:   { label: 'cancelled',   color: 'var(--amber)',   bg: 'rgba(245,158,11,.10)',  dot: 'var(--amber)' },
  interrupted: { label: 'interrupted', color: 'var(--amber)',   bg: 'rgba(245,158,11,.12)',  dot: 'var(--amber)',   pulse: true },
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
}: BadgeProps) {
  const cfg = status ? statusMap[status] : undefined;
  const fg = color ?? cfg?.color ?? 'var(--text-1)';
  const bg = background ?? cfg?.bg ?? 'var(--bg-3)';
  const dotColor = cfg?.dot ?? fg;
  const shouldPulse = pulse ?? cfg?.pulse ?? false;
  const text = label ?? cfg?.label ?? '';

  return (
    <span
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
