// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('renders a native input', () => {
    render(<Input placeholder="Search" />);
    expect(screen.getByPlaceholderText('Search')).toBeInstanceOf(HTMLInputElement);
  });

  it('forwards the ref to the underlying input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} data-testid="i" />);
    expect(ref.current).toBe(screen.getByTestId('i'));
  });

  it('merges a consumer className with the base styles', () => {
    render(<Input className="extra-class" data-testid="i" />);
    const el = screen.getByTestId('i');
    expect(el.className).toContain('extra-class');
    expect(el.className).toContain('rounded-[var(--radius-sm)]');
  });

  it('respects the disabled prop', () => {
    render(<Input disabled data-testid="i" />);
    expect(screen.getByTestId('i')).toBeDisabled();
  });

  it('fires onChange when the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input onChange={onChange} data-testid="i" />);
    await user.type(screen.getByTestId('i'), 'hi');
    expect(onChange).toHaveBeenCalled();
    expect((screen.getByTestId('i') as HTMLInputElement).value).toBe('hi');
  });
});
