// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createRef } from 'react';
import { render } from '@testing-library/react';
import { Icon, IconName } from './Icon';

describe('Icon', () => {
  it('renders an SVG element', () => {
    const { container } = render(<Icon value={IconName.Check} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInstanceOf(SVGElement);
  });

  it('applies the requested size to width and height', () => {
    const { container } = render(<Icon value={IconName.Check} size={24} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.getAttribute('height')).toBe('24');
  });

  it('forwards strokeWidth to the underlying svg', () => {
    const { container } = render(<Icon value={IconName.Plus} strokeWidth={3} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('stroke-width')).toBe('3');
  });

  it('forwards the ref to the underlying svg', () => {
    const ref = createRef<SVGSVGElement>();
    const { container } = render(<Icon ref={ref} value={IconName.X} />);
    expect(ref.current).toBe(container.querySelector('svg'));
  });

  it('forwards arbitrary svg props (className, data-*)', () => {
    const { container } = render(
      <Icon value={IconName.Search} className="extra-class" data-testid="ic" />,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('class')).toContain('extra-class');
    expect(svg.getAttribute('data-testid')).toBe('ic');
  });

  it('renders aria-hidden by default', () => {
    const { container } = render(<Icon value={IconName.Bell} />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it.each(Object.values(IconName))('renders %s without throwing', (name) => {
    const { container } = render(<Icon value={name} />);
    expect(container.querySelector('svg')).toBeInstanceOf(SVGElement);
  });
});
