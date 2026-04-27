import { type ReactNode } from 'react';
import { Icon, IconName } from '../Icon';

export type AlertSeverity = 'info' | 'success' | 'warning' | 'error';

export type AlertProps = {
  severity?: AlertSeverity;
  title?: ReactNode;
  children?: ReactNode;
  /** Optional override for the leading icon. */
  icon?: ReactNode;
  /** When supplied, renders a close button on the right. */
  onClose?: () => void;
  className?: string;
};

const palette: Record<AlertSeverity, { color: string; bg: string; border: string; icon: IconName }> = {
  info:    { color: 'var(--sky)',     bg: 'rgba(56,189,248,.10)',  border: 'rgba(56,189,248,.30)', icon: IconName.Info          },
  success: { color: 'var(--emerald)', bg: 'rgba(16,185,129,.10)',  border: 'rgba(16,185,129,.30)', icon: IconName.CheckCircle   },
  warning: { color: 'var(--amber)',   bg: 'rgba(245,158,11,.10)',  border: 'rgba(245,158,11,.30)', icon: IconName.AlertTriangle },
  error:   { color: 'var(--rose)',    bg: 'rgba(244,63,94,.10)',   border: 'rgba(244,63,94,.30)',  icon: IconName.AlertCircle   },
};

export function Alert({
  severity = 'info',
  title,
  children,
  icon,
  onClose,
  className = '',
}: AlertProps) {
  const p = palette[severity];
  return (
    <div
      role={severity === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-[var(--radius-sm)] border p-2.5 ${className}`.trim()}
      style={{ borderColor: p.border, background: p.bg, color: p.color }}
    >
      <span className="mt-0.5 flex shrink-0">
        {icon ?? <Icon value={p.icon} size="md" />}
      </span>
      <div className="flex-1 min-w-0 text-[var(--text-0)]">
        {title && <div className="text-xs font-semibold" style={{ color: p.color }}>{title}</div>}
        {children && (
          <div className={`text-xs text-[var(--text-1)] ${title ? 'mt-0.5' : ''}`}>{children}</div>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          aria-label="Close alert"
          onClick={onClose}
          className="flex shrink-0 cursor-pointer items-center border-none bg-transparent p-0.5 text-[var(--text-3)] hover:text-[var(--text-1)]"
        >
          <Icon value={IconName.X} size="xs" />
        </button>
      )}
    </div>
  );
}
