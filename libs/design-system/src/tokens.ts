/**
 * Design tokens consumed by every design-system component.
 *
 * Values are raw — colors are hex / rgba strings, sizes are px/em — so
 * the design system has zero implicit dependency on global CSS. The
 * `DesignSystemProvider` chooses between {@link defaultDarkTokens} and
 * {@link defaultLightTokens} based on its `theme` prop, then emits the
 * matching CSS custom properties on its wrapping element so existing
 * components that still read `var(--xyz)` continue to resolve. Override
 * any path with `<DesignSystemProvider tokens={...}>`; read merged values
 * via `useTokens()` / `useStatusTokens(...)` / `useChipTokens(...)`.
 *
 * Concrete theme values live in {@link ./themes/darkTheme} and
 * {@link ./themes/lightTheme}.
 */

export type Theme = 'dark' | 'light';

/**
 * Abstract spacing scale. Each token maps to a fixed px value:
 * token / 12.5 = px  (e.g. '25' → 2px, '100' → 8px, '500' → 40px).
 * Fine-grained quarter-steps exist up to 100; above that only half-steps (50
 * apart) to keep the scale from exploding.
 */
export type Spacing =
  | '0'
  | '25' | '50' | '75' | '100'
  | '150' | '200' | '250' | '300' | '350' | '400' | '450' | '500';

const SPACING_PX: Record<Spacing, string> = {
  '0':   '0px',
  '25':  '2px',
  '50':  '4px',
  '75':  '6px',
  '100': '8px',
  '150': '12px',
  '200': '16px',
  '250': '20px',
  '300': '24px',
  '350': '28px',
  '400': '32px',
  '450': '36px',
  '500': '40px',
};

/** Converts a Spacing token to its pixel string (e.g. '150' → '12px'). */
export function spacingToPx(token: Spacing): string {
  return SPACING_PX[token];
}

/**
 * Padding value accepted by surface components (Card, Accordion, Container).
 * Either a single spacing token (applied to all sides) or a CSS-shorthand-style
 * spacing tuple:
 * - `[v, h]` → top/bottom = v, left/right = h
 * - `[t, r, b, l]` → top, right, bottom, left
 */
export type Padding =
  | Spacing
  | [Spacing, Spacing]
  | [Spacing, Spacing, Spacing, Spacing];

/** Normalises any {@link Padding} value to a `[top, right, bottom, left]` tuple. */
export function resolvePadding(padding: Padding): [Spacing, Spacing, Spacing, Spacing] {
  if (typeof padding === 'string') {
    return [padding, padding, padding, padding];
  }
  return padding.length === 2 ? [padding[0], padding[1], padding[0], padding[1]] : padding;
}

/**
 * Shared t-shirt size scale for sizeable components (Button, IconButton, Chip, …).
 * Components narrow this with `Extract<Size, …>` to advertise the subset they support.
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ColorTokens = {
  text: { primary: string; secondary: string; tertiary: string; muted: string };
  bg:   { canvas: string; surface: string; elevated: string; raised: string; hover: string };
  border: { default: string; strong: string };
  accent: { emerald: string; rose: string; amber: string; sky: string; violet: string };
  surface: { accentSoft: string; accentRing: string };
};

export type SizeTokens = {
  radius:   string;
  radiusSm: string;
  shadowSm: string;
  shadowLg: string;
};

export type FontTokens = {
  sans: string;
  mono: string;
};

export type StatusKey =
  | 'pending'
  | 'blocked'
  | 'running'
  | 'pushing'
  | 'review'
  | 'done'
  | 'failed'
  | 'cancelled'
  | 'interrupted'
  | 'conflict'
  | 'merging'
  | 'merged';

export type StatusPalette = {
  /** Foreground (label) color. */
  color: string;
  /** Background fill. */
  bg: string;
  /** Leading dot color. */
  dot: string;
  /** Whether the dot should pulse by default. */
  pulse?: boolean;
  /** Default human-readable label. */
  label: string;
};

export type StatusTokens = Record<StatusKey, StatusPalette>;

export type ChipToneKey = 'neutral' | 'accent' | 'violet' | 'warn' | 'sky' | 'rose';

export type ChipTonePalette = {
  color: string;
  bg: string;
  border: string;
};

export type ChipToneTokens = Record<ChipToneKey, ChipTonePalette>;

