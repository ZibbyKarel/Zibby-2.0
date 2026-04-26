import {
  forwardRef,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { useTokens } from './DesignSystemContext';

export type TextSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type TextTone =
  | 'default'   // text.0
  | 'muted'     // text.1
  | 'subtle'    // text.2
  | 'faint'     // text.3
  | 'inverse'   // bg.0 — for use on accent/light backgrounds
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'sky'
  | 'violet'
  | 'inherit';
export type TextTransform = 'none' | 'uppercase';
export type TextTracking = 'normal' | 'tight' | 'wide' | 'wider';
export type TextAlign = 'start' | 'center' | 'end' | 'justify';
export type TextWhitespace = 'normal' | 'pre' | 'pre-wrap' | 'pre-line' | 'nowrap' | 'break-word';

export type TextProps = Omit<HTMLAttributes<HTMLElement>, 'color'> & {
  /** Token-driven font size. */
  size?: TextSize;
  /** Font weight. Defaults to `normal`. */
  weight?: TextWeight;
  /** Token-driven color. Defaults to `default`. */
  tone?: TextTone;
  /** Use the mono font family. */
  mono?: boolean;
  /** Letter-spacing preset. */
  tracking?: TextTracking;
  /** Text transform. */
  transform?: TextTransform;
  /** Text alignment. */
  align?: TextAlign;
  /** Single-line ellipsis truncation. */
  truncate?: boolean;
  /** Multi-line clamp (CSS `-webkit-line-clamp`). Wins over `truncate`. */
  lineClamp?: number;
  /** Tabular numerals for tables/clocks. */
  tabular?: boolean;
  /** Italic font style. */
  italic?: boolean;
  /** White-space handling. Wins over `truncate`'s implicit `nowrap`. */
  whitespace?: TextWhitespace;
  /** Render as a different HTML element. Defaults to `span`. */
  as?: ElementType;
  children?: ReactNode;
};

const sizeMap: Record<TextSize, number> = {
  xxs: 9,
  xs:  11,
  sm:  12,
  md:  13,
  lg:  15,
  xl:  18,
};

const weightMap: Record<TextWeight, number> = {
  normal:    400,
  medium:    500,
  semibold:  600,
  bold:      700,
};

const trackingMap: Record<TextTracking, string | undefined> = {
  normal: undefined,
  tight:  '-.01em',
  wide:   '.08em',
  wider:  '.14em',
};

/**
 * Token-driven text primitive. Replaces hand-rolled `<span style={{…}}>`
 * snippets in app code with semantic props (`size`, `tone`, `mono`, …).
 */
export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  {
    size = 'md',
    weight = 'normal',
    tone = 'default',
    mono,
    tracking,
    transform,
    align,
    truncate,
    lineClamp,
    tabular,
    italic,
    whitespace,
    as,
    style,
    className = '',
    children,
    ...rest
  },
  ref,
) {
  const tokens = useTokens();
  const Tag = (as ?? 'span') as ElementType;

  const color = (() => {
    switch (tone) {
      case 'default': return tokens.color.text[0];
      case 'muted':   return tokens.color.text[1];
      case 'subtle':  return tokens.color.text[2];
      case 'faint':   return tokens.color.text[3];
      case 'inverse': return tokens.color.bg[0];
      case 'emerald': return tokens.color.accent.emerald;
      case 'rose':    return tokens.color.accent.rose;
      case 'amber':   return tokens.color.accent.amber;
      case 'sky':     return tokens.color.accent.sky;
      case 'violet':  return tokens.color.accent.violet;
      case 'inherit': return undefined;
    }
  })();

  const computed: CSSProperties = {
    fontSize:    `${sizeMap[size]}px`,
    fontWeight:  weightMap[weight],
    color,
    fontFamily:  mono ? tokens.font.mono : undefined,
    letterSpacing: tracking ? trackingMap[tracking] : undefined,
    textTransform: transform === 'uppercase' ? 'uppercase' : undefined,
    textAlign:   align === 'start' ? 'left' : align === 'end' ? 'right' : align,
    fontVariantNumeric: tabular ? 'tabular-nums' : undefined,
    fontStyle:    italic ? 'italic' : undefined,
    overflow:     truncate || lineClamp ? 'hidden' : undefined,
    textOverflow: truncate ? 'ellipsis' : undefined,
    whiteSpace:   whitespace === 'break-word' ? 'normal' : whitespace ?? (truncate ? 'nowrap' : undefined),
    wordBreak:    whitespace === 'break-word' ? 'break-word' : undefined,
    display:      lineClamp ? '-webkit-box' : undefined,
    WebkitLineClamp: lineClamp,
    WebkitBoxOrient: lineClamp ? 'vertical' : undefined,
    ...style,
  };

  return (
    <Tag ref={ref} className={className} style={computed} {...rest}>
      {children}
    </Tag>
  );
});
