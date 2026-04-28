import type { FieldValues, UseFormProps, UseFormReturn } from 'react-hook-form';

export type FormControls<T extends FieldValues = FieldValues> = UseFormReturn<T>;
export type FormControlsOptions<T extends FieldValues = FieldValues> =
  UseFormProps<T> & { onSubmit: (values: T) => void };
