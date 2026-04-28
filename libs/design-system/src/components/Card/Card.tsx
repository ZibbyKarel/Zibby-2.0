import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { Container, type ContainerProps } from '../Container';
import { useTokens } from '../../DesignSystemContext';
import type { Padding } from '../../tokens';
import {
  computeVisualStyle,
  type SurfaceBackground,
  type SurfaceBorderEdges,
  type SurfaceBorderStyle,
  type SurfaceBorderTone,
  type SurfaceRadius,
  type SurfaceShadow,
} from '../../visualStyles';

export type CardVariant = 'outlined' | 'elevated' | 'filled';

type CardVisualDefaults = {
  background: SurfaceBackground;
  bordered: boolean;
  shadow: SurfaceShadow;
};

const VARIANT_DEFAULTS: Record<CardVariant, CardVisualDefaults> = {
  outlined: { background: 'bg1', bordered: true,  shadow: 'none' },
  elevated: { background: 'bg1', bordered: true,  shadow: '2'    },
  filled:   { background: 'bg2', bordered: false, shadow: 'none' },
};

export type CardProps = Omit<ContainerProps, 'padding'> & {
  /** Visual variant. Sets sensible defaults for `background`, `bordered`, and `shadow`; explicit props always win. */
  variant?: CardVariant;
  /** Token-driven background fill. Overrides the variant default. */
  background?: SurfaceBackground;
  /** True for borders on every edge, an object for per-edge borders, or false to drop the variant border. */
  bordered?: boolean | SurfaceBorderEdges;
  /** Border tone. Defaults to `default`. */
  borderTone?: SurfaceBorderTone;
  /** Border line style. Defaults to `solid`. */
  borderStyle?: SurfaceBorderStyle;
  /** Token-driven corner radius. Defaults to `md`. */
  radius?: SurfaceRadius;
  /** Token-driven elevation shadow. Overrides the variant default. */
  shadow?: SurfaceShadow;
  /** When true, applies a hover-driven border bump and a pointer cursor. */
  interactive?: boolean;
  /** Internal spacing — a Spacing token or a Padding tuple. */
  padding?: Padding;
};

/**
 * Visual surface (background, border, radius, shadow). Composes a `Container`
 * internally so consumers get padding, dimensions, positioning, overflow, and
 * cursor concerns "for free" without Card having to re-implement any of them.
 *
 * ```tsx
 * <Card variant="outlined" background="bg1" bordered borderTone="accent" radius="md" minWidth={280} padding={['150', '150']}>
 *   <Stack direction="column" gap="100">…</Stack>
 * </Card>
 * ```
 */
export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  {
    variant = 'outlined',
    background,
    bordered,
    borderTone = 'default',
    borderStyle = 'solid',
    radius = 'md',
    shadow,
    interactive,
    padding = '200',
    className = '',
    style,
    children,
    ...containerProps
  },
  ref,
) {
  const tokens = useTokens();
  const defaults = VARIANT_DEFAULTS[variant];

  const resolvedVisual = {
    background: background ?? defaults.background,
    bordered: bordered ?? defaults.bordered,
    borderTone,
    borderStyle,
    radius,
    shadow: shadow ?? defaults.shadow,
  };
  const visualStyle = computeVisualStyle(resolvedVisual, tokens);

  const interactiveClass = interactive
    ? 'cursor-pointer transition-colors hover:border-[var(--border-strong)]'
    : '';
  const cls = ['ds-card', interactiveClass, className].filter(Boolean).join(' ');

  return (
    <Container
      ref={ref}
      {...containerProps}
      padding={padding}
      className={cls}
      style={mergeStyles(visualStyle, style)}
    >
      {children}
    </Container>
  );
});

function mergeStyles(
  base: CSSProperties,
  override: CSSProperties | undefined,
): CSSProperties {
  if (!override) return base;
  return { ...base, ...override };
}

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
        {title && <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>}
        {subtitle && <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{subtitle}</div>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`text-sm text-[var(--text-secondary)] ${className}`.trim()} {...props}>
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
