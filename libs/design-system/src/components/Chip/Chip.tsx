import { type ReactNode, type MouseEvent } from 'react';
import { Icon, IconName } from '../Icon';
import { useChipTokens } from '../../DesignSystemContext';
import type { ChipToneKey } from '../../tokens';

export type ChipTone = ChipToneKey;
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
  /** Forwarded to the rendered `<span>` so tests can target it. */
  'data-testid'?: string;
};

const sizes: Record<
  ChipSize,
  { h: string; px: string; gap: string; text: string; icon: number }
> = {
  sm: { h: 'h-5', px: 'px-1.5', gap: 'gap-1', text: 'text-[10px]', icon: 9 },
  md: {
    h: 'h-[22px]',
    px: 'px-2',
    gap: 'gap-1.5',
    text: 'text-[11px]',
    icon: 11,
  },
};

export function Chip({
  children,
  tone = 'neutral',
  size = 'md',
  icon,
  onDelete,
  onClick,
  className = '',
  title,
  'data-testid': dataTestId,
}: ChipProps) {
  const t = useChipTokens(tone);
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
      data-testid={dataTestId}
      className={`inline-flex items-center rounded-md border font-mono font-medium ${s.h} ${s.px} ${s.gap} ${s.text} ${interactive ? 'cursor-pointer hover:opacity-80' : ''} ${className}`.trim()}
      style={{ color: t.color, background: t.bg, borderColor: t.border }}
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
          style={{ color: t.color }}
        >
          <Icon value={IconName.X} size={s.icon} strokeWidth={2} />
        </button>
      )}
    </span>
  );
}
