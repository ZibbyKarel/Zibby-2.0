import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Icon, IconName } from '../Icon';
import type { Size } from '../../tokens';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'danger';
export type ButtonSize = Extract<Size, 'sm' | 'md' | 'lg'>;

export type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> & {
  /** Optional text. When omitted, the button renders as an icon-only square. */
  label: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  startIcon?: IconName;
  endIcon?: IconName;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--emerald)] text-[#04140d] border-[var(--emerald)] hover:opacity-90',
  secondary:
    'bg-[var(--bg-3)] text-[var(--text-0)] border-[var(--border)] hover:bg-[var(--bg-hover)]',
  ghost:
    'bg-transparent text-[var(--text-1)] border-transparent hover:bg-[var(--bg-hover)]',
  outline:
    'bg-transparent text-[var(--text-0)] border-[var(--border-2)] hover:bg-[var(--bg-hover)]',
  danger:
    'bg-transparent text-[var(--rose)] border-[var(--border)] hover:bg-[var(--bg-hover)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-8 px-3 text-sm',
  lg: 'h-10 px-4 text-base',
};

const iconSizes: Record<ButtonSize, number> = {
  sm: 12,
  md: 14,
  lg: 16,
};

export enum ButtonDataTestIds {
  StartIcon = 'btn-start-icon',
  EndIcon = 'btn-end-icon',
  Label = 'btn-label',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      label,
      variant = 'ghost',
      size = 'md',
      startIcon,
      endIcon,
      className = '',
      ...props
    },
    ref,
  ) {
    const base =
      'inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] ' +
      'border font-medium whitespace-nowrap transition-colors ' +
      'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

    return (
      <button
        ref={ref}
        className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`.trim()}
        {...props}
      >
        {startIcon && (
          <Icon
            value={startIcon}
            size={iconSizes[size]}
            data-testid={ButtonDataTestIds.StartIcon}
          />
        )}
        <div data-testid={ButtonDataTestIds.Label}>{label}</div>
        {endIcon && (
          <Icon
            value={endIcon}
            size={iconSizes[size]}
            data-testid={ButtonDataTestIds.EndIcon}
          />
        )}
      </button>
    );
  },
);
