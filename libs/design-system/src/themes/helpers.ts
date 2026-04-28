import type { ColorTokens, StatusTokens, ChipToneTokens, FontTokens } from '../tokens';

export const FONT_SANS = "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
export const FONT_MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

export const SHARED_FONT: FontTokens = { sans: FONT_SANS, mono: FONT_MONO };

export function statusFor(c: ColorTokens): StatusTokens {
  return {
    pending:     { label: 'pending',     color: c.text.tertiary,  bg: c.bg.raised,             dot: c.text.muted },
    blocked:     { label: 'blocked',     color: c.text.tertiary,  bg: c.bg.raised,             dot: c.text.muted },
    running:     { label: 'running',     color: c.accent.emerald, bg: 'rgba(16,185,129,.12)',   dot: c.accent.emerald, pulse: true },
    pushing:     { label: 'pushing',     color: c.accent.sky,     bg: 'rgba(56,189,248,.12)',   dot: c.accent.sky,     pulse: true },
    review:      { label: 'review',      color: c.accent.violet,  bg: 'rgba(167,139,250,.12)',  dot: c.accent.violet },
    done:        { label: 'done',        color: c.accent.emerald, bg: 'rgba(16,185,129,.10)',   dot: c.accent.emerald },
    failed:      { label: 'failed',      color: c.accent.rose,    bg: 'rgba(244,63,94,.10)',    dot: c.accent.rose },
    cancelled:   { label: 'cancelled',   color: c.accent.amber,   bg: 'rgba(245,158,11,.10)',   dot: c.accent.amber },
    interrupted: { label: 'interrupted', color: c.accent.amber,   bg: 'rgba(245,158,11,.12)',   dot: c.accent.amber,   pulse: true },
    conflict:    { label: 'conflict',    color: c.accent.rose,    bg: 'rgba(244,63,94,.12)',    dot: c.accent.rose,    pulse: true },
    merging:     { label: 'merging',     color: c.accent.sky,     bg: 'rgba(56,189,248,.12)',   dot: c.accent.sky,     pulse: true },
    merged:      { label: 'merged',      color: c.accent.emerald, bg: 'rgba(16,185,129,.10)',   dot: c.accent.emerald },
  };
}

export function chipFor(c: ColorTokens): ChipToneTokens {
  return {
    neutral: { color: c.text.secondary, bg: c.bg.raised,             border: c.border.default        },
    accent:  { color: c.accent.emerald, bg: 'rgba(16,185,129,.08)',  border: 'rgba(16,185,129,.25)'  },
    violet:  { color: c.accent.violet,  bg: 'rgba(167,139,250,.10)', border: 'rgba(167,139,250,.25)' },
    warn:    { color: c.accent.amber,   bg: 'rgba(245,158,11,.10)',  border: 'rgba(245,158,11,.25)'  },
    sky:     { color: c.accent.sky,     bg: 'rgba(56,189,248,.10)',  border: 'rgba(56,189,248,.25)'  },
    rose:    { color: c.accent.rose,    bg: 'rgba(244,63,94,.10)',   border: 'rgba(244,63,94,.25)'   },
  };
}
