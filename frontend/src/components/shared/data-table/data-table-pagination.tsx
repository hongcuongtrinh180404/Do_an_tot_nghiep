'use client';

import * as React from 'react';
import type { Table } from '@tanstack/react-table';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  totalItems?: number;
  pageSizeOptions?: number[];
}

export function DataTablePagination<TData>({
  table,
  totalItems,
  pageSizeOptions = [10, 20, 50],
}: DataTablePaginationProps<TData>): React.JSX.Element {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const currentTotal = totalItems ?? table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-card border-t border-border/60 shrink-0 select-none">
      {/* Left: Selection / Total counts */}
      <div className="text-xs text-muted-foreground">
        {selectedCount > 0 ? (
          <span>
            Đã chọn <strong className="text-foreground">{selectedCount}</strong> trên{' '}
            <strong className="text-foreground">{currentTotal}</strong> dòng.
          </span>
        ) : (
          <span>
            Tổng cộng <strong className="text-foreground font-semibold">{currentTotal}</strong> bản ghi
          </span>
        )}
      </div>

      {/* Right: Page size select & Navigation controls */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Page size dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Hiển thị</span>
          <div className="w-28 shrink-0">
            <Select<string>
              value={String(pageSize)}
              onValueChange={(val) => {
                if (val !== null) {
                  table.setPageSize(Number(val));
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs px-2.5 whitespace-nowrap gap-1.5">
                <span className="truncate whitespace-nowrap">{pageSize} dòng</span>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-28">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    <span className="whitespace-nowrap">{size} dòng</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current page indicator */}
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          Trang <strong className="text-foreground">{pageIndex + 1}</strong> /{' '}
          <strong className="text-foreground">{pageCount || 1}</strong>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Trang đầu"
          >
            <Icon icon="lucide:chevrons-left" className="size-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Trang trước"
          >
            <Icon icon="lucide:chevron-left" className="size-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Trang sau"
          >
            <Icon icon="lucide:chevron-right" className="size-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Trang cuối"
          >
            <Icon icon="lucide:chevrons-right" className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
