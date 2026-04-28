import { type ReactNode } from 'react';
import type { Size } from '../../tokens';

export type KbdSize = Extract<Size, 'sm' | 'md'>;

export type KbdProps = {
  children: ReactNode;
  size?: KbdSize;
  className?: string;
};

const sizeClasses: Record<KbdSize, string> = {
  sm: 'h-4 px-1 text-[9px]',
  md: 'h-[18px] px-1.5 text-[10px]',
};

/**
 * Renders a keyboard shortcut hint, e.g. <Kbd>⌘K</Kbd>.
 */
export function Kbd({ children, size = 'md', className = '' }: KbdProps) {
  return (
    <kbd
      className={
        'inline-flex items-center rounded border border-[var(--border)] ' +
        'bg-[var(--bg-raised)] font-mono font-medium text-[var(--text-muted)] ' +
        sizeClasses[size] + ' ' + className
      }
    >
      {children}
    </kbd>
  );
}
