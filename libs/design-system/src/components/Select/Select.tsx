import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Icon, IconName } from '../Icon';

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

export type SelectProps<T extends string = string> = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'size' | 'children'
> & {
  options: readonly SelectOption<T>[];
  label?: string;
  helperText?: ReactNode;
  invalid?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  /** Optional placeholder option rendered first (with empty value). */
  placeholder?: string;
};

const sizeClasses = {
  sm: 'h-7 text-xs pl-2 pr-7',
  md: 'h-9 text-sm pl-3 pr-8',
  lg: 'h-11 text-base pl-3.5 pr-9',
} as const;

const Caret = () => (
  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-3)]">
    <Icon value={IconName.ChevronDown} size="sm" />
  </span>
);

function SelectInner<T extends string>(
  {
    options,
    label,
    helperText,
    invalid,
    size = 'md',
    fullWidth = true,
    placeholder,
    className = '',
    id,
    disabled,
    required,
    ...props
  }: SelectProps<T>,
  ref: React.Ref<HTMLSelectElement>,
) {
  const reactId = useId();
  const selectId = id ?? reactId;
  const helperId = helperText ? `${selectId}-helper` : undefined;

  const stateBorder = invalid ? 'border-[var(--rose)]' : 'border-[var(--border)] hover:border-[var(--border-2)]';
  const wrapperWidth = fullWidth ? 'w-full' : '';

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperWidth}`.trim()}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium text-[var(--text-2)] tracking-wide flex items-center gap-1"
        >
          {label}
          {required && <span className="text-[var(--emerald)]">*</span>}
        </label>
      )}
      <div className={`relative ${wrapperWidth}`.trim()}>
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={helperId}
          className={[
            'appearance-none rounded-[var(--radius-sm)] border bg-[var(--bg-2)] text-[var(--text-0)]',
            'transition-colors focus:border-[var(--emerald)] focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
            stateBorder,
            sizeClasses[size],
            wrapperWidth,
            className,
          ]
            .join(' ')
            .trim()}
          {...props}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <Caret />
      </div>
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
}

export const Select = forwardRef(SelectInner) as <T extends string = string>(
  props: SelectProps<T> & { ref?: React.Ref<HTMLSelectElement> },
) => ReturnType<typeof SelectInner>;
