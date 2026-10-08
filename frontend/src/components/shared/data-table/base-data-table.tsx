'use client';

import * as React from 'react';
import { flexRender } from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from './data-table-pagination';
import { DataTableSkeleton } from './data-table-skeleton';
import { DataTableEmptyState } from './data-table-empty-state';
import { cn } from '@/lib/utils';
import type { BaseDataTableProps } from './types';

export function BaseDataTable<TData>({
  table,
  isLoading = false,
  totalItems,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  className,
}: BaseDataTableProps<TData>): React.JSX.Element {
  const visibleColumnsCount = table.getVisibleLeafColumns().length || 5;

  return (
    <div
      className={cn(
        'flex flex-col flex-1 min-h-0 rounded-xl border border-border/60 bg-card overflow-hidden shadow-2xs',
        className,
      )}
    >
      {/* Scrollable Table Viewport with Sticky Header */}
      <div className="flex-1 min-h-0 overflow-auto relative">
        <Table>
          <TableHeader className="sticky top-0 z-1 bg-card/95 backdrop-blur-xs border-b border-border/60 shadow-2xs">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b-0">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <DataTableSkeleton
                columnCount={visibleColumnsCount}
                rowCount={6}
              />
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <DataTableEmptyState
                colSpan={visibleColumnsCount}
                title={emptyTitle}
                description={emptyDescription}
                icon={emptyIcon}
              />
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pinned Pagination at the bottom */}
      <DataTablePagination table={table} totalItems={totalItems} />
    </div>
  );
}
