import type { ChangeEvent, ReactNode } from 'react';
import { Select, type SelectProps } from '@nightcoder/design-system';
import {
  useController,
  type FieldValues,
  type Path,
  type PathValue,
} from 'react-hook-form';

export type FormSelectProps<
  TOption extends string = string,
  TFieldValues extends FieldValues = FieldValues,
> = Omit<
  SelectProps<TOption>,
  'name' | 'value' | 'onChange' | 'onBlur' | 'defaultValue'
> & {
  name: Path<TFieldValues>;
  defaultValue?: PathValue<TFieldValues, Path<TFieldValues>>;
};

export function FormSelect<
  TOption extends string = string,
  TFieldValues extends FieldValues = FieldValues,
>({
  name,
  defaultValue,
  invalid,
  helperText,
  ...selectProps
}: FormSelectProps<TOption, TFieldValues>) {
  const { field, fieldState } = useController<TFieldValues>({
    name,
    defaultValue,
  });

  const isInvalid = invalid ?? !!fieldState.error;
  const resolvedHelperText: ReactNode =
    fieldState.error?.message ?? helperText ?? null;

  return (
    <Select<TOption>
      {...selectProps}
      name={field.name}
      value={(field.value as TOption | undefined) ?? ('' as TOption)}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => field.onChange(e.target.value)}
      onBlur={field.onBlur}
      ref={field.ref}
      invalid={isInvalid}
      helperText={resolvedHelperText}
    />
  );
}
