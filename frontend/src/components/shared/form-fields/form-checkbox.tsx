'use client';

import * as React from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { FormErrorMessage } from './form-error-message';
import type { BaseFormFieldProps } from './types';

export type FormCheckboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseFormFieldProps<TFieldValues, TName>;

export function FormCheckbox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  disabled = false,
  className,
}: FormCheckboxProps<TFieldValues, TName>): React.JSX.Element {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const checked = Boolean(field.value);

        return (
          <div className={cn('space-y-1', className)}>
            <div className="flex items-start gap-2.5">
              <button
                type="button"
                id={field.name}
                role="checkbox"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => field.onChange(!checked)}
                className={cn(
                  'mt-0.5 size-4 shrink-0 rounded-sm border transition-colors flex items-center justify-center cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
                  checked
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/80 bg-background',
                )}
              >
                {checked && <Icon icon="lucide:check" className="size-3" />}
              </button>

              <div className="space-y-0.5 select-none">
                {label && (
                  <label
                    htmlFor={field.name}
                    onClick={() => !disabled && field.onChange(!checked)}
                    className="text-xs sm:text-sm font-medium text-foreground cursor-pointer"
                  >
                    {label}
                  </label>
                )}
                {description && (
                  <p className="text-[11px] text-muted-foreground">{description}</p>
                )}
              </div>
            </div>

            <FormErrorMessage message={error?.message} />
          </div>
        );
      }}
    />
  );
}
