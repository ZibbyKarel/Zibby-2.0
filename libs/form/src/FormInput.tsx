import { Input, type InputProps } from '@nightcoder/design-system';
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from 'react-hook-form';

export type FormInputProps<TFieldValues extends FieldValues = FieldValues> = Omit<
  InputProps,
  'name' | 'value' | 'onChange' | 'onBlur' | 'defaultValue'
> & {
  name: Path<TFieldValues>;
  control?: Control<TFieldValues>;
  rules?: Omit<
    RegisterOptions<TFieldValues, Path<TFieldValues>>,
    'valueAsNumber' | 'valueAsDate' | 'setValueAs' | 'disabled'
  >;
  defaultValue?: string;
};

export function FormInput<TFieldValues extends FieldValues = FieldValues>({
  name,
  control,
  rules,
  defaultValue,
  ...inputProps
}: FormInputProps<TFieldValues>) {
  const { field, fieldState } = useController<TFieldValues>({
    name,
    control,
    rules,
    defaultValue: defaultValue as never,
  });

  return (
    <Input
      {...inputProps}
      name={field.name}
      value={(field.value as string | undefined) ?? ''}
      onChange={field.onChange}
      onBlur={field.onBlur}
      ref={field.ref}
      aria-invalid={fieldState.invalid || undefined}
    />
  );
}
