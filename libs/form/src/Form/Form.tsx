import type { FormHTMLAttributes, ReactNode } from 'react';
import { type FieldValues, type UseFormProps } from 'react-hook-form';
import { useFormControls } from './useFormControls';

export type FormProps<T extends FieldValues = FieldValues> = UseFormProps<T> &
  Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'children'> & {
    onSubmit: (values: T) => void;
    children: ReactNode;
  };

export function Form<T extends FieldValues = FieldValues>(props: FormProps<T>) {
  const {
    defaultValues,
    mode,
    reValidateMode,
    shouldUnregister,
    criteriaMode,
    delayError,
    children,
    onSubmit,
    resolver,
    ...formAttrs
  } = props;

  const { renderForm, submit } = useFormControls<T>({
    defaultValues,
    mode,
    reValidateMode,
    shouldUnregister,
    criteriaMode,
    delayError,
    onSubmit,
    resolver,
  });

  return renderForm(
    <form {...formAttrs} onSubmit={submit}>
      {children}
    </form>,
  );
}
