'use client';

import * as React from 'react';
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { Icon } from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FormLabel } from './form-label';
import { FormErrorMessage } from './form-error-message';
import type { BaseFormFieldProps, FormSelectOption } from './types';

export interface FormSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends BaseFormFieldProps<TFieldValues, TName> {
  options: FormSelectOption[];
  emptyOptionLabel?: string;
  value?: string;
  onValueChange?: (val: string) => void;
}

export function FormSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  options,
  placeholder = 'Chọn một mục...',
  disabled = false,
  required = false,
  className,
  value: controlledValue,
  onValueChange,
}: FormSelectProps<TFieldValues, TName>): React.JSX.Element {
  // Tìm option đang chọn để render icon và label
  const renderOptionContent = (opt: FormSelectOption) => (
    <div className="flex items-center gap-2">
      {opt.icon && <Icon icon={opt.icon} className="size-4 shrink-0 text-muted-foreground" />}
      <span className="truncate">{opt.label}</span>
    </div>
  );

  // 1. Chế độ Standalone (khi không truyền control từ React Hook Form)
  if (!control) {
    const selectedOpt = options.find((o) => o.value === controlledValue);

    return (
      <div className={cn('space-y-1.5 w-full', className)}>
        {label && (
          <FormLabel htmlFor={name} required={required}>
            {label}
          </FormLabel>
        )}

        <Select<string>
          value={controlledValue}
          onValueChange={(val) => {
            if (val !== null && onValueChange) {
              onValueChange(val);
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger id={name} className="w-full">
            {selectedOpt ? (
              renderOptionContent(selectedOpt)
            ) : (
              <SelectValue placeholder={placeholder} />
            )}
          </SelectTrigger>
          <SelectContent align="start" className="w-[var(--anchor-width)]">
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                {renderOptionContent(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {description && (
          <p className="text-[11px] text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    );
  }

  // 2. Chế độ React Hook Form (khi có control)
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selectedValue =
          field.value === undefined || field.value === null ? undefined : String(field.value);
        const selectedOpt = options.find((o) => o.value === selectedValue);

        return (
          <div className={cn('space-y-1.5 w-full', className)}>
            {label && (
              <FormLabel htmlFor={field.name} required={required}>
                {label}
              </FormLabel>
            )}

            <Select<string>
              value={selectedValue}
              onValueChange={(val) => {
                if (val !== null) {
                  field.onChange(val);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger
                id={field.name}
                className={cn(
                  'w-full',
                  error && 'border-destructive focus-visible:ring-destructive/30',
                )}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${field.name}-error` : undefined}
              >
                {selectedOpt ? (
                  renderOptionContent(selectedOpt)
                ) : (
                  <SelectValue placeholder={placeholder} />
                )}
              </SelectTrigger>
              <SelectContent align="start" className="w-[var(--anchor-width)]">
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {renderOptionContent(opt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

// Alias FormDropdown tương đương FormSelect
export const FormDropdown = FormSelect;
export type FormDropdownProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = FormSelectProps<TFieldValues, TName>;
