import { forwardRef, type InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', ...props },
  ref,
) {
  const base =
    'w-full rounded-[var(--radius-sm)] border border-[var(--border)] ' +
    'bg-[var(--bg-2)] px-3 py-2 text-sm text-[var(--text-0)] ' +
    'placeholder:text-[var(--text-3)] transition-colors ' +
    'hover:border-[var(--border-2)] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';

  return <input ref={ref} className={`${base} ${className}`.trim()} {...props} />;
});
