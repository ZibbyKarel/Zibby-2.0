import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  label?: ReactNode;
  /** Helper text rendered under the label. */
  helperText?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
};

const boxSize = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
} as const;

const checkSize = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
} as const;

const labelSize = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
} as const;

const Check = ({ className }: { className: string }) => (
  <svg
    aria-hidden
    viewBox="0 0 12 12"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2.5 6.5l2.5 2.5 4.5-5" />
  </svg>
);

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, helperText, size = 'md', invalid, className = '', id, disabled, ...props },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const helperId = helperText ? `${inputId}-helper` : undefined;

  const borderColor = invalid ? 'border-[var(--rose)]' : 'border-[var(--border-2)]';

  return (
    <span className="inline-flex flex-col gap-0.5">
      <label
        htmlFor={inputId}
        className={`inline-flex items-start gap-2 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        <span className="relative inline-flex shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={helperId}
            className={`peer ${boxSize[size]} appearance-none rounded-[var(--radius-sm)] border ${borderColor} bg-[var(--bg-2)] transition-colors checked:bg-[var(--emerald)] checked:border-[var(--emerald)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]/40 ${className}`.trim()}
            {...props}
          />
          <Check
            className={`pointer-events-none absolute inset-0 m-auto ${checkSize[size]} text-[#04140d] opacity-0 peer-checked:opacity-100 transition-opacity`}
          />
        </span>
        {label && <span className={`${labelSize[size]} text-[var(--text-0)]`}>{label}</span>}
      </label>
      {helperText && (
        <span
          id={helperId}
          className={`pl-6 text-xs ${invalid ? 'text-[var(--rose)]' : 'text-[var(--text-3)]'}`}
        >
          {helperText}
        </span>
      )}
    </span>
  );
});
