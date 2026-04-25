/**
 * Design tokens consumed by every design-system component.
 *
 * Values point at CSS custom properties defined in
 * `apps/desktop/src/renderer/index.css`, so they participate in light/dark
 * theme switching without runtime work. Override individual paths via the
 * `<DesignSystemProvider tokens={...}>` API and read the merged values from
 * `useTokens()` / `useStatusTokens(...)` / `useChipTokens(...)`.
 */

export type ColorTokens = {
  text: { 0: string; 1: string; 2: string; 3: string };
  bg:   { 0: string; 1: string; 2: string; 3: string; hover: string };
  border: { default: string; strong: string };
  accent: { emerald: string; rose: string; amber: string; sky: string; violet: string };
  surface: { accentSoft: string };
};

export type SizeTokens = {
  radius:   string;
  radiusSm: string;
  shadow1:  string;
  shadow2:  string;
};

export type FontTokens = {
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
  | 'interrupted';

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

export const defaultColorTokens: ColorTokens = {
  text: {
    0: 'var(--text-0)',
    1: 'var(--text-1)',
    2: 'var(--text-2)',
    3: 'var(--text-3)',
  },
  bg: {
    0: 'var(--bg-0)',
    1: 'var(--bg-1)',
    2: 'var(--bg-2)',
    3: 'var(--bg-3)',
    hover: 'var(--bg-hover)',
  },
  border: {
    default: 'var(--border)',
    strong:  'var(--border-2)',
  },
  accent: {
    emerald: 'var(--emerald)',
    rose:    'var(--rose)',
    amber:   'var(--amber)',
    sky:     'var(--sky)',
    violet:  'var(--violet)',
  },
  surface: {
    accentSoft: 'var(--accent-soft)',
  },
};

export const defaultSizeTokens: SizeTokens = {
  radius:   'var(--radius)',
  radiusSm: 'var(--radius-sm)',
  shadow1:  'var(--shadow-1)',
  shadow2:  'var(--shadow-2)',
};

export const defaultFontTokens: FontTokens = {
  mono: 'var(--mono)',
};

export const defaultStatusTokens: StatusTokens = {
  pending:     { label: 'pending',     color: 'var(--text-2)',  bg: 'var(--bg-3)',           dot: 'var(--text-3)' },
  blocked:     { label: 'blocked',     color: 'var(--text-2)',  bg: 'var(--bg-3)',           dot: 'var(--text-3)' },
  running:     { label: 'running',     color: 'var(--emerald)', bg: 'rgba(16,185,129,.12)',  dot: 'var(--emerald)', pulse: true },
  pushing:     { label: 'pushing',     color: 'var(--sky)',     bg: 'rgba(56,189,248,.12)',  dot: 'var(--sky)',     pulse: true },
  review:      { label: 'review',      color: 'var(--violet)',  bg: 'rgba(167,139,250,.12)', dot: 'var(--violet)' },
  done:        { label: 'done',        color: 'var(--emerald)', bg: 'rgba(16,185,129,.10)',  dot: 'var(--emerald)' },
  failed:      { label: 'failed',      color: 'var(--rose)',    bg: 'rgba(244,63,94,.10)',   dot: 'var(--rose)' },
  cancelled:   { label: 'cancelled',   color: 'var(--amber)',   bg: 'rgba(245,158,11,.10)',  dot: 'var(--amber)' },
  interrupted: { label: 'interrupted', color: 'var(--amber)',   bg: 'rgba(245,158,11,.12)',  dot: 'var(--amber)',   pulse: true },
};

export const defaultChipToneTokens: ChipToneTokens = {
  neutral: { color: 'var(--text-1)',   bg: 'var(--bg-3)',               border: 'var(--border)'         },
  accent:  { color: 'var(--emerald)',  bg: 'rgba(16,185,129,.08)',      border: 'rgba(16,185,129,.25)'  },
  violet:  { color: 'var(--violet)',   bg: 'rgba(167,139,250,.10)',     border: 'rgba(167,139,250,.25)' },
  warn:    { color: 'var(--amber)',    bg: 'rgba(245,158,11,.10)',      border: 'rgba(245,158,11,.25)'  },
  sky:     { color: 'var(--sky)',      bg: 'rgba(56,189,248,.10)',      border: 'rgba(56,189,248,.25)'  },
  rose:    { color: 'var(--rose)',     bg: 'rgba(244,63,94,.10)',       border: 'rgba(244,63,94,.25)'   },
};

export const defaultTokens: DesignTokens = {
  color:  defaultColorTokens,
  size:   defaultSizeTokens,
  font:   defaultFontTokens,
  status: defaultStatusTokens,
  chip:   defaultChipToneTokens,
};

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
