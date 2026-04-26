// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextField } from './TextField';

describe('TextField', () => {
  it('renders an input element', () => {
    render(<TextField placeholder="Search" />);
    expect(screen.getByPlaceholderText('Search')).toBeInstanceOf(HTMLInputElement);
  });

  it('forwards the ref', () => {
    const ref = createRef<HTMLInputElement>();
    render(<TextField ref={ref} data-testid="t" />);
    expect(ref.current).toBe(screen.getByTestId('t'));
  });

  it('associates label with input via htmlFor / id', () => {
    render(<TextField label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toBeInstanceOf(HTMLInputElement);
  });

  it('marks the field invalid via aria-invalid and rose border', () => {
    render(<TextField data-testid="t" invalid helperText="bad" />);
    expect(screen.getByTestId('t')).toHaveAttribute('aria-invalid', 'true');
    const helper = screen.getByText('bad');
    expect(helper.className).toContain('rose');
  });

  it('renders helperText associated via aria-describedby', () => {
    render(<TextField label="X" helperText="hint" />);
    const input = screen.getByLabelText('X');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent('hint');
  });

  it('renders start and end adornments', () => {
    render(
      <TextField
        startAdornment={<span data-testid="start">$</span>}
        endAdornment={<span data-testid="end">USD</span>}
      />,
    );
    expect(screen.getByTestId('start')).toBeInTheDocument();
    expect(screen.getByTestId('end')).toBeInTheDocument();
  });

  it('respects disabled and readOnly', () => {
    const { rerender } = render(<TextField data-testid="t" disabled />);
    expect(screen.getByTestId('t')).toBeDisabled();
    rerender(<TextField data-testid="t" readOnly defaultValue="x" />);
    expect(screen.getByTestId('t')).toHaveAttribute('readonly');
  });

  it('shows the required indicator next to the label', () => {
    render(<TextField label="Name" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('merges a consumer className onto the input', () => {
    render(<TextField data-testid="t" className="extra-class" />);
    expect(screen.getByTestId('t').className).toContain('extra-class');
  });

  it('fires onChange when the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextField onChange={onChange} data-testid="t" />);
    await user.type(screen.getByTestId('t'), 'hi');
    expect(onChange).toHaveBeenCalled();
    expect((screen.getByTestId('t') as HTMLInputElement).value).toBe('hi');
  });
});
