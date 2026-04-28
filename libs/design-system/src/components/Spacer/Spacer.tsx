import { type CSSProperties, type HTMLAttributes } from 'react';
import { spacingToPx, type Spacing } from '../../tokens';

export type SpacerAxis = 'horizontal' | 'vertical' | 'both';

export type SpacerProps = HTMLAttributes<HTMLDivElement> & {
  /** Direction the spacer expands along. Defaults to `both`. */
  axis?: SpacerAxis;
  /** Fixed size expressed as a design-system Spacing token. When omitted the spacer grows (`flex: 1`). */
  size?: Spacing;
};

/**
 * Empty box used to push siblings apart inside a flex container. Defaults to a
 * flex-grow spacer; pass `size` for a fixed gap.
 */
export function Spacer({ axis = 'both', size, style, ...props }: SpacerProps) {
  const computed: CSSProperties = (() => {
    if (size !== undefined) {
      const v = spacingToPx(size);
      switch (axis) {
        case 'horizontal': return { width: v, flexShrink: 0 };
        case 'vertical':   return { height: v, flexShrink: 0 };
        case 'both':       return { width: v, height: v, flexShrink: 0 };
      }
    }
    return { flex: 1 };
  })();
  return <div aria-hidden style={{ ...computed, ...style }} {...props} />;
}
