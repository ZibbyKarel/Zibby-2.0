import { forwardRef, type ElementType, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { spacingToPx, type Spacing } from '../../tokens';

export type StackDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export type StackProps = HTMLAttributes<HTMLDivElement> & {
  direction?: StackDirection;
  align?: StackAlign;
  justify?: StackJustify;
  /** Spacing between children expressed as a design-system Spacing token. */
  gap?: Spacing;
  wrap?: boolean;
  inline?: boolean;
  /** Whether the stack should be flex-grow:1 inside a flex parent. */
  grow?: boolean;
  /**
   * Controls flex-shrink as a child of another flex container. `false` pins the
   * stack at its content size (`flex-shrink: 0`); `true` opts back into the
   * default shrinkable behaviour (`flex-shrink: 1`); leave undefined to inherit.
   */
  shrink?: boolean;
  as?: ElementType;
  children?: ReactNode;
};

const alignMap: Record<StackAlign, CSSProperties['alignItems']> = {
  start:    'flex-start',
  center:   'center',
  end:      'flex-end',
  stretch:  'stretch',
  baseline: 'baseline',
};

const justifyMap: Record<StackJustify, CSSProperties['justifyContent']> = {
  start:   'flex-start',
  center:  'center',
  end:     'flex-end',
  between: 'space-between',
  around:  'space-around',
  evenly:  'space-evenly',
};

export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  {
    direction = 'column',
    align,
    justify,
    gap,
    wrap,
    inline,
    grow,
    shrink,
    as,
    style,
    className = '',
    children,
    ...props
  },
  ref,
) {
  const Tag = (as ?? 'div') as ElementType;
  const computed: CSSProperties = {
    display: inline ? 'inline-flex' : 'flex',
    flexDirection: direction,
    alignItems: align ? alignMap[align] : undefined,
    justifyContent: justify ? justifyMap[justify] : undefined,
    gap: gap !== undefined ? spacingToPx(gap) : undefined,
    flexWrap: wrap ? 'wrap' : undefined,
    flexGrow: grow ? 1 : undefined,
    flexShrink: shrink === undefined ? undefined : shrink ? 1 : 0,
    ...style,
  };

  return (
    <Tag ref={ref} className={className} style={computed} {...props}>
      {children}
    </Tag>
  );
});
