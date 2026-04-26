// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircularProgress } from './CircularProgress';

describe('CircularProgress', () => {
  it('renders with role=progressbar', () => {
    render(<CircularProgress value={42} aria-label="x" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('exposes aria-valuenow for determinate progress', () => {
    render(<CircularProgress value={42} aria-label="x" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
  });

  it('omits aria-valuenow for indeterminate progress', () => {
    render(<CircularProgress aria-label="x" />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  });

  it('renders the percentage in the center for determinate progress by default', () => {
    render(<CircularProgress value={42} aria-label="x" />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('hides the value when showValue=false', () => {
    render(<CircularProgress value={42} showValue={false} aria-label="x" />);
    expect(screen.queryByText('42%')).toBeNull();
  });

  it('clamps the value to the [0, 100] range', () => {
    const { rerender } = render(<CircularProgress value={-50} aria-label="x" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    rerender(<CircularProgress value={500} aria-label="x" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('renders the label when supplied', () => {
    render(<CircularProgress value={10} label="usage" />);
    expect(screen.getByText('usage')).toBeInTheDocument();
  });

  it('applies a custom color override', () => {
    render(<CircularProgress value={50} color="hotpink" aria-label="x" />);
    const circles = document.querySelectorAll('circle');
    // Second circle is the foreground stroke
    expect(circles[1].getAttribute('stroke')).toBe('hotpink');
  });

  it('merges a consumer className', () => {
    render(<CircularProgress value={10} aria-label="x" className="extra-class" />);
    expect(screen.getByRole('progressbar').className).toContain('extra-class');
  });
});
