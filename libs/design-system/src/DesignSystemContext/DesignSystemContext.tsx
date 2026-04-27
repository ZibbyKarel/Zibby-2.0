import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from 'react';
import '../styles.css';
import {
  defaultTokens,
  mergeTokens,
  tokensForTheme,
  tokensToCssVars,
  type ChipToneKey,
  type ChipTonePalette,
  type DesignTokens,
  type PartialDesignTokens,
  type StatusKey,
  type StatusPalette,
  type Theme,
} from '../tokens';

const DesignSystemContext = createContext<DesignTokens>(defaultTokens);

export type DesignSystemProviderProps = {
  /**
   * Built-in theme. Switches the palette between dark (default) and light.
   * Custom palettes can be layered on via `tokens`.
   */
  theme?: Theme;
  /**
   * Partial token override. Anything you omit falls back to the built-in
   * default — so most consumers only set the handful of accents they care about.
   */
  tokens?: PartialDesignTokens;
  /**
   * When `'column'` (the typical case for app shells) the provider's wrapping
   * element is a flex column with `min-height: 100%`. When `'row'` it's a
   * flex row. When `'block'` (default) the wrapper has no flex layout.
   */
  layout?: 'column' | 'row' | 'block';
  /** Extra class name appended to the wrapping element. */
  className?: string;
  /** Inline styles forwarded to the wrapping element. */
  style?: CSSProperties;
  children: ReactNode;
};

export function DesignSystemProvider({
  theme = 'dark',
  tokens,
  layout = 'block',
  className,
  style,
  children,
}: DesignSystemProviderProps) {
  const merged = useMemo(() => mergeTokens(tokensForTheme(theme), tokens), [theme, tokens]);
  const cssVars = useMemo(() => tokensToCssVars(merged), [merged]);
  const layoutStyle = useMemo<CSSProperties>(() => {
    if (layout === 'column') return { display: 'flex', flexDirection: 'column', minHeight: '100%' };
    if (layout === 'row')    return { display: 'flex', flexDirection: 'row',    minHeight: '100%' };
    return {};
  }, [layout]);
  const wrapperStyle = useMemo(
    () => ({ ...cssVars, ...layoutStyle, ...style }) as CSSProperties,
    [cssVars, layoutStyle, style],
  );
  const wrapperClass = ['ds-root', className].filter(Boolean).join(' ');

  return (
    <DesignSystemContext.Provider value={merged}>
      <div className={wrapperClass} data-theme={theme} style={wrapperStyle}>
        {children}
      </div>
    </DesignSystemContext.Provider>
  );
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

/** Returns the font tokens (sans/mono). */
export function useFontTokens() {
  return useTokens().font;
}
