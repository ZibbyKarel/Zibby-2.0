import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  defaultTokens,
  mergeTokens,
  type ChipToneKey,
  type ChipTonePalette,
  type DesignTokens,
  type PartialDesignTokens,
  type StatusKey,
  type StatusPalette,
} from './tokens';

const DesignSystemContext = createContext<DesignTokens>(defaultTokens);

export type DesignSystemProviderProps = {
  /**
   * Partial token override. Anything you omit falls back to the built-in
   * default — so most consumers only set the handful of accents they care about.
   */
  tokens?: PartialDesignTokens;
  children: ReactNode;
};

export function DesignSystemProvider({ tokens, children }: DesignSystemProviderProps) {
  const merged = useMemo(() => mergeTokens(defaultTokens, tokens), [tokens]);
  return <DesignSystemContext.Provider value={merged}>{children}</DesignSystemContext.Provider>;
}

/** Returns the full merged design-token tree. */
export function useTokens(): DesignTokens {
  return useContext(DesignSystemContext);
}

/** Returns the four-color text palette (`text.0` … `text.3`). */
export function useTextColors() {
  return useTokens().color.text;
}

/** Returns the accent (semantic) color palette. */
export function useAccentColors() {
  return useTokens().color.accent;
}

/** Returns the palette (color / bg / dot / pulse / label) for a story status. */
export function useStatusTokens(status: StatusKey): StatusPalette {
  return useTokens().status[status];
}

/** Returns the palette (color / bg / border) for a chip tone. */
export function useChipTokens(tone: ChipToneKey): ChipTonePalette {
  return useTokens().chip[tone];
}

/** Returns the radii / shadow tokens. */
export function useSizeTokens() {
  return useTokens().size;
}
