import { SearchField, type SearchFieldProps } from '@nightcoder/design-system';
import {
  useController,
  type FieldValues,
  type Path,
  type PathValue,
} from 'react-hook-form';

export type FormSearchFieldProps<TFieldValues extends FieldValues = FieldValues> = Omit<
  SearchFieldProps,
  'name' | 'value' | 'onChange' | 'onBlur' | 'defaultValue'
> & {
  name: Path<TFieldValues>;
  defaultValue?: PathValue<TFieldValues, Path<TFieldValues>>;
  /** Optional override; defaults to `!!fieldState.error`. */
  invalid?: boolean;
};

export function FormSearchField<TFieldValues extends FieldValues = FieldValues>({
  name,
  defaultValue,
  invalid,
  ...searchFieldProps
}: FormSearchFieldProps<TFieldValues>) {
  const { field, fieldState } = useController<TFieldValues>({
    name,
    defaultValue,
  });

  const isInvalid = invalid ?? !!fieldState.error;

  return (
    <SearchField
      {...searchFieldProps}
      name={field.name}
      value={(field.value as string | undefined) ?? ''}
      onChange={field.onChange}
      onBlur={field.onBlur}
      ref={field.ref}
      aria-invalid={isInvalid || undefined}
    />
  );
}
