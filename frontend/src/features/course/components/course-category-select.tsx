'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ICourseCategory } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { usePublicCategoriesQuery } from '../api/course-category.api';

export interface CourseCategorySelectProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  onBlur?: () => void;
  disabled?: boolean;
  isInvalid?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

interface SelectOption {
  value: string | null;
  label: string;
  imageUrl?: string | null;
}

export function CourseCategorySelect({
  value = null,
  onChange,
  onBlur,
  disabled = false,
  isInvalid = false,
  id,
  name,
  className,
}: CourseCategorySelectProps): React.JSX.Element {
  const { data: categories, isLoading } = usePublicCategoriesQuery();
  const isDisabled = disabled || isLoading;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;
  const listboxId = `${selectId}-listbox`;

  const options = useMemo<SelectOption[]>(
    () => [
      { value: null, label: 'Chưa phân loại' },
      ...(categories ?? []).map((category: ICourseCategory) => ({
        value: category.id,
        label: category.name,
        imageUrl: category.imageUrl,
      })),
    ],
    [categories],
  );

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selectedOption = options[selectedIndex] ?? options[0];

  const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen, onBlur]);

  const handleToggle = () => {
    if (isDisabled) return;
    if (isOpen) {
      setIsOpen(false);
      onBlur?.();
    } else {
      setHighlightedIndex(selectedIndex);
      setIsOpen(true);
    }
  };

  const handleSelect = (nextValue: string | null) => {
    if (isDisabled) return;
    onChange?.(nextValue);
    setIsOpen(false);
    triggerRef.current?.focus();
    onBlur?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isDisabled) return;

    if (event.key === 'Escape') {
      if (isOpen) {
        event.preventDefault();
        setIsOpen(false);
        onBlur?.();
      }
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const option = options[highlightedIndex];
        if (option !== undefined) handleSelect(option.value);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev + 1) % options.length);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
      }
      return;
    }

    if (event.key === 'Tab' && isOpen) {
      setIsOpen(false);
      onBlur?.();
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {name && <input type="hidden" name={name} value={value ?? ''} />}

      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-invalid={isInvalid}
        disabled={isDisabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'group flex h-8 w-full min-w-0 items-center justify-between rounded-xl border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none cursor-pointer select-none text-left dark:bg-input/30',
          'hover:border-border/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          isOpen && 'border-ring ring-3 ring-ring/50',
          isInvalid &&
            'border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40',
          isDisabled &&
            'pointer-events-none cursor-not-allowed opacity-50 bg-input/50 dark:bg-input/80',
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selectedOption?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedOption.imageUrl}
              alt=""
              className="size-4 shrink-0 rounded object-contain"
            />
          ) : (
            <Icon
              icon={selectedOption?.value ? 'lucide:folder' : 'lucide:circle-dashed'}
              className="size-3.5 shrink-0 text-muted-foreground"
            />
          )}
          <span className="truncate font-medium text-foreground">
            {isLoading ? 'Đang tải danh mục...' : (selectedOption?.label ?? 'Chưa phân loại')}
          </span>
        </span>

        <Icon
          icon="lucide:chevron-down"
          className={cn(
            'size-3.5 text-muted-foreground shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180 text-foreground',
          )}
        />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={selectId}
          className="absolute top-full left-0 z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border/80 bg-popover p-1 text-popover-foreground shadow-lg outline-none duration-150 animate-in fade-in-0 zoom-in-95"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;

            return (
              <div
                key={option.value ?? 'none'}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors cursor-pointer select-none',
                  isSelected
                    ? 'bg-primary/10 text-primary font-medium'
                    : isHighlighted
                      ? 'bg-muted/70 text-foreground'
                      : 'text-foreground hover:bg-muted/50',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {option.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={option.imageUrl}
                      alt=""
                      className="size-4 shrink-0 rounded object-contain"
                    />
                  ) : (
                    <Icon
                      icon={option.value ? 'lucide:folder' : 'lucide:circle-dashed'}
                      className={cn(
                        'size-3.5 shrink-0',
                        isSelected ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                  )}
                  <span className="truncate">{option.label}</span>
                </div>

                {isSelected && (
                  <Icon icon="lucide:check" className="size-3.5 text-primary shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
