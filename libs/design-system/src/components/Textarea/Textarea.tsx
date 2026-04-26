import {
  forwardRef,
  useId,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helperText?: ReactNode;
  /** Render the field in an error state (red border + helper text). */
  invalid?: boolean;
  fullWidth?: boolean;
  /** Resize behaviour. Defaults to `vertical`. */
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
};

/**
 * Multi-line text field with the same look-and-feel as {@link TextField}.
 *
 * Composes a `<label>` + `<textarea>`, exposing `invalid` / `helperText` /
 * `required` / `fullWidth` / `resize` so consumers don't need to hand-roll
 * styles. The textarea itself accepts every native attribute (`rows`,
 * `placeholder`, `value`, `onChange`, …).
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    helperText,
    invalid,
    fullWidth = true,
    resize = 'vertical',
    className = '',
    id,
    disabled,
    readOnly,
    required,
    rows = 4,
    ...props
  },
  ref,
) {
  const reactId = useId();
  const fieldId = id ?? reactId;
  const helperId = helperText ? `${fieldId}-helper` : undefined;

  const wrapperWidth = fullWidth ? 'w-full' : '';

  const fieldBase =
    'rounded-[var(--radius-sm)] border bg-[var(--bg-2)] px-3 py-2 text-sm ' +
    'text-[var(--text-0)] placeholder:text-[var(--text-3)] outline-none ' +
    'transition-colors focus:border-[var(--emerald)] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';
  const fieldState = invalid
    ? 'border-[var(--rose)]'
    : 'border-[var(--border)] hover:border-[var(--border-2)]';

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperWidth}`.trim()}>
      {label && (
        <label
          htmlFor={fieldId}
          className="text-xs font-medium text-[var(--text-2)] tracking-wide flex items-center gap-1"
        >
          {label}
          {required && <span className="text-[var(--emerald)]">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        rows={rows}
        aria-invalid={invalid || undefined}
        aria-describedby={helperId}
        style={{ resize }}
        className={`${fieldBase} ${fieldState} ${wrapperWidth} ${className}`.trim()}
        {...props}
      />
      {helperText && (
        <span
          id={helperId}
          className={`text-xs ${invalid ? 'text-[var(--rose)]' : 'text-[var(--text-3)]'}`}
        >
          {helperText}
        </span>
      )}
    </div>
  );
});
