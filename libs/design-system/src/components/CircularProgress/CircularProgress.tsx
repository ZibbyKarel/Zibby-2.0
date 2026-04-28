import { type ReactNode } from 'react';

export type CircularProgressProps = {
  /** When omitted the indicator spins (indeterminate). 0–100 otherwise. */
  value?: number;
  /** Diameter in pixels. */
  size?: number;
  /** Stroke width in pixels. */
  thickness?: number;
  /** Optional label rendered under the ring. */
  label?: ReactNode;
  /** When true (default for determinate), renders the percentage in the center. */
  showValue?: boolean;
  /** Override for the determinate stroke color. By default scales from emerald → amber → rose. */
  color?: string;
  className?: string;
  'aria-label'?: string;
};

function colorFor(pct: number): string {
  if (pct >= 90) return 'var(--rose)';
  if (pct >= 75) return 'var(--amber)';
  return 'var(--emerald)';
}

export function CircularProgress({
  value,
  size = 44,
  thickness = 4,
  label,
  showValue,
  color,
  className = '',
  'aria-label': ariaLabel,
}: CircularProgressProps) {
  const isDeterminate = typeof value === 'number';
  const pct = isDeterminate ? Math.max(0, Math.min(100, value)) : 0;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const stroke = color ?? (isDeterminate ? colorFor(pct) : 'var(--emerald)');
  const determinateValueShown = showValue ?? isDeterminate;

  const animationName = `nc-cp-spin-${size}-${thickness}`;

  return (
    <div
      className={`inline-flex flex-col items-center ${className}`.trim()}
      role="progressbar"
      aria-label={ariaLabel ?? (label && typeof label === 'string' ? label : 'progress')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={isDeterminate ? pct : undefined}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <style>{`@keyframes ${animationName} { to { transform: rotate(360deg); } }`}</style>
        <svg
          width={size}
          height={size}
          style={{
            transform: 'rotate(-90deg)',
            animation: isDeterminate ? undefined : `${animationName} 1s linear infinite`,
          }}
        >
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={thickness} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={stroke}
            strokeWidth={thickness}
            fill="none"
            strokeDasharray={isDeterminate ? `${dash} ${c}` : `${c * 0.25} ${c}`}
            strokeLinecap="round"
            style={{ transition: isDeterminate ? 'stroke-dasharray .4s ease' : undefined }}
          />
        </svg>
        {determinateValueShown && isDeterminate && (
          <div
            className="absolute inset-0 flex items-center justify-center font-mono font-semibold text-[var(--text-primary)]"
            style={{ fontSize: Math.max(9, Math.round(size * 0.22)) }}
          >
            {Math.round(pct)}%
          </div>
        )}
      </div>
      {label && (
        <div className="mt-0.5 text-center text-[9px] uppercase tracking-widest text-[var(--text-tertiary)]">
          {label}
        </div>
      )}
    </div>
  );
}
