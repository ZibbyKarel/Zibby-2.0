import { forwardRef, type ElementType, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';

export type StackDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export type StackProps = HTMLAttributes<HTMLDivElement> & {
  direction?: StackDirection;
  align?: StackAlign;
  justify?: StackJustify;
  /** Spacing between children. Numbers are interpreted as px. */
  gap?: number | string;
  wrap?: boolean;
  inline?: boolean;
  /** Whether the stack should be flex-grow:1 inside a flex parent. */
  grow?: boolean;
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
    gap: typeof gap === 'number' ? `${gap}px` : gap,
    flexWrap: wrap ? 'wrap' : undefined,
    flexGrow: grow ? 1 : undefined,
    ...style,
  };

  return (
    <Tag ref={ref} className={className} style={computed} {...props}>
      {children}
    </Tag>
  );
});
