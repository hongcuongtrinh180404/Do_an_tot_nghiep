'use client';

import * as React from 'react';
import type { Column } from '@tanstack/react-table';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
  allowSorting?: boolean;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  allowSorting = true,
  className,
}: DataTableColumnHeaderProps<TData, TValue>): React.JSX.Element {
  // Nếu allowSorting là false hoặc TanStack Column không cho phép sort
  if (!allowSorting || !column.getCanSort()) {
    return (
      <div className={cn('text-xs font-semibold text-muted-foreground select-none', className)}>
        {title}
      </div>
    );
  }

  const isSorted = column.getIsSorted();

  const handleToggleSorting = () => {
    if (isSorted === 'desc') {
      column.toggleSorting(false); // Đổi sang asc
    } else {
      column.toggleSorting(true); // Đổi sang desc
    }
  };

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2.5 h-8 data-[state=open]:bg-accent text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer select-none gap-1"
        onClick={handleToggleSorting}
      >
        <span>{title}</span>
        {isSorted === 'desc' ? (
          <Icon icon="lucide:arrow-down" className="size-3.5 text-primary" />
        ) : isSorted === 'asc' ? (
          <Icon icon="lucide:arrow-up" className="size-3.5 text-primary" />
        ) : (
          <Icon icon="lucide:chevrons-up-down" className="size-3.5 text-muted-foreground/50" />
        )}
      </Button>
    </div>
  );
}
