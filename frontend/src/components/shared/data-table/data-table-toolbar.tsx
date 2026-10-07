'use client';

import * as React from 'react';
import type { Table } from '@tanstack/react-table';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataTableViewOptions } from './data-table-view-options';

interface DataTableToolbarProps<TData> {
  table?: Table<TData>;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  isFiltered?: boolean;
  onResetFilters?: () => void;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

export function DataTableToolbar<TData>({
  table,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  isFiltered = false,
  onResetFilters,
  children,
  actions,
}: DataTableToolbarProps<TData>): React.JSX.Element {
  return (
    <div className="relative z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-2 shrink-0">
      {/* Left: Search input + Faceted filter popovers */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {onSearchChange && (
          <div className="relative w-full sm:w-64 md:w-72">
            <Icon
              icon="lucide:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 pl-9 pr-8 text-xs bg-card border-border/80"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded-xs"
                aria-label="Xóa tìm kiếm"
              >
                <Icon icon="lucide:x" className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Faceted filters injected as children */}
        {children}

        {/* Reset button when filters are active */}
        {isFiltered && onResetFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <Icon icon="lucide:rotate-ccw" className="size-3.5" />
            <span>Đặt lại</span>
          </Button>
        )}
      </div>

      {/* Right: View Options + Custom Action buttons */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        {actions}
        {table && <DataTableViewOptions table={table} />}
      </div>
    </div>
  );
}
