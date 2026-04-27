// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, ButtonDataTestIds } from './Button';
import { IconName } from '../Icon';

describe('Button', () => {
  it('renders the label inside a native button', () => {
    render(<Button label="Save" />);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toBeInstanceOf(HTMLButtonElement);
  });

  it('forwards the ref to the underlying button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button label="Hi" ref={ref} />);
    expect(ref.current).toBe(screen.getByRole('button'));
  });

  it('places startIcon', () => {
    render(<Button label="Send" startIcon={IconName.AlertCircle} />);
    expect(screen.getByTestId(ButtonDataTestIds.StartIcon)).toBeInTheDocument();
  });

  it('places endIcon', () => {
    render(<Button label="Send" endIcon={IconName.AlertCircle} />);
    expect(screen.getByTestId(ButtonDataTestIds.EndIcon)).toBeInTheDocument();
  });

  it.each(['primary', 'secondary', 'ghost', 'outline', 'danger'] as const)(
    'applies %s variant styling',
    (variant) => {
      render(<Button label={variant} variant={variant} />);
      const btn = screen.getByRole('button', { name: variant });
      expect(btn.className).toMatch(/(bg-\[|bg-transparent)/);
    },
  );

  it.each([
    ['sm', 'h-7'],
    ['md', 'h-8'],
    ['lg', 'h-10'],
  ] as const)('applies %s size class %s', (size, expected) => {
    render(<Button label={size} size={size} />);
    expect(screen.getByRole('button').className).toContain(expected);
  });

  it('merges a consumer className with the base styles', () => {
    render(<Button label="x" className="extra-class" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('extra-class');
    expect(btn.className).toContain('rounded-[var(--radius-sm)]');
  });

  it('respects the disabled prop', () => {
    render(<Button label="Off" disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('fires onClick when the user clicks', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button label="Go" onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
