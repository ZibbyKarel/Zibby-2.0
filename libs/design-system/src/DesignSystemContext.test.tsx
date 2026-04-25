// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DesignSystemProvider,
  useAccentColors,
  useChipTokens,
  useSizeTokens,
  useStatusTokens,
  useTextColors,
  useTokens,
} from './DesignSystemContext';
import { defaultTokens } from './tokens';

function Probe({ get }: { get: () => unknown }) {
  return <span data-testid="p">{JSON.stringify(get())}</span>;
}

describe('DesignSystemContext', () => {
  it('useTokens returns the default tree without a provider', () => {
    render(<Probe get={useTokens} />);
    expect(JSON.parse(screen.getByTestId('p').textContent!)).toEqual(defaultTokens);
  });

  it('useTextColors returns text.0..3', () => {
    render(<Probe get={useTextColors} />);
    expect(JSON.parse(screen.getByTestId('p').textContent!)).toEqual(defaultTokens.color.text);
  });

  it('useAccentColors returns the accent palette', () => {
    render(<Probe get={useAccentColors} />);
    expect(JSON.parse(screen.getByTestId('p').textContent!)).toEqual(defaultTokens.color.accent);
  });

  it('useSizeTokens returns the size tokens', () => {
    render(<Probe get={useSizeTokens} />);
    expect(JSON.parse(screen.getByTestId('p').textContent!)).toEqual(defaultTokens.size);
  });

  it('useStatusTokens returns the palette for a given status', () => {
    function P() {
      const tokens = useStatusTokens('running');
      return <span data-testid="p">{tokens.color}</span>;
    }
    render(<P />);
    expect(screen.getByTestId('p')).toHaveTextContent('var(--emerald)');
  });

  it('useChipTokens returns the palette for a given tone', () => {
    function P() {
      const tokens = useChipTokens('violet');
      return <span data-testid="p">{tokens.color}</span>;
    }
    render(<P />);
    expect(screen.getByTestId('p')).toHaveTextContent('var(--violet)');
  });

  it('DesignSystemProvider deep-merges overrides on top of defaults', () => {
    function P() {
      const t = useTokens();
      return (
        <span data-testid="p">{`${t.color.accent.emerald}|${t.color.accent.rose}|${t.size.radius}`}</span>
      );
    }
    render(
      <DesignSystemProvider
        tokens={{
          color: { accent: { emerald: '#0f0' } },
          size: { radius: '4px' },
        }}
      >
        <P />
      </DesignSystemProvider>,
    );
    expect(screen.getByTestId('p').textContent).toBe(
      `#0f0|${defaultTokens.color.accent.rose}|4px`,
    );
  });

  it('DesignSystemProvider deep-merges status overrides', () => {
    function P() {
      const t = useStatusTokens('running');
      return <span data-testid="p">{`${t.color}|${t.label}|${t.pulse ? 'on' : 'off'}`}</span>;
    }
    render(
      <DesignSystemProvider tokens={{ status: { running: { color: '#abc' } } }}>
        <P />
      </DesignSystemProvider>,
    );
    expect(screen.getByTestId('p').textContent).toBe('#abc|running|on');
  });

  it('DesignSystemProvider deep-merges chip tone overrides', () => {
    function P() {
      const t = useChipTokens('accent');
      return <span data-testid="p">{`${t.color}|${t.bg}`}</span>;
    }
    render(
      <DesignSystemProvider tokens={{ chip: { accent: { color: '#0ff' } } }}>
        <P />
      </DesignSystemProvider>,
    );
    expect(screen.getByTestId('p').textContent).toBe(
      `#0ff|${defaultTokens.chip.accent.bg}`,
    );
  });

  it('omitted overrides leave defaults intact', () => {
    function P() {
      const t = useTokens();
      return <span data-testid="p">{t.color.bg[1]}</span>;
    }
    render(
      <DesignSystemProvider tokens={{}}>
        <P />
      </DesignSystemProvider>,
    );
    expect(screen.getByTestId('p').textContent).toBe(defaultTokens.color.bg[1]);
  });
});
