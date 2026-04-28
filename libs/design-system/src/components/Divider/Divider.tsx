import { type ReactNode } from 'react';

export type DividerOrientation = 'horizontal' | 'vertical';

export type DividerProps = {
  orientation?: DividerOrientation;
  /** When inside a flex container, use `flexItem` so the divider stretches to the cross-axis. */
  flexItem?: boolean;
  /** Optional text rendered inline (only meaningful for horizontal). */
  children?: ReactNode;
  /** Spacing in px for vertical dividers, px for horizontal margin. */
  spacing?: number;
  className?: string;
};

export function Divider({
  orientation = 'horizontal',
  flexItem,
  children,
  spacing,
  className = '',
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={`inline-block bg-[var(--border)] ${className}`.trim()}
        style={{
          width: 1,
          alignSelf: flexItem ? 'stretch' : undefined,
          height: flexItem ? undefined : '1em',
          marginInline: spacing,
        }}
      />
    );
  }

  if (children) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={`flex items-center gap-3 text-[11px] uppercase tracking-widest text-[var(--text-muted)] ${className}`.trim()}
        style={{ marginBlock: spacing }}
      >
        <span className="h-px flex-1 bg-[var(--border)]" />
        <span>{children}</span>
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>
    );
  }

  return (
    <hr
      role="separator"
      aria-orientation="horizontal"
      className={`m-0 h-px w-full border-0 bg-[var(--border)] ${className}`.trim()}
      style={{ marginBlock: spacing }}
    />
  );
}
