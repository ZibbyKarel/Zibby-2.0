import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

export type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  /** Optional leading slot. Defaults to a magnifier glyph supplied by the consumer. */
  startAdornment?: ReactNode;
  /** Optional trailing slot — typically a `<Kbd>` showing the shortcut. */
  endAdornment?: ReactNode;
  /** Min-width on the wrapping shell. Defaults to 220px. */
  minWidth?: number | string;
  /** Forwarded to the wrapping shell so consumers can layout it inside flex rows. */
  wrapperClassName?: string;
};

/**
 * A compact search input with optional leading icon and trailing keyboard hint.
 *
 * The component is uncontrolled by default — supply `value`/`onChange` to drive it.
 * Forwards `ref` to the underlying `<input>` so consumers can call `.focus()`.
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  {
    startAdornment,
    endAdornment,
    minWidth = 220,
    wrapperClassName = '',
    className = '',
    type = 'search',
    placeholder = 'Search',
    ...inputProps
  },
  ref,
) {
  return (
    <div
      className={
        'inline-flex items-center gap-2 rounded-[var(--radius-sm)] ' +
        'border border-[var(--border)] bg-[var(--bg-2)] px-2.5 py-1.5 ' +
        'focus-within:border-[var(--border-2)] ' +
        wrapperClassName
      }
      style={{ minWidth }}
    >
      {startAdornment && (
        <span className="flex shrink-0 items-center text-[var(--text-2)]" aria-hidden>
          {startAdornment}
        </span>
      )}
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        className={
          'min-w-0 flex-1 border-none bg-transparent text-xs text-[var(--text-0)] ' +
          'outline-none placeholder:text-[var(--text-3)] ' +
          className
        }
        {...inputProps}
      />
      {endAdornment && <span className="flex shrink-0 items-center">{endAdornment}</span>}
    </div>
  );
});
