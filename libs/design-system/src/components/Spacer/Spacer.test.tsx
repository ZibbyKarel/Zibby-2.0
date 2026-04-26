// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Spacer } from './Spacer';

describe('Spacer', () => {
  it('renders a flex-grow div by default', () => {
    const { container } = render(<Spacer />);
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe('DIV');
    expect(el.style.flex).toBe('1 1 0%');
    expect(el).toHaveAttribute('aria-hidden');
  });

  it('uses size as a horizontal width', () => {
    const { container } = render(<Spacer axis="horizontal" size={12} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('12px');
    expect(el.style.flexShrink).toBe('0');
  });

  it('uses size as a vertical height', () => {
    const { container } = render(<Spacer axis="vertical" size={20} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.height).toBe('20px');
    expect(el.style.flexShrink).toBe('0');
  });

  it('uses size for both axes when axis="both"', () => {
    const { container } = render(<Spacer size={8} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('8px');
    expect(el.style.height).toBe('8px');
  });

  it('accepts string sizes (e.g. percentages)', () => {
    const { container } = render(<Spacer axis="horizontal" size="50%" />);
    expect((container.firstChild as HTMLElement).style.width).toBe('50%');
  });

  it('forwards arbitrary props (className, role)', () => {
    const { container } = render(<Spacer className="x" role="separator" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('x');
    expect(el).toHaveAttribute('role', 'separator');
  });

  it('inline `style` overrides win over computed defaults', () => {
    const { container } = render(<Spacer style={{ flex: '2 0 100px' }} />);
    expect((container.firstChild as HTMLElement).style.flex).toBe('2 0 100px');
  });
});
