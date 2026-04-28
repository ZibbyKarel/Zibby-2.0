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
 * Shared t-shirt size scale for sizeable components (Button, IconButton, Chip, …).
 * Components narrow this with `Extract<Size, …>` to advertise the subset they support.
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ColorTokens = {
  text: { 0: string; 1: string; 2: string; 3: string };
  bg:   { 0: string; 1: string; 2: string; 3: string; hover: string };
  border: { default: string; strong: string };
  accent: { emerald: string; rose: string; amber: string; sky: string; violet: string };
  surface: { accentSoft: string; accentRing: string };
};

export type SizeTokens = {
  radius:   string;
  radiusSm: string;
  shadow1:  string;
  shadow2:  string;
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

const FONT_SANS = "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

const SHARED_SIZE: SizeTokens = {
  radius:   '10px',
  radiusSm: '6px',
  shadow1:  '0 1px 2px rgba(0,0,0,.35)',
  shadow2:  '0 8px 24px rgba(0,0,0,.45)',
};

const SHARED_SIZE_LIGHT: SizeTokens = {
  ...SHARED_SIZE,
  shadow1: '0 1px 2px rgba(0,0,0,.06)',
  shadow2: '0 12px 28px rgba(0,0,0,.10)',
};

const SHARED_FONT: FontTokens = { sans: FONT_SANS, mono: FONT_MONO };

const DARK_COLOR: ColorTokens = {
  text: { 0: '#e6e8ec', 1: '#b4b8c2', 2: '#7a8090', 3: '#555a66' },
  bg:   { 0: '#0a0b0d', 1: '#0f1114', 2: '#151820', 3: '#1b1f28', hover: '#1e222c' },
  border: { default: '#22262f', strong: '#2d323d' },
  accent: { emerald: '#10b981', rose: '#f43f5e', amber: '#f59e0b', sky: '#38bdf8', violet: '#a78bfa' },
  surface: { accentSoft: 'rgba(16, 185, 129, 0.12)', accentRing: 'rgba(16, 185, 129, 0.35)' },
};

// In light mode the brand accent shifts from emerald to amber ("DayCoder").
const LIGHT_COLOR: ColorTokens = {
  text: { 0: '#0e0f12', 1: '#3a3e48', 2: '#6b7280', 3: '#9aa0ac' },
  bg:   { 0: '#f6f6f4', 1: '#ffffff', 2: '#fafaf8', 3: '#f0f0ec', hover: '#ececea' },
  border: { default: '#e6e6e2', strong: '#d4d4d0' },
  accent: { emerald: '#f59e0b', rose: '#f43f5e', amber: '#f59e0b', sky: '#38bdf8', violet: '#a78bfa' },
  surface: { accentSoft: 'rgba(245, 158, 11, 0.14)', accentRing: 'rgba(245, 158, 11, 0.4)' },
};

function statusFor(c: ColorTokens): StatusTokens {
  return {
    pending:     { label: 'pending',     color: c.text[2],    bg: c.bg[3],                 dot: c.text[3] },
    blocked:     { label: 'blocked',     color: c.text[2],    bg: c.bg[3],                 dot: c.text[3] },
    running:     { label: 'running',     color: c.accent.emerald, bg: 'rgba(16,185,129,.12)',  dot: c.accent.emerald, pulse: true },
    pushing:     { label: 'pushing',     color: c.accent.sky,     bg: 'rgba(56,189,248,.12)',  dot: c.accent.sky,     pulse: true },
    review:      { label: 'review',      color: c.accent.violet,  bg: 'rgba(167,139,250,.12)', dot: c.accent.violet },
    done:        { label: 'done',        color: c.accent.emerald, bg: 'rgba(16,185,129,.10)',  dot: c.accent.emerald },
    failed:      { label: 'failed',      color: c.accent.rose,    bg: 'rgba(244,63,94,.10)',   dot: c.accent.rose },
    cancelled:   { label: 'cancelled',   color: c.accent.amber,   bg: 'rgba(245,158,11,.10)',  dot: c.accent.amber },
    interrupted: { label: 'interrupted', color: c.accent.amber,   bg: 'rgba(245,158,11,.12)',  dot: c.accent.amber,   pulse: true },
    conflict:    { label: 'conflict',    color: c.accent.rose,    bg: 'rgba(244,63,94,.12)',   dot: c.accent.rose,    pulse: true },
    merging:     { label: 'merging',     color: c.accent.sky,     bg: 'rgba(56,189,248,.12)',  dot: c.accent.sky,     pulse: true },
    merged:      { label: 'merged',      color: c.accent.emerald, bg: 'rgba(16,185,129,.10)',  dot: c.accent.emerald },
  };
}

function chipFor(c: ColorTokens): ChipToneTokens {
  return {
    neutral: { color: c.text[1],        bg: c.bg[3],                  border: c.border.default        },
    accent:  { color: c.accent.emerald, bg: 'rgba(16,185,129,.08)',   border: 'rgba(16,185,129,.25)'  },
    violet:  { color: c.accent.violet,  bg: 'rgba(167,139,250,.10)',  border: 'rgba(167,139,250,.25)' },
    warn:    { color: c.accent.amber,   bg: 'rgba(245,158,11,.10)',   border: 'rgba(245,158,11,.25)'  },
    sky:     { color: c.accent.sky,     bg: 'rgba(56,189,248,.10)',   border: 'rgba(56,189,248,.25)'  },
    rose:    { color: c.accent.rose,    bg: 'rgba(244,63,94,.10)',    border: 'rgba(244,63,94,.25)'   },
  };
}

export const defaultDarkTokens: DesignTokens = {
  color:  DARK_COLOR,
  size:   SHARED_SIZE,
  font:   SHARED_FONT,
  status: statusFor(DARK_COLOR),
  chip:   chipFor(DARK_COLOR),
};

export const defaultLightTokens: DesignTokens = {
  color:  LIGHT_COLOR,
  size:   SHARED_SIZE_LIGHT,
  font:   SHARED_FONT,
  status: statusFor(LIGHT_COLOR),
  chip:   chipFor(LIGHT_COLOR),
};

/** Default tokens for the dark theme. Kept for backwards compatibility. */
export const defaultTokens: DesignTokens = defaultDarkTokens;

export const defaultColorTokens: ColorTokens = defaultDarkTokens.color;
export const defaultSizeTokens:  SizeTokens   = defaultDarkTokens.size;
export const defaultFontTokens:  FontTokens   = defaultDarkTokens.font;
export const defaultStatusTokens: StatusTokens = defaultDarkTokens.status;
export const defaultChipToneTokens: ChipToneTokens = defaultDarkTokens.chip;

export function tokensForTheme(theme: Theme): DesignTokens {
  return theme === 'light' ? defaultLightTokens : defaultDarkTokens;
}

/**
 * Maps token paths to CSS-variable names emitted by `DesignSystemProvider`.
 * Components that already use `var(--bg-0)`/`var(--emerald)`/etc resolve
 * against these provider-scoped variables — no globally-defined `:root`
 * declaration required.
 */
export function tokensToCssVars(t: DesignTokens): Record<string, string> {
  return {
    '--text-0': t.color.text[0],
    '--text-1': t.color.text[1],
    '--text-2': t.color.text[2],
    '--text-3': t.color.text[3],
    '--bg-0':   t.color.bg[0],
    '--bg-1':   t.color.bg[1],
    '--bg-2':   t.color.bg[2],
    '--bg-3':   t.color.bg[3],
    '--bg-hover': t.color.bg.hover,
    '--border':   t.color.border.default,
    '--border-2': t.color.border.strong,
    '--emerald':  t.color.accent.emerald,
    '--rose':     t.color.accent.rose,
    '--amber':    t.color.accent.amber,
    '--sky':      t.color.accent.sky,
    '--violet':   t.color.accent.violet,
    '--accent':       t.color.accent.emerald,
    '--accent-soft':  t.color.surface.accentSoft,
    '--accent-ring':  t.color.surface.accentRing,
    '--radius':    t.size.radius,
    '--radius-sm': t.size.radiusSm,
    '--shadow-1':  t.size.shadow1,
    '--shadow-2':  t.size.shadow2,
    '--sans': t.font.sans,
    '--mono': t.font.mono,
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
    size: { ...base.size, ...override.size },
    font: { ...base.font, ...override.font },
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
