import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { Icon, IconName } from '../Icon';
import type { Size } from '../../tokens';
import { computeContainerStyle, type ContainerProps } from '../Container';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';

export type ButtonSize = Extract<Size, 'sm' | 'md' | 'lg'>;

type StandardButtonAttrs = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | keyof ContainerProps
>;

export type ButtonProps = StandardButtonAttrs &
  ContainerProps & {
    /** Optional text. Mutually exclusive with `children`; when both are passed, `children` wins. */
    label?: ReactNode;
    /** Free-form button content (falls back to label/icons mode when omitted). */
    children?: ReactNode;
    variant?: ButtonVariant;
    /** Sizing preset. */
    size?: ButtonSize;
    /** Leading icon. */
    startIcon?: IconName;
    /** Trailing icon. */
    endIcon?: IconName;
  };

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--emerald)] text-[#04140d] border-[var(--emerald)] hover:opacity-90',
  secondary:
    'bg-[var(--bg-raised)] text-[var(--text-primary)] border-[var(--border)] hover:bg-[var(--bg-hover)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-hover)]',
  outline:
    'bg-transparent text-[var(--text-primary)] border-[var(--border-strong)] hover:bg-[var(--bg-hover)]',
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

  const containerStyle = computeContainerStyle({
    padding,
    width, height, minWidth, maxWidth, minHeight, maxHeight,
    position, top, right, bottom, left, zIndex,
    overflow, overflowX, overflowY,
    opacity, cursor, pointerEvents, userSelect, textAlign, resize,
    grow, shrink,
  });

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

  const cls = `${STANDARD_BASE} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`.trim();

  return (
    <button
      ref={ref}
      className={cls}
      style={{ ...containerStyle, ...style }}
      {...rest}
    >
      {inner}
    </button>
  );
});
