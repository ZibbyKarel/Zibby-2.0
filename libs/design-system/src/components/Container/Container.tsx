import {
  forwardRef,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { pxValue } from '../../visualStyles';
import { spacingToPx, type Spacing } from '../../tokens';

/**
 * Concrete subset of HTML elements `Container` can render. Intentionally narrow
 * — `'button'` is excluded so the design system has a single canonical home for
 * `<button>` (the `Button` component), and broad union types like `ElementType`
 * don't end up being a free-for-all polymorphism vector at consumer call sites.
 */
export type ContainerAs =
  | 'div'
  | 'span'
  | 'section'
  | 'article'
  | 'main'
  | 'header'
  | 'footer'
  | 'aside'
  | 'nav'
  | 'ul'
  | 'ol'
  | 'li'
  | 'pre'
  | 'figure'
  | 'label';

export type ContainerOverflow = 'auto' | 'hidden' | 'scroll' | 'visible';

export type ContainerCursor =
  | 'auto'
  | 'default'
  | 'pointer'
  | 'not-allowed'
  | 'grab'
  | 'grabbing'
  | 'text';

export type ContainerTextAlign = 'left' | 'center' | 'right';
export type ContainerUserSelect = 'auto' | 'none' | 'text' | 'all';
export type ContainerResize = 'none' | 'vertical' | 'horizontal' | 'both';
export type ContainerPosition =
  | 'static'
  | 'relative'
  | 'absolute'
  | 'fixed'
  | 'sticky';

/**
 * Tuple-based padding using Spacing tokens, mirroring CSS shorthand:
 * - `[v, h]` → top/bottom = v, left/right = h
 * - `[t, r, b, l]` → top, right, bottom, left
 *
 * For dynamic or non-token values, use the inline `style` prop.
 */
export type Padding =
  | [Spacing, Spacing]
  | [Spacing, Spacing, Spacing, Spacing];

export type ContainerProps = Omit<HTMLAttributes<HTMLElement>, 'color'> & {
  /** CSS-shorthand-style padding tuple. See {@link Padding}. */
  padding?: Padding;

  // Dimensions
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;

  // Positioning
  position?: ContainerPosition;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  zIndex?: number;

  // Overflow
  overflow?: ContainerOverflow;
  overflowX?: ContainerOverflow;
  overflowY?: ContainerOverflow;

  // Cosmetic / interactive
  opacity?: number;
  cursor?: ContainerCursor;
  pointerEvents?: 'auto' | 'none';
  userSelect?: ContainerUserSelect;
  textAlign?: ContainerTextAlign;
  resize?: ContainerResize;

  // Flex-child hints (Container is a layout block, not a flex parent — these
  // describe how Container behaves inside a parent flex container, which is
  // strictly a positioning concern, not a flex-layout one).
  grow?: boolean;
  shrink?: boolean;

  /** Render as a different element. Defaults to `'div'`. */
  as?: ContainerAs;
  children?: ReactNode;
};

function paddingEdges(p: Padding): [Spacing, Spacing, Spacing, Spacing] {
  return p.length === 2 ? [p[0], p[1], p[0], p[1]] : p;
}

/**
 * Container picks every prop from `props` whose value is defined and produces
 * the inline-style mapping. Exported so `Button`'s `surface` variant can reuse
 * it on its underlying `<button>` without going through a Container DOM node.
 */
export function computeContainerStyle(props: ContainerProps): CSSProperties {
  const {
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
  } = props;

  const out: CSSProperties = {};

  if (padding !== undefined) {
    const [t, r, b, l] = paddingEdges(padding);
    out.paddingTop = spacingToPx(t);
    out.paddingRight = spacingToPx(r);
    out.paddingBottom = spacingToPx(b);
    out.paddingLeft = spacingToPx(l);
  }

  if (width !== undefined) out.width = pxValue(width);
  if (height !== undefined) out.height = pxValue(height);
  if (minWidth !== undefined) out.minWidth = pxValue(minWidth);
  if (maxWidth !== undefined) out.maxWidth = pxValue(maxWidth);
  if (minHeight !== undefined) out.minHeight = pxValue(minHeight);
  if (maxHeight !== undefined) out.maxHeight = pxValue(maxHeight);

  if (position !== undefined) out.position = position;
  if (top !== undefined) out.top = pxValue(top);
  if (right !== undefined) out.right = pxValue(right);
  if (bottom !== undefined) out.bottom = pxValue(bottom);
  if (left !== undefined) out.left = pxValue(left);
  if (zIndex !== undefined) out.zIndex = zIndex;

  if (overflow !== undefined) out.overflow = overflow;
  if (overflowX !== undefined) out.overflowX = overflowX;
  if (overflowY !== undefined) out.overflowY = overflowY;

  if (opacity !== undefined) out.opacity = opacity;
  if (cursor !== undefined) out.cursor = cursor;
  if (pointerEvents !== undefined) out.pointerEvents = pointerEvents;
  if (userSelect !== undefined) out.userSelect = userSelect;
  if (textAlign !== undefined) out.textAlign = textAlign;
  if (resize !== undefined) out.resize = resize;

  if (grow) out.flexGrow = 1;
  if (shrink === true) out.flexShrink = 1;
  if (shrink === false) out.flexShrink = 0;

  return out;
}

/**
 * The set of prop keys handled by `computeContainerStyle`. Used by Card and
 * Button-surface to peel the Container-shaped subset out of their public
 * props before forwarding the remainder to the underlying element.
 */
export const CONTAINER_STYLE_KEYS = [
  'padding',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
  'overflow',
  'overflowX',
  'overflowY',
  'opacity',
  'cursor',
  'pointerEvents',
  'userSelect',
  'textAlign',
  'resize',
  'grow',
  'shrink',
] as const satisfies readonly (keyof ContainerProps)[];

/**
 * Elementary primitive owning padding, dimensions, positioning, overflow, and
 * cursor/opacity/pointer concerns. Composes a single DOM node and renders no
 * visual treatment of its own — pair with `Card` (background/border/radius/
 * shadow), `Stack` (flex layout), or render a Container directly when none of
 * those apply.
 */
export const Container = forwardRef<HTMLElement, ContainerProps>(
  function Container(props, ref) {
    const {
      as,
      style,
      className = '',
      children,
      // Strip the style-producing keys so the rest of `props` can be spread
      // onto the rendered element as native HTML attributes / event handlers.
      padding: _padding,
      width: _width,
      height: _height,
      minWidth: _minWidth,
      maxWidth: _maxWidth,
      minHeight: _minHeight,
      maxHeight: _maxHeight,
      position: _position,
      top: _top,
      right: _right,
      bottom: _bottom,
      left: _left,
      zIndex: _zIndex,
      overflow: _overflow,
      overflowX: _overflowX,
      overflowY: _overflowY,
      opacity: _opacity,
      cursor: _cursor,
      pointerEvents: _pointerEvents,
      userSelect: _userSelect,
      textAlign: _textAlign,
      resize: _resize,
      grow: _grow,
      shrink: _shrink,
      ...rest
    } = props;

    const Tag = (as ?? 'div') as ElementType;
    const computed = computeContainerStyle(props);
    const cls = ['ds-container', className].filter(Boolean).join(' ');

    return (
      <Tag
        ref={ref}
        className={cls}
        style={{ ...computed, ...style }}
        {...rest}
      >
        {children}
      </Tag>
    );
  },
);
