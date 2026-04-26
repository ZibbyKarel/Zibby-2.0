import {
  forwardRef,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { useTokens } from '../../DesignSystemContext';

export type SurfaceBackground =
  | 'bg0'
  | 'bg1'
  | 'bg2'
  | 'bg3'
  | 'hover'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'sky'
  | 'violet'
  | 'emeraldTint'
  | 'roseTint'
  | 'amberTint'
  | 'skyTint'
  | 'violetTint'
  | 'accentSoft'
  | 'backdrop'
  | 'transparent';
export type SurfaceRadius = 'none' | 'sm' | 'md' | 'pill';
export type SurfaceShadow = 'none' | '1' | '2';

export type SurfaceBorderEdges = {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
};

export type SurfaceBorderTone =
  | 'default'
  | 'strong'
  | 'accent'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'sky'
  | 'violet';

export type SurfaceProps = Omit<HTMLAttributes<HTMLElement>, 'color'> & {
  /** Token-driven background fill. Defaults to `transparent`. */
  background?: SurfaceBackground;
  /** True for a 1px border on every edge, an object for per-edge borders, or false/undefined for none. */
  bordered?: boolean | SurfaceBorderEdges;
  /** Border tone. Defaults to `default`. */
  borderTone?: SurfaceBorderTone;
  /** Border line style. Defaults to `solid`. */
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  /** Token-driven corner radius. Defaults to `none`. */
  radius?: SurfaceRadius;
  /** Token-driven elevation shadow. Defaults to `none`. */
  shadow?: SurfaceShadow;
  /** Shorthand padding (px when a number). */
  padding?: number | string;
  /** Horizontal padding. Wins over `padding`. */
  paddingX?: number | string;
  /** Vertical padding. Wins over `padding`. */
  paddingY?: number | string;
  /** Top padding. Wins over `paddingY` and `padding`. */
  paddingTop?: number | string;
  /** Right padding. Wins over `paddingX` and `padding`. */
  paddingRight?: number | string;
  /** Bottom padding. Wins over `paddingY` and `padding`. */
  paddingBottom?: number | string;
  /** Left padding. Wins over `paddingX` and `padding`. */
  paddingLeft?: number | string;
  /** Vertical scroll behaviour. */
  overflowY?: 'auto' | 'hidden' | 'scroll' | 'visible';
  /** Horizontal scroll behaviour. */
  overflowX?: 'auto' | 'hidden' | 'scroll' | 'visible';
  /** CSS position. */
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  /** Edge offsets when `position` is set. */
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  /** Stacking context. */
  zIndex?: number;
  /** Pointer-events override (use `'none'` for click-through containers). */
  pointerEvents?: 'auto' | 'none';
  /** Cursor style. */
  cursor?:
    | 'auto'
    | 'default'
    | 'pointer'
    | 'not-allowed'
    | 'grab'
    | 'grabbing'
    | 'text';
  /** When true, applies a hover-driven border-color bump (default → strong). */
  interactive?: boolean;
  /** Opacity (e.g. 0.4 while dragging). */
  opacity?: number;
  /** Text alignment, useful when rendering as a `<button>`. */
  textAlign?: 'left' | 'center' | 'right';
  /** User-select behaviour. */
  userSelect?: 'auto' | 'none' | 'text' | 'all';
  /** Resize behaviour for `<textarea>` etc. */
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  /** Fixed width — px when a number. */
  width?: number | string;
  /** Fixed height — px when a number. */
  height?: number | string;
  /** Maximum width — px when a number. */
  maxWidth?: number | string;
  /** Minimum width — px when a number. */
  minWidth?: number | string;
  /** Maximum height — px when a number. */
  maxHeight?: number | string;
  /** Minimum height — px when a number. */
  minHeight?: number | string;
  /** Whether the surface should be flex-grow:1 in a parent flex row/column. */
  grow?: boolean;
  /** Whether the surface should be flex-shrink:0. Defaults to allow shrinking. */
  shrink?: boolean;
  /** Turns the surface into a flex container with the given direction. */
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  /** Spacing between flex children when `direction` is set. */
  gap?: number | string;
  /** align-items, only when `direction` is set. */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  /** justify-content, only when `direction` is set. */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  /** Render as a different HTML element. Defaults to `div`. */
  as?: ElementType;
  /** Forwarded `type` attribute when rendering as a `<button>`. */
  type?: 'button' | 'submit' | 'reset';
  /** Forwarded `disabled` attribute when rendering as a `<button>`. */
  disabled?: boolean;
  children?: ReactNode;
};

function px(v: number | string | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
}

/**
 * Token-driven container — page chrome, panels, banners, etc. Avoids
 * hand-rolled inline styles in app code by exposing a small set of layout
 * knobs (background, borders, padding, radius, shadow) backed by design
 * tokens.
 *
 * Compose with `Stack` for flex layout:
 *
 * ```tsx
 * <Surface as="header" background="bg1" bordered={{ bottom: true }} paddingX={20} paddingY={14}>
 *   <Stack direction="row" align="center" gap={16}>…</Stack>
 * </Surface>
 * ```
 */
export const Surface = forwardRef<HTMLElement, SurfaceProps>(function Surface(
  {
    background = 'transparent',
    bordered,
    borderTone = 'default',
    borderStyle = 'solid',
    radius = 'none',
    shadow = 'none',
    padding,
    paddingX,
    paddingY,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    overflowY,
    overflowX,
    position,
    top,
    right,
    bottom,
    left,
    zIndex,
    pointerEvents,
    cursor,
    interactive,
    opacity,
    textAlign,
    userSelect,
    resize,
    width,
    height,
    maxWidth,
    minWidth,
    maxHeight,
    minHeight,
    grow,
    shrink,
    direction,
    gap,
    align,
    justify,
    as,
    style,
    className = '',
    children,
    ...rest
  },
  ref,
) {
  const tokens = useTokens();
  const Tag = (as ?? 'div') as ElementType;

  const bgValue = (() => {
    switch (background) {
      case 'bg0':
        return tokens.color.bg[0];
      case 'bg1':
        return tokens.color.bg[1];
      case 'bg2':
        return tokens.color.bg[2];
      case 'bg3':
        return tokens.color.bg[3];
      case 'hover':
        return tokens.color.bg.hover;
      case 'emerald':
        return tokens.color.accent.emerald;
      case 'rose':
        return tokens.color.accent.rose;
      case 'amber':
        return tokens.color.accent.amber;
      case 'sky':
        return tokens.color.accent.sky;
      case 'violet':
        return tokens.color.accent.violet;
      case 'emeraldTint':
        return 'rgba(16,185,129,.12)';
      case 'roseTint':
        return 'rgba(244,63,94,.12)';
      case 'amberTint':
        return 'rgba(245,158,11,.12)';
      case 'skyTint':
        return 'rgba(56,189,248,.12)';
      case 'violetTint':
        return 'rgba(167,139,250,.12)';
      case 'accentSoft':
        return tokens.color.surface.accentSoft;
      case 'backdrop':
        return 'rgba(0,0,0,.55)';
      case 'transparent':
        return undefined;
    }
  })();

  const borderColor = (() => {
    switch (borderTone) {
      case 'default':
        return tokens.color.border.default;
      case 'strong':
        return tokens.color.border.strong;
      case 'accent':
        return tokens.color.accent.emerald;
      case 'emerald':
        return tokens.color.accent.emerald;
      case 'rose':
        return tokens.color.accent.rose;
      case 'amber':
        return tokens.color.accent.amber;
      case 'sky':
        return tokens.color.accent.sky;
      case 'violet':
        return tokens.color.accent.violet;
    }
  })();

  const borderEdges: SurfaceBorderEdges =
    bordered === true
      ? { top: true, bottom: true, left: true, right: true }
      : bordered === false || bordered === undefined
        ? {}
        : bordered;

  const radiusValue = (() => {
    switch (radius) {
      case 'none':
        return undefined;
      case 'sm':
        return tokens.size.radiusSm;
      case 'md':
        return tokens.size.radius;
      case 'pill':
        return '999px';
    }
  })();

  const shadowValue = (() => {
    switch (shadow) {
      case 'none':
        return undefined;
      case '1':
        return tokens.size.shadow1;
      case '2':
        return tokens.size.shadow2;
    }
  })();

  const padTop = paddingTop ?? paddingY ?? padding;
  const padBottom = paddingBottom ?? paddingY ?? padding;
  const padLeft = paddingLeft ?? paddingX ?? padding;
  const padRight = paddingRight ?? paddingX ?? padding;

  const computed: CSSProperties = {
    background: bgValue,
    borderTopWidth: borderEdges.top ? 1 : undefined,
    borderBottomWidth: borderEdges.bottom ? 1 : undefined,
    borderLeftWidth: borderEdges.left ? 1 : undefined,
    borderRightWidth: borderEdges.right ? 1 : undefined,
    borderStyle:
      borderEdges.top ||
      borderEdges.bottom ||
      borderEdges.left ||
      borderEdges.right
        ? borderStyle
        : undefined,
    borderColor,
    borderRadius: radiusValue,
    boxShadow: shadowValue,
    paddingTop: padTop === undefined ? undefined : px(padTop),
    paddingRight: padRight === undefined ? undefined : px(padRight),
    paddingBottom: padBottom === undefined ? undefined : px(padBottom),
    paddingLeft: padLeft === undefined ? undefined : px(padLeft),
    width: width === undefined ? undefined : px(width),
    height: height === undefined ? undefined : px(height),
    maxWidth: maxWidth === undefined ? undefined : px(maxWidth),
    minWidth: minWidth === undefined ? undefined : px(minWidth),
    maxHeight: maxHeight === undefined ? undefined : px(maxHeight),
    minHeight: minHeight === undefined ? undefined : px(minHeight),
    flexGrow: grow ? 1 : undefined,
    flexShrink: shrink === false ? 0 : undefined,
    overflowY,
    overflowX,
    position,
    top: top === undefined ? undefined : px(top),
    right: right === undefined ? undefined : px(right),
    bottom: bottom === undefined ? undefined : px(bottom),
    left: left === undefined ? undefined : px(left),
    zIndex,
    pointerEvents,
    cursor,
    opacity,
    textAlign,
    userSelect,
    resize,
    display: direction ? 'flex' : undefined,
    flexDirection: direction,
    gap:
      gap === undefined
        ? undefined
        : typeof gap === 'number'
          ? `${gap}px`
          : gap,
    alignItems:
      align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : align,
    justifyContent:
      justify === 'start'
        ? 'flex-start'
        : justify === 'end'
          ? 'flex-end'
          : justify === 'between'
            ? 'space-between'
            : justify === 'around'
              ? 'space-around'
              : justify === 'evenly'
                ? 'space-evenly'
                : justify,
    ...style,
  };

  const cls = ['ds-surface', interactive && 'ds-surface-interactive', className]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag ref={ref} className={cls} style={computed} {...rest}>
      {children}
    </Tag>
  );
});
