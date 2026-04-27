// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconButton, IconButtonDataTestIds } from './IconButton';
import { IconName } from '../Icon';

describe('IconButton', () => {
  it('renders with the supplied aria-label and an icon', () => {
    render(<IconButton aria-label="Refresh feed" icon={IconName.Refresh} />);
    const btn = screen.getByRole('button', { name: 'Refresh feed' });
    expect(btn.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByTestId(IconButtonDataTestIds.Icon)).toBeInTheDocument();
  });

  it('forwards refs to the underlying button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<IconButton ref={ref} aria-label="Action" icon={IconName.Refresh} />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('merges a custom className', () => {
    render(
      <IconButton
        aria-label="Action"
        icon={IconName.Refresh}
        className="custom-class"
      />,
    );
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('respects the disabled prop', () => {
    render(<IconButton aria-label="Action" icon={IconName.Refresh} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('defaults to type="button" so it does not submit the enclosing form', () => {
    render(<IconButton aria-label="Action" icon={IconName.Refresh} />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('applies the chosen size class', () => {
    render(<IconButton aria-label="A" icon={IconName.Refresh} size="lg" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/h-10/);
    expect(btn.className).toMatch(/w-10/);
  });

  it('fires onClick when clicked', async () => {
    const onClick = vi.fn();
    render(
      <IconButton
        aria-label="Click me"
        icon={IconName.Refresh}
        onClick={onClick}
      />,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
