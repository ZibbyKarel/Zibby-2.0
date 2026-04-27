import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Icon, IconName } from '../Icon';
import type { Size } from '../../tokens';

export type IconButtonVariant =
  | 'ghost'
  | 'secondary'
  | 'outline'
  | 'primary'
  | 'danger';
export type IconButtonSize = Extract<Size, 'sm' | 'md' | 'lg'>;

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> & {
  /** The icon to render inside the button. */
  icon: IconName;
  /** Required for accessibility — the spoken label for the action. */
  'aria-label': string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
};

const variantClasses: Record<IconButtonVariant, string> = {
  ghost:
    'bg-transparent text-[var(--text-1)] border-transparent hover:bg-[var(--bg-hover)]',
  secondary:
    'bg-[var(--bg-2)] text-[var(--text-1)] border-[var(--border)] hover:bg-[var(--bg-hover)]',
  outline:
    'bg-transparent text-[var(--text-0)] border-[var(--border-2)] hover:bg-[var(--bg-hover)]',
  primary:
    'bg-[var(--emerald)] text-[#04140d] border-[var(--emerald)] hover:opacity-90',
  danger:
    'bg-transparent text-[var(--rose)] border-[var(--border)] hover:bg-[var(--bg-hover)]',
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

const iconSizes: Record<IconButtonSize, number> = {
  sm: 12,
  md: 14,
  lg: 16,
};

export enum IconButtonDataTestIds {
  Icon = 'icon-btn-icon',
}

/**
 * Square icon-only button. Use {@link Button} when you need a label.
 *
 * Required `aria-label` keeps the action discoverable to screen readers.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      icon,
      variant = 'ghost',
      size = 'md',
      className = '',
      type = 'button',
      ...props
    },
    ref,
  ) {
    const base =
      'inline-flex items-center justify-center rounded-[var(--radius-sm)] ' +
      'border font-medium transition-colors ' +
      'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

    return (
      <button
        ref={ref}
        type={type}
        className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`.trim()}
        {...props}
      >
        <Icon
          value={icon}
          size={iconSizes[size]}
          data-testid={IconButtonDataTestIds.Icon}
        />
      </button>
    );
  },
);
