'use client';

import * as React from 'react';
import type { Table } from '@tanstack/react-table';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>): React.JSX.Element {
  const columns = table
    .getAllColumns()
    .filter(
      (column) =>
        typeof column.accessorFn !== 'undefined' && column.getCanHide(),
    );

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 ml-auto hidden sm:flex"
          >
            <Icon icon="lucide:sliders-horizontal" className="size-3.5 text-muted-foreground" />
            <span>Hiển thị cột</span>
          </Button>
        }
      />

      <PopoverContent align="end" className="w-48 p-2 space-y-1">
        <div className="text-xs font-semibold px-2 py-1 text-muted-foreground">
          Bật / Tắt cột
        </div>
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {columns.map((column) => {
            const isVisible = column.getIsVisible();
            return (
              <button
                type="button"
                key={column.id}
                onClick={() => column.toggleVisibility(!isVisible)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors text-left cursor-pointer',
                  isVisible
                    ? 'text-foreground hover:bg-muted'
                    : 'text-muted-foreground/60 hover:bg-muted/60',
                )}
              >
                <div
                  className={cn(
                    'size-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors',
                    isVisible
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/80 bg-background',
                  )}
                >
                  {isVisible && <Icon icon="lucide:check" className="size-3" />}
                </div>
                <span className="capitalize truncate">{column.id}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
