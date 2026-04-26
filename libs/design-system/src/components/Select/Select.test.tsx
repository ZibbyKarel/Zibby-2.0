// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select, type SelectOption } from './Select';

const opts: readonly SelectOption[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', disabled: true },
];

describe('Select', () => {
  it('renders the options', () => {
    render(<Select options={opts} aria-label="fruit" />);
    const select = screen.getByLabelText('fruit') as HTMLSelectElement;
    expect(select.options).toHaveLength(3);
    expect(select.options[0].textContent).toBe('Apple');
  });

  it('forwards the ref', () => {
    const ref = createRef<HTMLSelectElement>();
    render(<Select options={opts} aria-label="fruit" ref={ref} />);
    expect(ref.current).toBe(screen.getByLabelText('fruit'));
  });

  it('associates label with the select', () => {
    render(<Select options={opts} label="Fruit" />);
    expect(screen.getByLabelText('Fruit')).toBeInstanceOf(HTMLSelectElement);
  });

  it('renders a placeholder option when supplied', () => {
    render(<Select options={opts} aria-label="x" placeholder="Pick one" />);
    const select = screen.getByLabelText('x') as HTMLSelectElement;
    expect(select.options[0].textContent).toBe('Pick one');
    expect(select.options[0]).toBeDisabled();
  });

  it('marks individual options as disabled', () => {
    render(<Select options={opts} aria-label="x" />);
    const select = screen.getByLabelText('x') as HTMLSelectElement;
    expect(select.options[2]).toBeDisabled();
  });

  it('marks the field invalid', () => {
    render(<Select options={opts} aria-label="x" invalid helperText="oops" />);
    expect(screen.getByLabelText('x')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('oops').className).toContain('rose');
  });

  it('respects disabled', () => {
    render(<Select options={opts} aria-label="x" disabled />);
    expect(screen.getByLabelText('x')).toBeDisabled();
  });

  it('merges a consumer className onto the select', () => {
    render(<Select options={opts} aria-label="x" className="extra-class" />);
    expect(screen.getByLabelText('x').className).toContain('extra-class');
  });

  it('fires onChange when the user selects an option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select options={opts} aria-label="x" defaultValue="a" onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText('x'), 'b');
    expect(onChange).toHaveBeenCalled();
    expect((screen.getByLabelText('x') as HTMLSelectElement).value).toBe('b');
  });
});
