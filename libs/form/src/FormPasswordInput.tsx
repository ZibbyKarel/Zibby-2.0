import { FormInput, type FormInputProps } from './FormInput';
import type { FieldValues } from 'react-hook-form';

export type FormPasswordInputProps<TFieldValues extends FieldValues = FieldValues> = Omit<
  FormInputProps<TFieldValues>,
  'type'
>;

export function FormPasswordInput<TFieldValues extends FieldValues = FieldValues>(
  props: FormPasswordInputProps<TFieldValues>,
) {
  return <FormInput<TFieldValues> {...props} type="password" />;
}
