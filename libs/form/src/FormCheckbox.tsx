import type { ChangeEvent, ReactNode } from 'react';
import { Checkbox, type CheckboxProps } from '@nightcoder/design-system';
import {
  useController,
  type FieldValues,
  type Path,
  type PathValue,
} from 'react-hook-form';

export type FormCheckboxProps<TFieldValues extends FieldValues = FieldValues> = Omit<
  CheckboxProps,
  'name' | 'checked' | 'value' | 'onChange' | 'onBlur' | 'defaultValue' | 'defaultChecked'
> & {
  name: Path<TFieldValues>;
  defaultValue?: PathValue<TFieldValues, Path<TFieldValues>>;
};

export function FormCheckbox<TFieldValues extends FieldValues = FieldValues>({
  name,
  defaultValue,
  invalid,
  helperText,
  ...checkboxProps
}: FormCheckboxProps<TFieldValues>) {
  const { field, fieldState } = useController<TFieldValues>({
    name,
    defaultValue,
  });

  const isInvalid = invalid ?? !!fieldState.error;
  const resolvedHelperText: ReactNode =
    fieldState.error?.message ?? helperText ?? null;

  return (
    <Checkbox
      {...checkboxProps}
      name={field.name}
      checked={!!field.value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => field.onChange(e.target.checked)}
      onBlur={field.onBlur}
      ref={field.ref}
      invalid={isInvalid}
      helperText={resolvedHelperText}
    />
  );
}
