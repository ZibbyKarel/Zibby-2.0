import {
  forwardRef,
  useImperativeHandle,
  type FormHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import {
  FormProvider,
  useForm,
  type FieldValues,
  type SubmitErrorHandler,
  type SubmitHandler,
  type UseFormProps,
  type UseFormReturn,
} from 'react-hook-form';

type ConfigProps<T extends FieldValues> = Pick<
  UseFormProps<T>,
  | 'defaultValues'
  | 'mode'
  | 'reValidateMode'
  | 'resolver'
  | 'shouldUnregister'
  | 'criteriaMode'
  | 'delayError'
>;

export type FormProps<T extends FieldValues = FieldValues> = Omit<
  FormHTMLAttributes<HTMLFormElement>,
  'onSubmit' | 'children'
> &
  ConfigProps<T> & {
    onSubmit: SubmitHandler<T>;
    onInvalid?: SubmitErrorHandler<T>;
    children: ReactNode | ((methods: UseFormReturn<T>) => ReactNode);
    formRef?: Ref<UseFormReturn<T>>;
  };

function FormInner<T extends FieldValues>(
  {
    defaultValues,
    mode,
    reValidateMode,
    resolver,
    shouldUnregister,
    criteriaMode,
    delayError,
    onSubmit,
    onInvalid,
    children,
    formRef,
    ...formAttrs
  }: FormProps<T>,
  ref: Ref<HTMLFormElement>,
) {
  const methods = useForm<T>({
    defaultValues,
    mode,
    reValidateMode,
    resolver,
    shouldUnregister,
    criteriaMode,
    delayError,
  });

  useImperativeHandle(formRef, () => methods, [methods]);

  return (
    <FormProvider {...methods}>
      <form
        ref={ref}
        {...formAttrs}
        onSubmit={methods.handleSubmit(onSubmit, onInvalid)}
      >
        {typeof children === 'function' ? children(methods) : children}
      </form>
    </FormProvider>
  );
}

export const Form = forwardRef(FormInner) as <
  T extends FieldValues = FieldValues,
>(
  props: FormProps<T> & { ref?: Ref<HTMLFormElement> },
) => ReturnType<typeof FormInner>;