export type DesignTokens = {
  color:  ColorTokens;
  size:   SizeTokens;
  font:   FontTokens;
  status: StatusTokens;
  chip:   ChipToneTokens;
};

import { darkTheme }  from './themes/darkTheme';
import { lightTheme } from './themes/lightTheme';

export const defaultDarkTokens:  DesignTokens = darkTheme;
export const defaultLightTokens: DesignTokens = lightTheme;

/** Default tokens for the dark theme. Kept for backwards compatibility. */
export const defaultTokens: DesignTokens = defaultDarkTokens;

export const defaultColorTokens:     ColorTokens     = defaultDarkTokens.color;
export const defaultSizeTokens:      SizeTokens      = defaultDarkTokens.size;
export const defaultFontTokens:      FontTokens      = defaultDarkTokens.font;
export const defaultStatusTokens:    StatusTokens    = defaultDarkTokens.status;
export const defaultChipToneTokens:  ChipToneTokens  = defaultDarkTokens.chip;

export function tokensForTheme(theme: Theme): DesignTokens {
  return theme === 'light' ? defaultLightTokens : defaultDarkTokens;
}

/**
 * Maps token paths to CSS-variable names emitted by `DesignSystemProvider`.
 * Components that already use `var(--bg-canvas)`/`var(--emerald)`/etc resolve
 * against these provider-scoped variables — no globally-defined `:root`
 * declaration required.
 */
export function tokensToCssVars(t: DesignTokens): Record<string, string> {
  return {
    '--text-primary':   t.color.text.primary,
    '--text-secondary': t.color.text.secondary,
    '--text-tertiary':  t.color.text.tertiary,
    '--text-muted':     t.color.text.muted,
    '--bg-canvas':      t.color.bg.canvas,
    '--bg-surface':     t.color.bg.surface,
    '--bg-elevated':    t.color.bg.elevated,
    '--bg-raised':      t.color.bg.raised,
    '--bg-hover':       t.color.bg.hover,
    '--border':         t.color.border.default,
    '--border-strong':  t.color.border.strong,
    '--emerald':        t.color.accent.emerald,
    '--rose':           t.color.accent.rose,
    '--amber':          t.color.accent.amber,
    '--sky':            t.color.accent.sky,
    '--violet':         t.color.accent.violet,
    '--accent':         t.color.accent.emerald,
    '--accent-soft':    t.color.surface.accentSoft,
    '--accent-ring':    t.color.surface.accentRing,
    '--radius':         t.size.radius,
    '--radius-sm':      t.size.radiusSm,
    '--shadow-sm':      t.size.shadowSm,
    '--shadow-lg':      t.size.shadowLg,
    '--sans':           t.font.sans,
    '--mono':           t.font.mono,
  };
}

/** Deep-merges a partial token override on top of a base set. */
export function mergeTokens(base: DesignTokens, override?: PartialDesignTokens): DesignTokens {
  if (!override) return base;
  return {
    color: {
      text:    { ...base.color.text,    ...override.color?.text },
      bg:      { ...base.color.bg,      ...override.color?.bg },
      border:  { ...base.color.border,  ...override.color?.border },
      accent:  { ...base.color.accent,  ...override.color?.accent },
      surface: { ...base.color.surface, ...override.color?.surface },
    },
    size:   { ...base.size,   ...override.size },
    font:   { ...base.font,   ...override.font },
    status: mergeRecord(base.status, override.status),
    chip:   mergeRecord(base.chip,   override.chip),
  };
}

function mergeRecord<K extends string, V>(
  base: Record<K, V>,
  override?: Partial<Record<K, Partial<V>>>,
): Record<K, V> {
  if (!override) return base;
  const out = { ...base };
  for (const key of Object.keys(override) as K[]) {
    const patch = override[key];
    if (patch) out[key] = { ...base[key], ...patch } as V;
  }
  return out;
}

export type PartialDesignTokens = {
  color?: {
    text?:    Partial<ColorTokens['text']>;
    bg?:      Partial<ColorTokens['bg']>;
    border?:  Partial<ColorTokens['border']>;
    accent?:  Partial<ColorTokens['accent']>;
    surface?: Partial<ColorTokens['surface']>;
  };
  size?:   Partial<SizeTokens>;
  font?:   Partial<FontTokens>;
  status?: Partial<Record<StatusKey, Partial<StatusPalette>>>;
  chip?:   Partial<Record<ChipToneKey, Partial<ChipTonePalette>>>;
};
