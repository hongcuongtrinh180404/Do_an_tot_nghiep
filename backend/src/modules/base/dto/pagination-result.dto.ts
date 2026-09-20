export interface SortOption {
  orderBy: string;
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  isPagination?: boolean;
  sort?: SortOption[];
  filters?: Record<string, unknown>;
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
