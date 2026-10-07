import type { Table, Column } from '@tanstack/react-table';

export interface DataTableFilterOption {
  label: string;
  value: string;
  icon?: string;
  count?: number;
}

export interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: DataTableFilterOption[];
  selectedValues?: string[];
  onSelect?: (values: string[]) => void;
}

export interface DataTableSortOption {
  orderBy: string;
  order: 'asc' | 'desc';
}

export interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  totalItems?: number;
  pageSizeOptions?: number[];
}

export interface BaseDataTableProps<TData> {
  table: Table<TData>;
  isLoading?: boolean;
  totalItems?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: string;
  className?: string;
}
