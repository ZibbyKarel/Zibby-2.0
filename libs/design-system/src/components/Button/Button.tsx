import {
  forwardRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Icon, IconName } from '../Icon';
import type { Size } from '../../tokens';
import { useTokens } from '../../DesignSystemContext';
import { computeContainerStyle, type ContainerProps } from '../Container';
import {
  computeVisualStyle,
  type SurfaceBackground,
  type SurfaceBorderEdges,
  type SurfaceBorderStyle,
  type SurfaceBorderTone,
  type SurfaceRadius,
  type SurfaceShadow,
} from '../../visualStyles';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'danger'
  /**
   * Layout-passthrough variant. Drops the size-driven height/padding so the
   * button can be a Card-shaped click target with arbitrary children, accepting
   * Container layout/sizing/padding props plus visual treatment props
   * (background, bordered, borderTone, borderStyle, radius, shadow). Use for
   * custom click targets like a collapsible card header or a full-width row
   * trigger.
   */
  | 'surface';

export type ButtonSize = Extract<Size, 'sm' | 'md' | 'lg'>;

type StandardButtonAttrs = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | keyof ContainerProps
>;

export type ButtonProps = StandardButtonAttrs &
  ContainerProps & {
    /** Optional text. Mutually exclusive with `children`; when both are passed, `children` wins. */
    label?: ReactNode;
    /** Free-form button content (used by the `surface` variant; falls back to label/icons mode otherwise). */
    children?: ReactNode;
    variant?: ButtonVariant;
    /** Sizing preset. Ignored by the `surface` variant. */
    size?: ButtonSize;
    /** Leading icon (label/icons mode only). */
    startIcon?: IconName;
    /** Trailing icon (label/icons mode only). */
    endIcon?: IconName;

    // Visual passthrough props — only meaningful for variant="surface".
    background?: SurfaceBackground;
    bordered?: boolean | SurfaceBorderEdges;
    borderTone?: SurfaceBorderTone;
    borderStyle?: SurfaceBorderStyle;
    radius?: SurfaceRadius;
    shadow?: SurfaceShadow;
  };

const variantClasses: Record<Exclude<ButtonVariant, 'surface'>, string> = {
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

const iconSizes: Record<ButtonSize, Size> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
};

export enum ButtonDataTestIds {
  StartIcon = 'btn-start-icon',
  EndIcon = 'btn-end-icon',
  Label = 'btn-label',
}

const STANDARD_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] ' +
  'border font-medium whitespace-nowrap transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  props,
  ref,
) {
  const {
    label,
    children,
    variant = 'ghost',
    size = 'md',
    startIcon,
    endIcon,
    className = '',
    style,
    // Visual passthrough (extracted so they don't leak onto the rendered DOM)
    background,
    bordered,
    borderTone,
    borderStyle,
    radius,
    shadow,
    // Container-style props (extracted so they don't leak as DOM attributes)
    padding,
    width,
    height,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    position,
    top,
    right,
    bottom,
    left,
    zIndex,
    overflow,
    overflowX,
    overflowY,
    opacity,
    cursor,
    pointerEvents,
    userSelect,
    textAlign,
    resize,
    grow,
    shrink,
    ...rest
  } = props;

  const tokens = useTokens();
  const containerStyle = computeContainerStyle({
    padding,
    width, height, minWidth, maxWidth, minHeight, maxHeight,
    position, top, right, bottom, left, zIndex,
    overflow, overflowX, overflowY,
    opacity, cursor, pointerEvents, userSelect, textAlign, resize,
    grow, shrink,
  });
  const visualStyle =
    variant === 'surface'
      ? computeVisualStyle(
          { background, bordered, borderTone, borderStyle, radius, shadow },
          tokens,
        )
      : ({} as CSSProperties);

  const inner: ReactNode =
    children !== undefined ? (
      children
    ) : (
      <>
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
      </>
    );

  const cls =
    variant === 'surface'
      ? ['ds-button-surface', className].filter(Boolean).join(' ')
      : `${STANDARD_BASE} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`.trim();

  return (
    <button
      ref={ref}
      className={cls}
      style={{ ...visualStyle, ...containerStyle, ...style }}
      {...rest}
    >
      {inner}
    </button>
  );
});
