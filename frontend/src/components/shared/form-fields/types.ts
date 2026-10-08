import type * as React from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

export interface BaseFormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
  control?: Control<TFieldValues>;
  label?: React.ReactNode;
  description?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export interface FormSelectOption {
  label: string;
  value: string;
  icon?: string;
  disabled?: boolean;
}
