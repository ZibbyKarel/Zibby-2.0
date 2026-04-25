// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert } from './Alert';

describe('Alert', () => {
  it('renders title and children', () => {
    render(
      <Alert title="Heads up">
        <span>body text</span>
      </Alert>,
    );
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('body text')).toBeInTheDocument();
  });

  it.each(['info', 'success', 'warning'] as const)('uses role=status for %s severity', (sev) => {
    render(<Alert severity={sev} title="x" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('uses role=alert for error severity', () => {
    render(<Alert severity="error" title="oh no" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it.each(['info', 'success', 'warning', 'error'] as const)(
    'renders the default icon for %s',
    (sev) => {
      render(<Alert severity={sev} title="x" />);
      const root = screen.getByText('x').closest('div[role]') as HTMLElement;
      expect(root.querySelector('svg')).toBeTruthy();
    },
  );

  it('renders an icon override', () => {
    render(<Alert title="x" icon={<span data-testid="ic" />} />);
    expect(screen.getByTestId('ic')).toBeInTheDocument();
  });

  it('renders a close button only when onClose is supplied', () => {
    const { rerender } = render(<Alert title="x" />);
    expect(screen.queryByLabelText('Close alert')).toBeNull();
    rerender(<Alert title="x" onClose={() => {}} />);
    expect(screen.getByLabelText('Close alert')).toBeInTheDocument();
  });

  it('fires onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Alert title="x" onClose={onClose} />);
    await user.click(screen.getByLabelText('Close alert'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('merges a consumer className', () => {
    render(<Alert title="x" className="extra-class" />);
    expect(screen.getByRole('status').className).toContain('extra-class');
  });
});
