'use client';

import * as React from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FormLabel } from './form-label';
import { FormErrorMessage } from './form-error-message';
import type { BaseFormFieldProps } from './types';

export interface FormTextareaProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName> {
  rows?: number;
  maxLength?: number;
  showCount?: boolean;
  trimOnBlur?: boolean;
}

export function FormTextarea<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  placeholder,
  disabled = false,
  required = false,
  rows = 3,
  maxLength,
  showCount = false,
  trimOnBlur = true,
  className,
}: FormTextareaProps<TFieldValues, TName>): React.JSX.Element {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const handleBlur = () => {
          if (trimOnBlur && typeof field.value === 'string') {
            field.onChange(field.value.trim());
          }
          field.onBlur();
        };

        const textValue = typeof field.value === 'string' ? field.value : '';

        return (
          <div className={cn('space-y-1.5 w-full', className)}>
            <div className="flex items-center justify-between">
              {label && (
                <FormLabel htmlFor={field.name} required={required}>
                  {label}
                </FormLabel>
              )}
              {showCount && maxLength && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {textValue.length} / {maxLength}
                </span>
              )}
            </div>

            <Textarea
              {...field}
              id={field.name}
              rows={rows}
              maxLength={maxLength}
              value={textValue}
              placeholder={placeholder}
              disabled={disabled}
              onBlur={handleBlur}
              className={cn(
                'text-xs sm:text-sm bg-background transition-colors resize-y',
                error && 'border-destructive focus-visible:ring-destructive/30',
              )}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${field.name}-error` : undefined}
            />

            {description && !error && (
              <p className="text-[11px] text-muted-foreground mt-1">{description}</p>
            )}

            <FormErrorMessage message={error?.message} />
          </div>
        );
      }}
    />
  );
}
