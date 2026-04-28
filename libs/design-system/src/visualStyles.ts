/**
 * Token-driven helpers shared by visual primitives (Card, Button-surface) so
 * background/border/radius/shadow choices resolve to the same values in every
 * surface-shaped node. Container does NOT use these — its only token-adjacent
 * helper is `pxValue`, kept here for consistency.
 *
 * Helpers are pure functions of the token tree, so they're trivially testable
 * and don't introduce hook ordering constraints in the components that use them.
 */

import type { CSSProperties } from 'react';
import type { DesignTokens } from './tokens';

export type SurfaceBackground =
  | 'bg0'
  | 'bg1'
  | 'bg2'
  | 'bg3'
  | 'hover'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'sky'
  | 'violet'
  | 'emeraldTint'
  | 'roseTint'
  | 'amberTint'
  | 'skyTint'
  | 'violetTint'
  | 'accentSoft'
  | 'backdrop'
  | 'transparent';

export type SurfaceBorderTone =
  | 'default'
  | 'strong'
  | 'accent'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'sky'
  | 'violet';

export type SurfaceBorderEdges = {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
};

export type SurfaceRadius = 'none' | 'sm' | 'md' | 'pill';
export type SurfaceShadow = 'none' | '1' | '2';
export type SurfaceBorderStyle = 'solid' | 'dashed' | 'dotted';

/** Numeric values become `Npx`; strings pass through. Undefined stays undefined. */
export function pxValue(v: number | string | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
}

export function bgValue(
  background: SurfaceBackground | undefined,
  tokens: DesignTokens,
): string | undefined {
  switch (background) {
    case undefined:
    case 'transparent':
      return undefined;
    case 'bg0':
      return tokens.color.bg[0];
    case 'bg1':
      return tokens.color.bg[1];
    case 'bg2':
      return tokens.color.bg[2];
    case 'bg3':
      return tokens.color.bg[3];
    case 'hover':
      return tokens.color.bg.hover;
    case 'emerald':
      return tokens.color.accent.emerald;
    case 'rose':
      return tokens.color.accent.rose;
    case 'amber':
      return tokens.color.accent.amber;
    case 'sky':
      return tokens.color.accent.sky;
    case 'violet':
      return tokens.color.accent.violet;
    case 'emeraldTint':
      return 'rgba(16,185,129,.12)';
    case 'roseTint':
      return 'rgba(244,63,94,.12)';
    case 'amberTint':
      return 'rgba(245,158,11,.12)';
    case 'skyTint':
      return 'rgba(56,189,248,.12)';
    case 'violetTint':
      return 'rgba(167,139,250,.12)';
    case 'accentSoft':
      return tokens.color.surface.accentSoft;
    case 'backdrop':
      return 'rgba(0,0,0,.55)';
  }
}

export function borderColorValue(
  borderTone: SurfaceBorderTone,
  tokens: DesignTokens,
): string {
  switch (borderTone) {
    case 'default':
      return tokens.color.border.default;
    case 'strong':
      return tokens.color.border.strong;
    case 'accent':
    case 'emerald':
      return tokens.color.accent.emerald;
    case 'rose':
      return tokens.color.accent.rose;
    case 'amber':
      return tokens.color.accent.amber;
    case 'sky':
      return tokens.color.accent.sky;
    case 'violet':
      return tokens.color.accent.violet;
  }
}

export function radiusValue(
  radius: SurfaceRadius,
  tokens: DesignTokens,
): string | undefined {
  switch (radius) {
    case 'none':
      return undefined;
    case 'sm':
      return tokens.size.radiusSm;
    case 'md':
      return tokens.size.radius;
    case 'pill':
      return '999px';
  }
}

export function shadowValue(
  shadow: SurfaceShadow,
  tokens: DesignTokens,
): string | undefined {
  switch (shadow) {
    case 'none':
      return undefined;
    case '1':
      return tokens.size.shadow1;
    case '2':
      return tokens.size.shadow2;
  }
}

export type VisualStyleInput = {
  background?: SurfaceBackground;
  bordered?: boolean | SurfaceBorderEdges;
  borderTone?: SurfaceBorderTone;
  borderStyle?: SurfaceBorderStyle;
  radius?: SurfaceRadius;
  shadow?: SurfaceShadow;
};

/**
 * Compute the CSSProperties subset that a Card / Button-surface needs to
 * realise its visual treatment, given the merged token tree. Returns only
 * keys whose underlying prop is set (no `undefined` clobbers consumer styles).
 */
export function computeVisualStyle(
  input: VisualStyleInput,
  tokens: DesignTokens,
): CSSProperties {
  const {
    background,
    bordered,
    borderTone = 'default',
    borderStyle = 'solid',
    radius,
    shadow,
  } = input;

  const edges: SurfaceBorderEdges =
    bordered === true
      ? { top: true, bottom: true, left: true, right: true }
      : bordered === false || bordered === undefined
        ? {}
        : bordered;

  const anyEdge =
    edges.top || edges.bottom || edges.left || edges.right;

  const bg = bgValue(background, tokens);
  const out: CSSProperties = {};

  if (bg !== undefined) out.background = bg;
  if (edges.top) out.borderTopWidth = 1;
  if (edges.bottom) out.borderBottomWidth = 1;
  if (edges.left) out.borderLeftWidth = 1;
  if (edges.right) out.borderRightWidth = 1;
  if (anyEdge) {
    out.borderStyle = borderStyle;
    out.borderColor = borderColorValue(borderTone, tokens);
  }
  if (radius !== undefined) {
    const r = radiusValue(radius, tokens);
    if (r !== undefined) out.borderRadius = r;
  }
  if (shadow !== undefined) {
    const s = shadowValue(shadow, tokens);
    if (s !== undefined) out.boxShadow = s;
  }
  return out;
}
