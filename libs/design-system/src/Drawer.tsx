import { useEffect, type ReactNode } from 'react';

export type DrawerAnchor = 'left' | 'right' | 'top' | 'bottom';

export type DrawerProps = {
  open: boolean;
  onClose?: () => void;
  /** Side of the viewport the drawer slides in from. */
  anchor?: DrawerAnchor;
  /** For left/right anchors. */
  width?: number | string;
  /** For top/bottom anchors. */
  height?: number | string;
  /** When true (default), shows a dimmed backdrop and traps clicks outside the surface. */
  modal?: boolean;
  /** Esc closes by default. */
  closeOnEsc?: boolean;
  /** Backdrop click closes by default. */
  closeOnBackdropClick?: boolean;
  /** Optional title rendered as a sticky header. */
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
};

const anchorStyles: Record<DrawerAnchor, string> = {
  left:   'top-0 left-0 h-full border-r',
  right:  'top-0 right-0 h-full border-l',
  top:    'top-0 left-0 w-full border-b',
  bottom: 'bottom-0 left-0 w-full border-t',
};

export function Drawer({
  open,
  onClose,
  anchor = 'right',
  width = 480,
  height = 320,
  modal = true,
  closeOnEsc = true,
  closeOnBackdropClick = true,
  title,
  children,
  className = '',
}: DrawerProps) {
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeOnEsc, onClose]);

  if (!open) return null;

  const dimensions =
    anchor === 'left' || anchor === 'right'
      ? { width }
      : { height };

  return (
    <div className="fixed inset-0 z-[55] pointer-events-none">
      {modal && (
        <div
          role="presentation"
          onClick={() => closeOnBackdropClick && onClose?.()}
          className="absolute inset-0 pointer-events-auto bg-black/40"
        />
      )}
      <aside
        role="dialog"
        aria-modal={modal}
        aria-label={typeof title === 'string' ? title : undefined}
        className={`absolute flex flex-col bg-[var(--bg-1)] border-[var(--border)] shadow-[var(--shadow-2)] pointer-events-auto ${anchorStyles[anchor]} ${className}`.trim()}
        style={dimensions}
      >
        {title && (
          <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="text-sm font-semibold text-[var(--text-0)]">{title}</div>
            {onClose && (
              <button
                type="button"
                aria-label="Close drawer"
                onClick={onClose}
                className="flex cursor-pointer items-center border-none bg-transparent p-1 text-[var(--text-3)] hover:text-[var(--text-1)]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M3 3l8 8M11 3l-8 8" />
                </svg>
              </button>
            )}
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </aside>
    </div>
  );
}
