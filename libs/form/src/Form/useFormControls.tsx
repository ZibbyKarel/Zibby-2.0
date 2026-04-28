import {
  FormProvider,
  useForm,
  type FieldValues,
  type UseFormProps,
} from 'react-hook-form';
import type { ReactNode } from 'react';

export function useFormControls<T extends FieldValues = FieldValues>(
  formProps: UseFormProps<T> & { onSubmit: (values: T) => void },
) {
  const { onSubmit, ...formOptions } = formProps;
  const controls = useForm<T>(formOptions);

  const renderForm = (children: ReactNode) => (
    <FormProvider {...controls}>{children}</FormProvider>
  );

  const submit = controls.handleSubmit(onSubmit);

  return { renderForm, submit };
}
