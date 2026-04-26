// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from './Drawer';

describe('Drawer', () => {
  it('renders nothing when open is false', () => {
    render(<Drawer open={false}>x</Drawer>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the drawer when open', () => {
    render(<Drawer open>body</Drawer>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('uses the title as the accessible name', () => {
    render(<Drawer open title="Side panel">x</Drawer>);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Side panel');
  });

  it.each(['left', 'right', 'top', 'bottom'] as const)('positions on %s', (anchor) => {
    render(<Drawer open anchor={anchor}>x</Drawer>);
    const surface = screen.getByRole('dialog');
    if (anchor === 'left')   expect(surface.className).toMatch(/left-0/);
    if (anchor === 'right')  expect(surface.className).toMatch(/right-0/);
    if (anchor === 'top')    expect(surface.className).toMatch(/top-0/);
    if (anchor === 'bottom') expect(surface.className).toMatch(/bottom-0/);
  });

  it('applies width for vertical anchors and height for horizontal anchors', () => {
    const { rerender } = render(<Drawer open anchor="right" width={300}>x</Drawer>);
    expect((screen.getByRole('dialog') as HTMLElement).style.width).toBe('300px');
    rerender(<Drawer open anchor="bottom" height={200}>x</Drawer>);
    expect((screen.getByRole('dialog') as HTMLElement).style.height).toBe('200px');
  });

  it('renders a close button in the header when title and onClose are supplied', () => {
    const onClose = vi.fn();
    render(<Drawer open title="t" onClose={onClose}>x</Drawer>);
    expect(screen.getByLabelText('Close drawer')).toBeInTheDocument();
  });

  it('clicking the backdrop closes the drawer', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Drawer open onClose={onClose}>x</Drawer>);
    await user.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close on backdrop click when closeOnBackdropClick=false', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Drawer open onClose={onClose} closeOnBackdropClick={false}>x</Drawer>);
    await user.click(screen.getByRole('presentation'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('omits the backdrop when modal=false', () => {
    render(<Drawer open modal={false}>x</Drawer>);
    expect(screen.queryByRole('presentation')).toBeNull();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Drawer open onClose={onClose}>x</Drawer>);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('merges a consumer className', () => {
    render(<Drawer open className="extra-class">x</Drawer>);
    expect(screen.getByRole('dialog').className).toContain('extra-class');
  });
});
