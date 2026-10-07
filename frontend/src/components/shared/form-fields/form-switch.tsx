'use client';

import * as React from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { FormErrorMessage } from './form-error-message';
import type { BaseFormFieldProps } from './types';

export type FormSwitchProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseFormFieldProps<TFieldValues, TName>;

export function FormSwitch<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  disabled = false,
  className,
}: FormSwitchProps<TFieldValues, TName>): React.JSX.Element {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const checked = Boolean(field.value);

        return (
          <div className={cn('space-y-1', className)}>
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-card">
              <div className="space-y-0.5">
                {label && (
                  <label
                    htmlFor={field.name}
                    className="text-xs sm:text-sm font-semibold text-foreground cursor-pointer"
                  >
                    {label}
                  </label>
                )}
                {description && (
                  <p className="text-[11px] text-muted-foreground">{description}</p>
                )}
              </div>

              <button
                type="button"
                id={field.name}
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => field.onChange(!checked)}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                  checked ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out',
                    checked ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </button>
            </div>

            <FormErrorMessage message={error?.message} />
          </div>
        );
      }}
    />
  );
}
