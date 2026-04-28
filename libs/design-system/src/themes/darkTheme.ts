import type { DesignTokens, ColorTokens, SizeTokens } from '../tokens';
import { SHARED_FONT, statusFor, chipFor } from './helpers';

const DARK_COLOR: ColorTokens = {
  text:    { primary: '#e6e8ec', secondary: '#b4b8c2', tertiary: '#7a8090', muted: '#555a66' },
  bg:      { canvas: '#0a0b0d', surface: '#0f1114', elevated: '#151820', raised: '#1b1f28', hover: '#1e222c' },
  border:  { default: '#22262f', strong: '#2d323d' },
  accent:  { emerald: '#10b981', rose: '#f43f5e', amber: '#f59e0b', sky: '#38bdf8', violet: '#a78bfa' },
  surface: { accentSoft: 'rgba(16, 185, 129, 0.12)', accentRing: 'rgba(16, 185, 129, 0.35)' },
};

const DARK_SIZE: SizeTokens = {
  radius:   '10px',
  radiusSm: '6px',
  shadowSm: '0 1px 2px rgba(0,0,0,.35)',
  shadowLg: '0 8px 24px rgba(0,0,0,.45)',
};

export const darkTheme: DesignTokens = {
  color:  DARK_COLOR,
  size:   DARK_SIZE,
  font:   SHARED_FONT,
  status: statusFor(DARK_COLOR),
  chip:   chipFor(DARK_COLOR),
};
