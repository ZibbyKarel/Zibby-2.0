import type { ReactNode } from 'react';
import { Textarea, type TextareaProps } from '@nightcoder/design-system';
import {
  useController,
  type FieldValues,
  type Path,
  type PathValue,
} from 'react-hook-form';

export type FormTextareaProps<TFieldValues extends FieldValues = FieldValues> = Omit<
  TextareaProps,
  'name' | 'value' | 'onChange' | 'onBlur' | 'defaultValue'
> & {
  name: Path<TFieldValues>;
  defaultValue?: PathValue<TFieldValues, Path<TFieldValues>>;
};

export function FormTextarea<TFieldValues extends FieldValues = FieldValues>({
  name,
  defaultValue,
  invalid,
  helperText,
  ...textareaProps
}: FormTextareaProps<TFieldValues>) {
  const { field, fieldState } = useController<TFieldValues>({
    name,
    defaultValue,
  });

  const isInvalid = invalid ?? !!fieldState.error;
  const resolvedHelperText: ReactNode =
    fieldState.error?.message ?? helperText ?? null;

  return (
    <Textarea
      {...textareaProps}
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
