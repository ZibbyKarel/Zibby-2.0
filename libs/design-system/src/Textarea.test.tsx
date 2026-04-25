// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea placeholder="notes" />);
    expect(screen.getByPlaceholderText('notes')).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('forwards refs to the underlying textarea', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} data-testid="t" />);
    expect(ref.current).toBe(screen.getByTestId('t'));
  });

  it('associates label with textarea via htmlFor / id', () => {
    render(<Textarea label="Description" />);
    const field = screen.getByLabelText('Description');
    expect(field).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('marks the field invalid via aria-invalid and rose helper text', () => {
    render(<Textarea data-testid="t" invalid helperText="bad" />);
    expect(screen.getByTestId('t')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('bad').className).toContain('rose');
  });

  it('renders helperText associated via aria-describedby', () => {
    render(<Textarea label="N" helperText="hint" />);
    const field = screen.getByLabelText('N');
    const describedBy = field.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent('hint');
  });

  it('honours the resize prop on the inline style', () => {
    render(<Textarea data-testid="t" resize="none" />);
    expect((screen.getByTestId('t') as HTMLTextAreaElement).style.resize).toBe('none');
  });

  it('respects disabled and readOnly', () => {
    const { rerender } = render(<Textarea data-testid="t" disabled />);
    expect(screen.getByTestId('t')).toBeDisabled();
    rerender(<Textarea data-testid="t" readOnly defaultValue="x" />);
    expect(screen.getByTestId('t')).toHaveAttribute('readonly');
  });

  it('shows the required indicator next to the label', () => {
    render(<Textarea label="Body" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('merges a consumer className onto the textarea', () => {
    render(<Textarea data-testid="t" className="extra-class" />);
    expect(screen.getByTestId('t').className).toContain('extra-class');
  });

  it('fires onChange when the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Textarea onChange={onChange} data-testid="t" />);
    await user.type(screen.getByTestId('t'), 'hi');
    expect(onChange).toHaveBeenCalled();
    expect((screen.getByTestId('t') as HTMLTextAreaElement).value).toBe('hi');
  });
});
