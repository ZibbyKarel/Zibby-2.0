// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Snackbar } from './Snackbar';

describe('Snackbar', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(<Snackbar open={false} title="x" message="y" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the title and message when open', () => {
    render(<Snackbar open title="Saved" message="Your file was saved." />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Your file was saved.')).toBeInTheDocument();
  });

  it('uses role=alert for errors and role=status otherwise', () => {
    const { rerender } = render(<Snackbar open severity="error" title="x" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(<Snackbar open severity="info" title="x" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it.each(['info', 'success', 'warning', 'error'] as const)(
    'applies the %s accent color on the left border',
    (severity) => {
      render(<Snackbar open severity={severity} title="x" />);
      const node = screen.getByText('x').closest('div[role]') as HTMLElement;
      expect(node.style.borderLeft).toMatch(/3px solid var\(--/);
    },
  );

  it('renders a close button only when onClose is supplied', () => {
    const { rerender } = render(<Snackbar open title="x" />);
    expect(screen.queryByLabelText('Close notification')).toBeNull();
    rerender(<Snackbar open title="x" onClose={() => {}} />);
    expect(screen.getByLabelText('Close notification')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Snackbar open title="x" onClose={onClose} />);
    await user.click(screen.getByLabelText('Close notification'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after autoHideDuration elapses', () => {
    vi.useFakeTimers();
    try {
      const onClose = vi.fn();
      render(<Snackbar open title="x" onClose={onClose} autoHideDuration={500} />);
      expect(onClose).not.toHaveBeenCalled();
      vi.advanceTimersByTime(500);
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders a custom icon override', () => {
    render(<Snackbar open title="x" icon={<span data-testid="custom-ic" />} />);
    expect(screen.getByTestId('custom-ic')).toBeInTheDocument();
  });

  it('merges a consumer className', () => {
    render(<Snackbar open title="x" className="extra-class" />);
    expect(screen.getByText('x').closest('div[role]')!.className).toContain('extra-class');
  });
});
