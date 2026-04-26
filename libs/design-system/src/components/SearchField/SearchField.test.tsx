// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchField } from './SearchField';

describe('SearchField', () => {
  it('renders an input with type="search" and the default placeholder', () => {
    render(<SearchField />);
    const input = screen.getByPlaceholderText('Search');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('type', 'search');
  });

  it('forwards refs to the input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<SearchField ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('accepts a controlled value and emits change events', async () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText('Search'), 'a');
    expect(onChange).toHaveBeenCalled();
  });

  it('renders start and end adornments', () => {
    render(
      <SearchField
        startAdornment={<svg data-testid="start" />}
        endAdornment={<span data-testid="end">⌘K</span>}
      />,
    );
    expect(screen.getByTestId('start')).toBeInTheDocument();
    expect(screen.getByTestId('end')).toBeInTheDocument();
  });

  it('respects the disabled prop', () => {
    render(<SearchField disabled />);
    expect(screen.getByPlaceholderText('Search')).toBeDisabled();
  });

  it('merges a custom className on the input and wrapperClassName on the wrapper', () => {
    const { container } = render(
      <SearchField className="custom-input" wrapperClassName="custom-wrapper" />,
    );
    expect(screen.getByPlaceholderText('Search')).toHaveClass('custom-input');
    expect(container.firstChild).toHaveClass('custom-wrapper');
  });

  it('passes through a custom placeholder', () => {
    render(<SearchField placeholder="Filter tasks" />);
    expect(screen.getByPlaceholderText('Filter tasks')).toBeInTheDocument();
  });
});
