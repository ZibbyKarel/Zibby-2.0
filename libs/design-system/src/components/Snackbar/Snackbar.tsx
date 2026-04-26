import { useEffect, type ReactNode } from 'react';
import { Icon, IconName } from '../Icon';

export type SnackbarSeverity = 'info' | 'success' | 'warning' | 'error';

export type SnackbarProps = {
  /** Whether the snackbar is visible. When false the component renders nothing. */
  open: boolean;
  /** Severity influences the accent color and default icon. */
  severity?: SnackbarSeverity;
  title?: ReactNode;
  message?: ReactNode;
  /** Optional icon override; falls back to a severity-appropriate glyph. */
  icon?: ReactNode;
  /** When set, the snackbar auto-dismisses after this many ms. */
  autoHideDuration?: number;
  /** Called either when auto-hide elapses or the close button is clicked. */
  onClose?: () => void;
  className?: string;
};

const accent: Record<SnackbarSeverity, string> = {
  info:    'var(--sky)',
  success: 'var(--emerald)',
  warning: 'var(--amber)',
  error:   'var(--rose)',
};

const defaultIconFor: Record<SnackbarSeverity, IconName> = {
  info:    IconName.Info,
  success: IconName.CheckCircle,
  warning: IconName.AlertTriangle,
  error:   IconName.AlertCircle,
};

export function Snackbar({
  open,
  severity = 'info',
  title,
  message,
  icon,
  autoHideDuration,
  onClose,
  className = '',
}: SnackbarProps) {
  useEffect(() => {
    if (!open || autoHideDuration === undefined) return;
    const id = window.setTimeout(() => onClose?.(), autoHideDuration);
    return () => window.clearTimeout(id);
  }, [open, autoHideDuration, onClose]);

  if (!open) return null;

  const color = accent[severity];

  return (
    <div
      role={severity === 'error' ? 'alert' : 'status'}
      aria-live={severity === 'error' ? 'assertive' : 'polite'}
      className={`pointer-events-auto inline-flex items-start gap-2.5 min-w-[280px] rounded-[var(--radius)] border bg-[var(--bg-1)] p-3 shadow-[var(--shadow-2)] ${className}`.trim()}
      style={{
        borderColor: 'var(--border-2)',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <span style={{ color }} className="mt-0.5 flex shrink-0">
        {icon ?? <Icon value={defaultIconFor[severity]} size={15} />}
      </span>
      <div className="flex-1 min-w-0">
        {title && <div className="text-xs font-semibold text-[var(--text-0)]">{title}</div>}
        {message && (
          <div className={`text-[11px] text-[var(--text-2)] ${title ? 'mt-0.5' : ''}`}>{message}</div>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          aria-label="Close notification"
          onClick={onClose}
          className="flex shrink-0 cursor-pointer items-center border-none bg-transparent p-0.5 text-[var(--text-3)] hover:text-[var(--text-1)]"
        >
          <Icon value={IconName.X} size={12} />
        </button>
      )}
    </div>
  );
}
