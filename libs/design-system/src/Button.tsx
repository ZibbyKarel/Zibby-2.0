import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-[var(--emerald)] text-[#04140d] border-[var(--emerald)] hover:opacity-90',
  secondary: 'bg-[var(--bg-3)] text-[var(--text-0)] border-[var(--border)] hover:bg-[var(--bg-hover)]',
  ghost:     'bg-transparent text-[var(--text-1)] border-transparent hover:bg-[var(--bg-hover)]',
  outline:   'bg-transparent text-[var(--text-0)] border-[var(--border-2)] hover:bg-[var(--bg-hover)]',
  danger:    'bg-transparent text-[var(--rose)] border-[var(--border)] hover:bg-[var(--bg-hover)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { label, variant = 'ghost', startIcon, endIcon, className = '', ...props },
  ref,
) {
  const base =
    'inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] ' +
    'border text-sm font-medium whitespace-nowrap transition-colors ' +
    'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  return (
    <button
      ref={ref}
      className={`${base} ${variantClasses[variant]} ${className}`.trim()}
      {...props}
    >
      {startIcon}
      {label}
      {endIcon}
    </button>
  );
});
