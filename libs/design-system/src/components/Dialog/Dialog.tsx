import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';

export type DialogProps = {
  open: boolean;
  onClose?: () => void;
  /** Optional title, rendered as the dialog's accessible name. */
  title?: ReactNode;
  /** Optional description text under the title. */
  description?: ReactNode;
  /** Footer slot — typically Cancel / Confirm buttons. */
  actions?: ReactNode;
  children?: ReactNode;
  /** Width of the dialog surface in CSS units. */
  width?: number | string;
  /** Click on the backdrop closes by default. Set false to disable. */
  closeOnBackdropClick?: boolean;
  /** Esc closes by default. Set false to disable. */
  closeOnEsc?: boolean;
  className?: string;
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  actions,
  children,
  width = 'min(560px, 92vw)',
  closeOnBackdropClick = true,
  closeOnEsc = true,
  className = '',
}: DialogProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeOnEsc, onClose]);

  useEffect(() => {
    if (open) {
      surfaceRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={() => closeOnBackdropClick && onClose?.()}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55"
    >
      <div
        ref={surfaceRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[92vh] flex-col rounded-[14px] border border-[var(--border-2)] bg-[var(--bg-1)] shadow-[var(--shadow-2)] outline-none ${className}`.trim()}
        style={{ width }}
      >
        {(title || description) && (
          <header className="flex flex-col gap-1 border-b border-[var(--border)] px-5 py-4">
            {title && <div className="text-[15px] font-semibold text-[var(--text-0)]">{title}</div>}
            {description && <div className="text-xs text-[var(--text-2)]">{description}</div>}
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">{children}</div>
        {actions && (
          <footer className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
            {actions}
          </footer>
        )}
      </div>
    </div>
  );
}

export function DialogBody({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`text-sm text-[var(--text-1)] ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
