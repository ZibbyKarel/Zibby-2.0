import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label?: string;
  helperText?: ReactNode;
  /** Render the field in an error state (red border + helper text). */
  invalid?: boolean;
  /** Adornment rendered inside the field on the left. */
  startAdornment?: ReactNode;
  /** Adornment rendered inside the field on the right. */
  endAdornment?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
};

const sizeClasses = {
  sm: 'h-7 text-xs px-2',
  md: 'h-9 text-sm px-3',
  lg: 'h-11 text-base px-3.5',
} as const;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    helperText,
    invalid,
    startAdornment,
    endAdornment,
    size = 'md',
    fullWidth = true,
    className = '',
    id,
    disabled,
    readOnly,
    required,
    ...props
  },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const helperId = helperText ? `${inputId}-helper` : undefined;

  const wrapperBase =
    'inline-flex items-center gap-2 rounded-[var(--radius-sm)] border bg-[var(--bg-elevated)] ' +
    'transition-colors focus-within:border-[var(--emerald)]';
  const wrapperState = invalid
    ? 'border-[var(--rose)]'
    : 'border-[var(--border)] hover:border-[var(--border-strong)]';
  const wrapperDisabled = disabled ? 'opacity-50 cursor-not-allowed' : '';
  const widthClass = fullWidth ? 'w-full' : '';

  const inputClasses =
    'flex-1 min-w-0 bg-transparent text-[var(--text-primary)] outline-none ' +
    'placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed';

  return (
    <div className={`flex flex-col gap-1.5 ${widthClass}`.trim()}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-[var(--text-tertiary)] tracking-wide flex items-center gap-1"
        >
          {label}
          {required && <span className="text-[var(--emerald)]">*</span>}
        </label>
      )}
      <div className={`${wrapperBase} ${wrapperState} ${wrapperDisabled} ${sizeClasses[size]} ${widthClass}`.trim()}>
        {startAdornment && (
          <span className="flex items-center text-[var(--text-muted)] shrink-0">{startAdornment}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={helperId}
          className={`${inputClasses} ${className}`.trim()}
          {...props}
        />
        {endAdornment && (
          <span className="flex items-center text-[var(--text-muted)] shrink-0">{endAdornment}</span>
        )}
      </div>
      {helperText && (
        <span
          id={helperId}
          className={`text-xs ${invalid ? 'text-[var(--rose)]' : 'text-[var(--text-muted)]'}`}
        >
          {helperText}
        </span>
      )}
    </div>
  );
});
