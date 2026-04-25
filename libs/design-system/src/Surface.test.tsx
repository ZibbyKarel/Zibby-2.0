// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createRef } from 'react';
import { render } from '@testing-library/react';
import { Surface } from './Surface';
import { defaultDarkTokens } from './tokens';

// JSDOM normalises hex inline-style values to the equivalent `rgb(…)` form,
// so we compare via a tiny helper: render a span with the expected hex and
// reuse the normalised value for assertions.
function rgb(hex: string): string {
  const span = document.createElement('span');
  span.style.color = hex;
  return span.style.color;
}

describe('Surface', () => {
  it('renders a div by default with no inline styling beyond defaults', () => {
    const { container } = render(<Surface>x</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe('DIV');
    expect(el.style.background).toBe('');
    expect(el.style.padding).toBe('');
  });

  it('renders the requested element via the `as` prop', () => {
    const { container } = render(<Surface as="header">x</Surface>);
    expect((container.firstChild as HTMLElement).tagName).toBe('HEADER');
  });

  it('forwards refs', () => {
    const ref = createRef<HTMLElement>();
    render(<Surface ref={ref}>x</Surface>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it('maps background tokens onto the element', () => {
    const { container } = render(<Surface background="bg1">x</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.background).toBe(rgb(defaultDarkTokens.color.bg[1]));
  });

  it('maps padding shorthand to px on every edge', () => {
    const { container } = render(<Surface padding={12}>x</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.paddingTop).toBe('12px');
    expect(el.style.paddingRight).toBe('12px');
    expect(el.style.paddingBottom).toBe('12px');
    expect(el.style.paddingLeft).toBe('12px');
  });

  it('paddingX / paddingY split horizontal and vertical padding', () => {
    const { container } = render(<Surface paddingX={20} paddingY={14}>x</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.paddingLeft).toBe('20px');
    expect(el.style.paddingRight).toBe('20px');
    expect(el.style.paddingTop).toBe('14px');
    expect(el.style.paddingBottom).toBe('14px');
  });

  it('bordered=true sets a border on every edge', () => {
    const { container } = render(<Surface bordered>x</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.borderTopWidth).toBe('1px');
    expect(el.style.borderBottomWidth).toBe('1px');
    expect(el.style.borderLeftWidth).toBe('1px');
    expect(el.style.borderRightWidth).toBe('1px');
    expect(el.style.borderStyle).toBe('solid');
    expect(el.style.borderColor).toBe(rgb(defaultDarkTokens.color.border.default));
  });

  it('per-edge borders only set the requested sides', () => {
    const { container } = render(<Surface bordered={{ bottom: true }}>x</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.borderTopWidth).toBe('');
    expect(el.style.borderBottomWidth).toBe('1px');
    expect(el.style.borderLeftWidth).toBe('');
    expect(el.style.borderRightWidth).toBe('');
  });

  it('borderTone selects an accent color', () => {
    const { container } = render(<Surface bordered borderTone="rose">x</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.borderColor).toBe(rgb(defaultDarkTokens.color.accent.rose));
  });

  it('radius and shadow map to size tokens', () => {
    const { container } = render(<Surface radius="md" shadow="2">x</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.borderRadius).toBe(defaultDarkTokens.size.radius);
    expect(el.style.boxShadow).toBe(defaultDarkTokens.size.shadow2);
  });

  it('forwards arbitrary props (className, role, onClick)', () => {
    const { container } = render(
      <Surface className="custom" role="region" aria-label="region">x</Surface>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('custom');
    expect(el).toHaveAttribute('role', 'region');
    expect(el).toHaveAttribute('aria-label', 'region');
  });

  it('inline `style` overrides win over computed defaults', () => {
    const { container } = render(<Surface padding={4} style={{ paddingTop: '20px' }}>x</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.paddingTop).toBe('20px');
  });

  it('emeraldTint background renders the rgba tint', () => {
    const { container } = render(<Surface background="emeraldTint">x</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.background).toBe('rgba(16, 185, 129, 0.12)');
  });

  it('roseTint background renders the rgba tint', () => {
    const { container } = render(<Surface background="roseTint">x</Surface>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.background).toBe('rgba(244, 63, 94, 0.12)');
  });
});
