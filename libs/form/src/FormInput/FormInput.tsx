import type { ReactNode } from 'react';
import { TextField, type TextFieldProps } from '@nightcoder/design-system';
import {
  useController,
  type FieldValues,
  type Path,
  type PathValue,
} from 'react-hook-form';

export type FormInputProps<TFieldValues extends FieldValues = FieldValues> = Omit<
  TextFieldProps,
  'name' | 'value' | 'onChange' | 'onBlur' | 'defaultValue'
> & {
  name: Path<TFieldValues>;
  defaultValue?: PathValue<TFieldValues, Path<TFieldValues>>;
};

export function FormInput<TFieldValues extends FieldValues = FieldValues>({
  name,
  defaultValue,
  invalid,
  helperText,
  ...textFieldProps
}: FormInputProps<TFieldValues>) {
  const { field, fieldState } = useController<TFieldValues>({
    name,
    defaultValue,
  });

  const isInvalid = invalid ?? !!fieldState.error;
  const resolvedHelperText: ReactNode =
    fieldState.error?.message ?? helperText ?? null;

  return (
    <TextField
      {...textFieldProps}
      name={field.name}
      value={(field.value as string | undefined) ?? ''}
      onChange={field.onChange}
      onBlur={field.onBlur}
      ref={field.ref}
      invalid={isInvalid}
      helperText={resolvedHelperText}
    />
  );
}
