// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Text } from './Text';
import { defaultDarkTokens } from '../../tokens';

function rgb(hex: string): string {
  const span = document.createElement('span');
  span.style.color = hex;
  return span.style.color;
}

describe('Text', () => {
  it('renders a span by default', () => {
    render(<Text>hello</Text>);
    const el = screen.getByText('hello');
    expect(el.tagName).toBe('SPAN');
  });

  it('renders the requested element via the `as` prop', () => {
    render(<Text as="p">hello</Text>);
    expect(screen.getByText('hello').tagName).toBe('P');
  });

  it('forwards refs', () => {
    const ref = createRef<HTMLElement>();
    render(<Text ref={ref}>x</Text>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it('maps size and weight to inline styles', () => {
    render(
      <Text size="xs" weight="semibold">
        x
      </Text>,
    );
    const el = screen.getByText('x');
    expect(el.style.fontSize).toBe('11px');
    expect(el.style.fontWeight).toBe('600');
  });

  it('maps tone tokens onto color', () => {
    render(<Text tone="emerald">x</Text>);
    expect(screen.getByText('x').style.color).toBe(
      rgb(defaultDarkTokens.color.accent.emerald),
    );
  });

  it('switches to mono font when mono is set', () => {
    render(<Text mono>x</Text>);
    expect(screen.getByText('x').style.fontFamily).toContain('JetBrains Mono');
  });

  it('applies tracking, transform, and tabular numerals', () => {
    render(
      <Text tracking="wide" transform="uppercase" tabular>
        nightcoder
      </Text>,
    );
    const el = screen.getByText('nightcoder');
    expect(el.style.letterSpacing).toBe('0.08em');
    expect(el.style.textTransform).toBe('uppercase');
    expect(el.style.fontVariantNumeric).toBe('tabular-nums');
  });

  it('truncates with ellipsis when truncate is set', () => {
    render(<Text truncate>long…</Text>);
    const el = screen.getByText('long…');
    expect(el.style.overflow).toBe('hidden');
    expect(el.style.textOverflow).toBe('ellipsis');
    expect(el.style.whiteSpace).toBe('nowrap');
  });

  it('forwards arbitrary props (className, role, title)', () => {
    render(
      <Text className="x" role="note" title="t">
        y
      </Text>,
    );
    const el = screen.getByText('y');
    expect(el).toHaveClass('x');
    expect(el).toHaveAttribute('role', 'note');
    expect(el).toHaveAttribute('title', 't');
  });

  it('inline `style` overrides win over computed defaults', () => {
    render(
      <Text size="md" style={{ fontSize: '99px' }}>
        x
      </Text>,
    );
    expect(screen.getByText('x').style.fontSize).toBe('99px');
  });

  it('respects tone="inherit" (no color set)', () => {
    render(<Text tone="inherit">x</Text>);
    expect(screen.getByText('x').style.color).toBe('');
  });

  it('whitespace="pre" preserves whitespace literally', () => {
    render(<Text whitespace="pre">a b</Text>);
    expect(
      screen.getByText('a  b', { normalizer: (s) => s }).style.whiteSpace,
    ).toBe('pre');
  });

  it("whitespace overrides truncate's implicit nowrap", () => {
    render(
      <Text truncate whitespace="pre-wrap">
        a
      </Text>,
    );
    expect(screen.getByText('a').style.whiteSpace).toBe('pre-wrap');
  });

  it('whitespace="break-word" sets word-break: break-word', () => {
    render(<Text whitespace="break-word">x</Text>);
    expect(screen.getByText('x').style.wordBreak).toBe('break-word');
  });
});
