// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Divider } from './Divider';

describe('Divider', () => {
  it('renders a horizontal hr by default', () => {
    render(<Divider />);
    const sep = screen.getByRole('separator');
    expect(sep.tagName).toBe('HR');
    expect(sep).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('renders a vertical separator', () => {
    render(<Divider orientation="vertical" />);
    const sep = screen.getByRole('separator');
    expect(sep).toHaveAttribute('aria-orientation', 'vertical');
    expect((sep as HTMLElement).style.width).toBe('1px');
  });

  it('stretches vertical divider when flexItem is true', () => {
    render(<Divider orientation="vertical" flexItem />);
    expect((screen.getByRole('separator') as HTMLElement).style.alignSelf).toBe('stretch');
  });

  it('renders inline children for horizontal dividers', () => {
    render(<Divider>OR</Divider>);
    expect(screen.getByText('OR')).toBeInTheDocument();
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('applies spacing as a margin', () => {
    const { rerender } = render(<Divider spacing={8} />);
    expect((screen.getByRole('separator') as HTMLElement).style.marginBlock).toBe('8px');
    rerender(<Divider orientation="vertical" spacing={12} />);
    expect((screen.getByRole('separator') as HTMLElement).style.marginInline).toBe('12px');
  });

  it('merges a consumer className', () => {
    render(<Divider className="extra-class" />);
    expect(screen.getByRole('separator').className).toContain('extra-class');
  });
});
