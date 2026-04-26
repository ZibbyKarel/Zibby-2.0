// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders the supplied label', () => {
    render(<Badge label="custom" />);
    expect(screen.getByText('custom')).toBeInTheDocument();
  });

  it('falls back to the status name when no label is given', () => {
    render(<Badge status="running" />);
    expect(screen.getByText('running')).toBeInTheDocument();
  });

  it('renders the leading dot by default', () => {
    const { container } = render(<Badge status="done" />);
    const dot = container.querySelector('span[aria-hidden]');
    expect(dot).toBeTruthy();
  });

  it('hides the dot when dot=false', () => {
    const { container } = render(<Badge status="done" dot={false} />);
    expect(container.querySelector('span[aria-hidden]')).toBeNull();
  });

  it.each(['running', 'pushing', 'interrupted'] as const)(
    'pulses the dot for %s status by default',
    (s) => {
      const { container } = render(<Badge status={s} />);
      const dot = container.querySelector('span[aria-hidden]') as HTMLElement;
      expect(dot.style.animation).toContain('nc-badge-pulse');
    },
  );

  it('forces pulse when pulse=true', () => {
    const { container } = render(<Badge status="done" pulse />);
    const dot = container.querySelector('span[aria-hidden]') as HTMLElement;
    expect(dot.style.animation).toContain('nc-badge-pulse');
  });

  it.each([
    'pending',
    'blocked',
    'running',
    'pushing',
    'review',
    'done',
    'failed',
    'cancelled',
    'interrupted',
  ] as const)('supports the %s status', (s) => {
    render(<Badge status={s} />);
    expect(screen.getByText(s)).toBeInTheDocument();
  });

  it('applies custom color and background overrides', () => {
    render(<Badge label="x" color="hotpink" background="rebeccapurple" />);
    const node = screen.getByText('x');
    expect(node.style.color).toBe('hotpink');
    expect(node.style.background).toBe('rebeccapurple');
  });

  it('merges a consumer className', () => {
    render(<Badge label="x" className="extra-class" />);
    expect(screen.getByText('x').className).toContain('extra-class');
  });
});
