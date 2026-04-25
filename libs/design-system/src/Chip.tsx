import { type ReactNode, type MouseEvent } from 'react';

export type ChipTone = 'neutral' | 'accent' | 'violet' | 'warn' | 'sky' | 'rose';
export type ChipSize = 'sm' | 'md';

export type ChipProps = {
  children: ReactNode;
  tone?: ChipTone;
  size?: ChipSize;
  /** Leading icon. */
  icon?: ReactNode;
  /** When supplied, renders an X button on the right that calls this. */
  onDelete?: (e: MouseEvent<HTMLButtonElement>) => void;
  /** When supplied (and no `onDelete`), the chip is interactive (button-like). */
  onClick?: (e: MouseEvent<HTMLSpanElement>) => void;
  className?: string;
  title?: string;
};

const tones: Record<ChipTone, { c: string; bg: string; b: string }> = {
  neutral: { c: 'var(--text-1)',   bg: 'var(--bg-3)',               b: 'var(--border)'         },
  accent:  { c: 'var(--emerald)',  bg: 'rgba(16,185,129,.08)',      b: 'rgba(16,185,129,.25)'  },
  violet:  { c: 'var(--violet)',   bg: 'rgba(167,139,250,.10)',     b: 'rgba(167,139,250,.25)' },
  warn:    { c: 'var(--amber)',    bg: 'rgba(245,158,11,.10)',      b: 'rgba(245,158,11,.25)'  },
  sky:     { c: 'var(--sky)',      bg: 'rgba(56,189,248,.10)',      b: 'rgba(56,189,248,.25)'  },
  rose:    { c: 'var(--rose)',     bg: 'rgba(244,63,94,.10)',       b: 'rgba(244,63,94,.25)'   },
};

const sizes: Record<ChipSize, { h: string; px: string; gap: string; text: string }> = {
  sm: { h: 'h-5',  px: 'px-1.5', gap: 'gap-1',   text: 'text-[10px]' },
  md: { h: 'h-[22px]', px: 'px-2', gap: 'gap-1.5', text: 'text-[11px]' },
};

const Close = () => (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
    <path d="M2 2l5 5M7 2l-5 5" />
  </svg>
);

export function Chip({
  children,
  tone = 'neutral',
  size = 'md',
  icon,
  onDelete,
  onClick,
  className = '',
  title,
}: ChipProps) {
  const t = tones[tone];
  const s = sizes[size];
  const interactive = !!onClick;

  return (
    <span
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.(e as unknown as MouseEvent<HTMLSpanElement>);
              }
            }
          : undefined
      }
      title={title}
      className={`inline-flex items-center rounded-md border font-mono font-medium ${s.h} ${s.px} ${s.gap} ${s.text} ${interactive ? 'cursor-pointer hover:opacity-80' : ''} ${className}`.trim()}
      style={{ color: t.c, background: t.bg, borderColor: t.b }}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      <span className="truncate">{children}</span>
      {onDelete && (
        <button
          type="button"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(e);
          }}
          className="ml-0.5 inline-flex cursor-pointer items-center border-none bg-transparent p-0 text-current opacity-70 hover:opacity-100"
          style={{ color: t.c }}
        >
          <Close />
        </button>
      )}
    </span>
  );
}
