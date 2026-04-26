// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders a native checkbox', () => {
    render(<Checkbox label="Accept" />);
    const cb = screen.getByLabelText('Accept') as HTMLInputElement;
    expect(cb.type).toBe('checkbox');
  });

  it('forwards the ref', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox ref={ref} label="x" />);
    expect(ref.current).toBe(screen.getByLabelText('x'));
  });

  it('toggles checked when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox label="x" onChange={onChange} />);
    const cb = screen.getByLabelText('x') as HTMLInputElement;
    expect(cb.checked).toBe(false);
    await user.click(cb);
    expect(cb.checked).toBe(true);
    expect(onChange).toHaveBeenCalled();
  });

  it('respects disabled', () => {
    render(<Checkbox label="x" disabled />);
    expect(screen.getByLabelText('x')).toBeDisabled();
  });

  it('marks the field invalid', () => {
    render(<Checkbox label="x" invalid helperText="bad" />);
    expect(screen.getByLabelText('x')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('bad').className).toContain('rose');
  });

  it('renders helperText associated via aria-describedby', () => {
    render(<Checkbox label="x" helperText="hint" />);
    const cb = screen.getByLabelText('x');
    const describedBy = cb.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent('hint');
  });

  it.each([
    ['sm', 'h-3.5'],
    ['md', 'h-4'],
    ['lg', 'h-5'],
  ] as const)('applies %s size', (size, expected) => {
    render(<Checkbox label={size} size={size} />);
    expect(screen.getByLabelText(size).className).toContain(expected);
  });

  it('merges a consumer className onto the input', () => {
    render(<Checkbox label="x" className="extra-class" />);
    expect(screen.getByLabelText('x').className).toContain('extra-class');
  });

  it('starts in defaultChecked state', () => {
    render(<Checkbox label="x" defaultChecked />);
    expect(screen.getByLabelText('x')).toBeChecked();
  });
});
