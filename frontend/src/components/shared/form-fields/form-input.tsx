'use client';

import * as React from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { FormLabel } from './form-label';
import { FormErrorMessage } from './form-error-message';
import type { BaseFormFieldProps } from './types';

export interface FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName> {
  type?: React.HTMLInputTypeAttribute;
  startIcon?: string;
  endIcon?: string;
  autoComplete?: string;
  trimOnBlur?: boolean;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FormInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  required = false,
  startIcon,
  endIcon,
  autoComplete,
  trimOnBlur = true,
  className,
}: FormInputProps<TFieldValues, TName>): React.JSX.Element {
  // Hỗ trợ chế độ Standalone / Controlled ngoài React Hook Form (khi không có control)
  if (!control) {
    return (
      <div className={cn('space-y-1.5 w-full', className)}>
        {label && (
          <FormLabel htmlFor={name} required={required}>
            {label}
          </FormLabel>
        )}

        <div className="relative">
          {startIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <Icon icon={startIcon} className="size-4" />
            </div>
          )}

          <Input
            id={name}
            name={name}
            type={type}
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete={autoComplete}
            className={cn(
              'h-9 text-xs sm:text-sm bg-background transition-colors',
              startIcon && 'pl-9',
              endIcon && 'pr-9',
            )}
          />

          {endIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <Icon icon={endIcon} className="size-4" />
            </div>
          )}
        </div>

        {description && (
          <p className="text-[11px] text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    );
  }

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

        const inputValue = field.value === undefined || field.value === null ? '' : field.value;

        return (
          <div className={cn('space-y-1.5 w-full', className)}>
            {label && (
              <FormLabel htmlFor={field.name} required={required}>
                {label}
              </FormLabel>
            )}

            <div className="relative">
              {startIcon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  <Icon icon={startIcon} className="size-4" />
                </div>
              )}

              <Input
                {...field}
                id={field.name}
                type={type}
                value={inputValue}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete={autoComplete}
                onBlur={handleBlur}
                className={cn(
                  'h-9 text-xs sm:text-sm bg-background transition-colors',
                  startIcon && 'pl-9',
                  endIcon && 'pr-9',
                  error && 'border-destructive focus-visible:ring-destructive/30',
                )}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${field.name}-error` : undefined}
              />

              {endIcon && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  <Icon icon={endIcon} className="size-4" />
                </div>
              )}
            </div>

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
