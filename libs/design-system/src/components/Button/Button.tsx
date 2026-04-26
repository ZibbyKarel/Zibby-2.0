import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Optional text. When omitted, the button renders as an icon-only square. */
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  /** Convenience for icon-only buttons; equivalent to passing it as `startIcon` with no `label`. */
  icon?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-[var(--emerald)] text-[#04140d] border-[var(--emerald)] hover:opacity-90',
  secondary: 'bg-[var(--bg-3)] text-[var(--text-0)] border-[var(--border)] hover:bg-[var(--bg-hover)]',
  ghost:     'bg-transparent text-[var(--text-1)] border-transparent hover:bg-[var(--bg-hover)]',
  outline:   'bg-transparent text-[var(--text-0)] border-[var(--border-2)] hover:bg-[var(--bg-hover)]',
  danger:    'bg-transparent text-[var(--rose)] border-[var(--border)] hover:bg-[var(--bg-hover)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-8 px-3 text-sm',
  lg: 'h-10 px-4 text-base',
};

const iconOnlySizeClasses: Record<ButtonSize, string> = {
  sm: 'h-7 w-7 p-0 text-xs',
  md: 'h-8 w-8 p-0 text-sm',
  lg: 'h-10 w-10 p-0 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { label, variant = 'ghost', size = 'md', startIcon, endIcon, icon, className = '', ...props },
  ref,
) {
  const leading = startIcon ?? icon;
  const isIconOnly = label === undefined && !endIcon;

  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] ' +
    'border font-medium whitespace-nowrap transition-colors ' +
    'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const dimensions = isIconOnly ? iconOnlySizeClasses[size] : sizeClasses[size];

  return (
    <button
      ref={ref}
      className={`${base} ${dimensions} ${variantClasses[variant]} ${className}`.trim()}
      {...props}
    >
      {leading}
      {label}
      {endIcon}
    </button>
  );
});
