// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('renders nothing when open is false', () => {
    render(<Dialog open={false}>x</Dialog>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the dialog when open', () => {
    render(<Dialog open>body</Dialog>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('uses the title as the accessible name', () => {
    render(<Dialog open title="Confirm">body</Dialog>);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Confirm');
  });

  it('renders title, description and actions', () => {
    render(
      <Dialog open title="T" description="D" actions={<button type="button">ok</button>}>
        body
      </Dialog>,
    );
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ok' })).toBeInTheDocument();
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose}>x</Dialog>);
    const backdrop = screen.getByRole('presentation');
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when clicking inside the surface', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose}>inside</Dialog>);
    await user.click(screen.getByText('inside'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does NOT close on backdrop click when closeOnBackdropClick=false', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} closeOnBackdropClick={false}>x</Dialog>);
    await user.click(screen.getByRole('presentation'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose}>x</Dialog>);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close on Escape when closeOnEsc=false', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} closeOnEsc={false}>x</Dialog>);
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('merges a consumer className', () => {
    render(<Dialog open className="extra-class">x</Dialog>);
    expect(screen.getByRole('dialog').className).toContain('extra-class');
  });
});
