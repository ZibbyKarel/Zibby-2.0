import type { DesignTokens, ColorTokens, SizeTokens } from '../tokens';
import { SHARED_FONT, statusFor, chipFor } from './helpers';

// In light mode the brand accent shifts from emerald to amber ("DayCoder").
const LIGHT_COLOR: ColorTokens = {
  text:    { primary: '#0e0f12', secondary: '#3a3e48', tertiary: '#6b7280', muted: '#9aa0ac' },
  bg:      { canvas: '#f6f6f4', surface: '#ffffff', elevated: '#fafaf8', raised: '#f0f0ec', hover: '#ececea' },
  border:  { default: '#e6e6e2', strong: '#d4d4d0' },
  accent:  { emerald: '#f59e0b', rose: '#f43f5e', amber: '#f59e0b', sky: '#38bdf8', violet: '#a78bfa' },
  surface: { accentSoft: 'rgba(245, 158, 11, 0.14)', accentRing: 'rgba(245, 158, 11, 0.4)' },
};

const LIGHT_SIZE: SizeTokens = {
  radius:   '10px',
  radiusSm: '6px',
  shadowSm: '0 1px 2px rgba(0,0,0,.06)',
  shadowLg: '0 12px 28px rgba(0,0,0,.10)',
};

export const lightTheme: DesignTokens = {
  color:  LIGHT_COLOR,
  size:   LIGHT_SIZE,
  font:   SHARED_FONT,
  status: statusFor(LIGHT_COLOR),
  chip:   chipFor(LIGHT_COLOR),
};
