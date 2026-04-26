// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterChip } from './FilterChip';

describe('FilterChip', () => {
  it('renders children inside a button with aria-pressed reflecting active state', () => {
    render(<FilterChip active={false}>Pending</FilterChip>);
    const btn = screen.getByRole('button', { name: 'Pending' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');

    render(<FilterChip active>Pending</FilterChip>);
    expect(screen.getAllByRole('button', { name: 'Pending' })[1]).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onToggle with the next state on click', async () => {
    const onToggle = vi.fn();
    render(<FilterChip active={false} onToggle={onToggle}>Filter</FilterChip>);
    await userEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle.mock.calls[0]![0]).toBe(true);
  });

  it('toggles to false when active and clicked', async () => {
    const onToggle = vi.fn();
    render(<FilterChip active onToggle={onToggle}>Filter</FilterChip>);
    await userEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith(false, expect.anything());
  });

  it('respects the disabled prop and does not fire onToggle', async () => {
    const onToggle = vi.fn();
    render(<FilterChip disabled onToggle={onToggle}>Filter</FilterChip>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('applies tone-driven inline styles when active', () => {
    render(<FilterChip active tone="accent">A</FilterChip>);
    const btn = screen.getByRole('button');
    expect(btn.style.color).not.toBe('');
    expect(btn.style.background).not.toBe('');
    expect(btn.style.borderColor).not.toBe('');
  });

  it('does not set inline tone styles when inactive', () => {
    render(<FilterChip active={false} tone="accent">A</FilterChip>);
    const btn = screen.getByRole('button');
    expect(btn.style.color).toBe('');
  });

  it('renders an icon when provided', () => {
    render(
      <FilterChip icon={<svg data-testid="i" />}>
        Pending
      </FilterChip>,
    );
    expect(screen.getByTestId('i')).toBeInTheDocument();
  });

  it('merges a custom className', () => {
    render(<FilterChip className="my-x">A</FilterChip>);
    expect(screen.getByRole('button')).toHaveClass('my-x');
  });

  it('toggles via keyboard (Enter / Space)', async () => {
    const onToggle = vi.fn();
    render(<FilterChip onToggle={onToggle}>K</FilterChip>);
    const btn = screen.getByRole('button');
    btn.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onToggle).toHaveBeenCalledTimes(2);
  });
});
