'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { CourseLevelEnum } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface CourseLevelOption {
  value: CourseLevelEnum;
  label: string;
}

export const COURSE_LEVEL_OPTIONS: CourseLevelOption[] = [
  { value: CourseLevelEnum.ALL_LEVELS, label: 'Tất cả cấp độ' },
  { value: CourseLevelEnum.BEGINNER, label: 'Cơ bản' },
  { value: CourseLevelEnum.INTERMEDIATE, label: 'Trung cấp' },
  { value: CourseLevelEnum.ADVANCED, label: 'Nâng cao' },
];

export interface CourseLevelSelectProps {
  value?: CourseLevelEnum;
  onChange?: (value: CourseLevelEnum) => void;
  onBlur?: () => void;
  disabled?: boolean;
  isInvalid?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

/**
 * Visual Level Indicator:
 * - ALL_LEVELS: layered icon (lucide:layers)
 * - BEGINNER: 1 of 3 bars active
 * - INTERMEDIATE: 2 of 3 bars active
 * - ADVANCED: 3 of 3 bars active
 */
export function LevelIndicator({ level }: { level: CourseLevelEnum }): React.JSX.Element {
  if (level === CourseLevelEnum.ALL_LEVELS) {
    return (
      <span className="inline-flex size-4 items-center justify-center shrink-0" aria-hidden="true">
        <Icon icon="lucide:layers" className="size-3.5 text-current" />
      </span>
    );
  }

  const activeCount =
    level === CourseLevelEnum.BEGINNER
      ? 1
      : level === CourseLevelEnum.INTERMEDIATE
        ? 2
        : 3;

  return (
    <span
      className="inline-flex size-4 items-end justify-center gap-[2.5px] shrink-0 pb-[1px]"
      aria-hidden="true"
    >
      <span
        className={cn(
          'w-[3px] h-[5px] rounded-full transition-colors',
          activeCount >= 1 ? 'bg-current' : 'bg-muted-foreground/30',
        )}
      />
      <span
        className={cn(
          'w-[3px] h-[8.5px] rounded-full transition-colors',
          activeCount >= 2 ? 'bg-current' : 'bg-muted-foreground/30',
        )}
      />
      <span
        className={cn(
          'w-[3px] h-[12px] rounded-full transition-colors',
          activeCount >= 3 ? 'bg-current' : 'bg-muted-foreground/30',
        )}
      />
    </span>
  );
}

export function CourseLevelSelect({
  value = CourseLevelEnum.ALL_LEVELS,
  onChange,
  onBlur,
  disabled = false,
  isInvalid = false,
  id,
  name,
  className,
}: CourseLevelSelectProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;
  const listboxId = `${selectId}-listbox`;

  const selectedOption =
    COURSE_LEVEL_OPTIONS.find((opt) => opt.value === value) || COURSE_LEVEL_OPTIONS[0];

  const [highlightedIndex, setHighlightedIndex] = useState(() => {
    const idx = COURSE_LEVEL_OPTIONS.findIndex((opt) => opt.value === value);
    return idx >= 0 ? idx : 0;
  });

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
      onBlur?.();
    } else {
      const idx = COURSE_LEVEL_OPTIONS.findIndex((opt) => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
      setIsOpen(true);
    }
  };

  const handleSelect = (levelValue: CourseLevelEnum) => {
    if (disabled) return;
    onChange?.(levelValue);
    setIsOpen(false);
    triggerRef.current?.focus();
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        onBlur?.();
      }
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const option = COURSE_LEVEL_OPTIONS[highlightedIndex];
        if (option) {
          handleSelect(option.value);
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev + 1) % COURSE_LEVEL_OPTIONS.length);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(
          (prev) => (prev - 1 + COURSE_LEVEL_OPTIONS.length) % COURSE_LEVEL_OPTIONS.length,
        );
      }
      return;
    }

    if (e.key === 'Tab' && isOpen) {
      setIsOpen(false);
      onBlur?.();
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Hidden input for standard form submission fallback */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger Button behaving like a Form Field */}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-invalid={isInvalid}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'group flex h-8 w-full min-w-0 items-center justify-between rounded-xl border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none cursor-pointer select-none text-left dark:bg-input/30',
          'hover:border-border/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          isOpen && 'border-ring ring-3 ring-ring/50',
          isInvalid &&
            'border-destructive ring-3 ring-destructive/20 dark:border-destructive/50 dark:ring-destructive/40',
          disabled &&
            'pointer-events-none cursor-not-allowed opacity-50 bg-input/50 dark:bg-input/80',
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
            <LevelIndicator level={selectedOption.value} />
          </span>
          <span className="truncate font-medium text-foreground">
            {selectedOption.label}
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

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={selectId}
          className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-border/80 bg-popover p-1 text-popover-foreground shadow-lg outline-none duration-150 animate-in fade-in-0 zoom-in-95"
        >
          {COURSE_LEVEL_OPTIONS.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;

            return (
              <div
                key={option.value}
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
                  <span
                    className={cn(
                      'shrink-0 transition-colors',
                      isSelected ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    <LevelIndicator level={option.value} />
                  </span>
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
