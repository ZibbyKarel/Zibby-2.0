import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export type CardVariant = 'outlined' | 'elevated' | 'filled';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  padding?: CardPadding;
  /** When true, the card responds to hover (border + cursor). */
  interactive?: boolean;
  as?: 'div' | 'article' | 'section' | 'li';
  children?: ReactNode;
};

const variantClasses: Record<CardVariant, string> = {
  outlined: 'border border-[var(--border)] bg-[var(--bg-1)]',
  elevated: 'border border-[var(--border)] bg-[var(--bg-1)] shadow-[var(--shadow-2)]',
  filled:   'border border-transparent bg-[var(--bg-2)]',
};

const paddingClasses: Record<CardPadding, string> = {
  none: 'p-0',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = 'outlined',
    padding = 'md',
    interactive,
    as = 'div',
    className = '',
    children,
    ...props
  },
  ref,
) {
  const Tag = as as 'div';
  const interactiveClasses = interactive
    ? 'cursor-pointer transition-colors hover:border-[var(--border-2)]'
    : '';

  return (
    <Tag
      ref={ref}
      className={`rounded-[var(--radius)] ${variantClasses[variant]} ${paddingClasses[padding]} ${interactiveClasses} ${className}`.trim()}
      {...props}
    >
      {children}
    </Tag>
  );
});

export type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
};

export function CardHeader({ title, subtitle, action, className = '', children, ...props }: CardHeaderProps) {
  return (
    <div
      className={`flex items-start justify-between gap-3 ${className}`.trim()}
      {...props}
    >
      <div className="min-w-0 flex-1">
        {title && <div className="text-sm font-semibold text-[var(--text-0)]">{title}</div>}
        {subtitle && <div className="text-xs text-[var(--text-2)] mt-0.5">{subtitle}</div>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`text-sm text-[var(--text-1)] ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardActions({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center justify-end gap-2 pt-2 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
