// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card, CardHeader, CardContent, CardActions } from './Card';

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>hello</Card>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('forwards the ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref} data-testid="c">x</Card>);
    expect(ref.current).toBe(screen.getByTestId('c'));
  });

  it.each(['outlined', 'elevated', 'filled'] as const)('applies %s variant', (variant) => {
    render(<Card variant={variant} data-testid="c">x</Card>);
    const node = screen.getByTestId('c');
    if (variant === 'elevated') expect(node.className).toContain('shadow');
    if (variant === 'filled')   expect(node.className).toContain('border-transparent');
    if (variant === 'outlined') expect(node.className).toContain('border-[var(--border)]');
  });

  it.each([
    ['none', 'p-0'],
    ['sm',   'p-3'],
    ['md',   'p-4'],
    ['lg',   'p-6'],
  ] as const)('applies %s padding', (pad, expected) => {
    render(<Card padding={pad} data-testid="c">x</Card>);
    expect(screen.getByTestId('c').className).toContain(expected);
  });

  it('renders the requested element via the `as` prop', () => {
    render(<Card as="article" data-testid="c">x</Card>);
    expect(screen.getByTestId('c').tagName).toBe('ARTICLE');
  });

  it('reacts to clicks when interactive', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Card interactive data-testid="c" onClick={onClick}>
        click
      </Card>,
    );
    const node = screen.getByTestId('c');
    expect(node.className).toContain('cursor-pointer');
    await user.click(node);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('merges a consumer className', () => {
    render(<Card data-testid="c" className="extra-class">x</Card>);
    expect(screen.getByTestId('c').className).toContain('extra-class');
  });

  it('CardHeader renders title, subtitle and action', () => {
    render(
      <CardHeader
        title="Title"
        subtitle="Subtitle"
        action={<button type="button">act</button>}
      />,
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'act' })).toBeInTheDocument();
  });

  it('CardContent and CardActions render their children', () => {
    render(
      <Card>
        <CardContent>body</CardContent>
        <CardActions>
          <button type="button">ok</button>
        </CardActions>
      </Card>,
    );
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ok' })).toBeInTheDocument();
  });
});
