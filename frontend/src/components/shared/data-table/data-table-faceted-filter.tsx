'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DataTableFilterOption } from './types';

interface DataTableFacetedFilterProps {
  title: string;
  options: DataTableFilterOption[];
  selectedValues: string[];
  onSelect: (values: string[]) => void;
}

export function DataTableFacetedFilter({
  title,
  options,
  selectedValues,
  onSelect,
}: DataTableFacetedFilterProps): React.JSX.Element {
  const selectedSet = React.useMemo(() => new Set(selectedValues), [selectedValues]);

  const handleToggle = (val: string) => {
    const next = new Set(selectedSet);
    if (next.has(val)) {
      next.delete(val);
    } else {
      next.add(val);
    }
    onSelect(Array.from(next));
  };

  const handleClear = () => {
    onSelect([]);
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-dashed border-border/80 text-xs gap-1.5 px-3"
          >
            <Icon icon="lucide:filter" className="size-3.5 text-muted-foreground" />
            <span>{title}</span>
            {selectedSet.size > 0 && (
              <>
                <div className="h-4 w-px bg-border/60 mx-1" />
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1.5 font-normal text-[10px] lg:hidden"
                >
                  {selectedSet.size}
                </Badge>
                <div className="hidden lg:flex gap-1">
                  {selectedSet.size > 2 ? (
                    <Badge variant="secondary" className="rounded-sm px-1.5 font-normal text-[10px]">
                      {selectedSet.size} đã chọn
                    </Badge>
                  ) : (
                    options
                      .filter((opt) => selectedSet.has(opt.value))
                      .map((opt) => (
                        <Badge
                          key={opt.value}
                          variant="secondary"
                          className="rounded-sm px-1.5 font-normal text-[10px]"
                        >
                          {opt.label}
                        </Badge>
                      ))
                  )}
                </div>
              </>
            )}
          </Button>
        }
      />

      <PopoverContent align="start" className="w-56 p-2 space-y-1">
        <div className="text-xs font-semibold px-2 py-1.5 text-muted-foreground">
          Lọc theo {title}
        </div>
        <div className="space-y-0.5">
          {options.map((option) => {
            const isSelected = selectedSet.has(option.value);
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => handleToggle(option.value)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors text-left cursor-pointer',
                  isSelected
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                <div
                  className={cn(
                    'size-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/80 bg-background',
                  )}
                >
                  {isSelected && <Icon icon="lucide:check" className="size-3" />}
                </div>

                {option.icon && (
                  <Icon icon={option.icon} className="size-3.5 text-muted-foreground shrink-0" />
                )}

                <span className="truncate flex-1">{option.label}</span>

                {typeof option.count === 'number' && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {option.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedSet.size > 0 && (
          <div className="pt-1.5 border-t border-border/60 mt-1">
            <button
              type="button"
              onClick={handleClear}
              className="w-full py-1 text-center text-xs text-muted-foreground hover:text-foreground font-medium rounded-md hover:bg-muted transition-colors cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
