// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chip } from './Chip';

describe('Chip', () => {
  it('renders its children', () => {
    render(<Chip>main</Chip>);
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it.each(['neutral', 'accent', 'violet', 'warn', 'sky', 'rose'] as const)(
    'applies the %s tone palette',
    (tone) => {
      render(<Chip tone={tone}>{tone}</Chip>);
      const chip = screen.getByText(tone).closest('span[style]') as HTMLElement;
      expect(chip.style.color).toBeTruthy();
      expect(chip.style.background).toBeTruthy();
    },
  );

  it.each(['sm', 'md'] as const)('applies the %s size', (size) => {
    render(<Chip size={size}>{size}</Chip>);
    const chip = screen.getByText(size).closest('span[style]') as HTMLElement;
    expect(chip.className).toMatch(/h-(5|\[22px\])/);
  });

  it('renders the leading icon', () => {
    render(<Chip icon={<span data-testid="ic" />}>x</Chip>);
    expect(screen.getByTestId('ic')).toBeInTheDocument();
  });

  it('renders a delete button when onDelete is supplied', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<Chip onDelete={onDelete}>x</Chip>);
    await user.click(screen.getByLabelText('Remove'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('delete click does not bubble to chip onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onDelete = vi.fn();
    render(
      <Chip onClick={onClick} onDelete={onDelete}>
        x
      </Chip>,
    );
    await user.click(screen.getByLabelText('Remove'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('makes the chip interactive (role=button) when onClick is supplied', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>tap me</Chip>);
    const btn = screen.getByRole('button', { name: 'tap me' });
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('triggers onClick on Enter when interactive', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>x</Chip>);
    const btn = screen.getByRole('button');
    btn.focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('merges a consumer className', () => {
    render(<Chip className="extra-class">x</Chip>);
    const chip = screen.getByText('x').parentElement!;
    expect(chip.className).toContain('extra-class');
  });
});
