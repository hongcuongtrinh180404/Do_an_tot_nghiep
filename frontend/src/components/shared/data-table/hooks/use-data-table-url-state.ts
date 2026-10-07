'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SortingState } from '@tanstack/react-table';

export interface UseDataTableUrlStateOptions {
  defaultLimit?: number;
  debounceMs?: number;
  defaultSort?: {
    orderBy: string;
    order: 'asc' | 'desc';
  };
}

export function useDataTableUrlState(options: UseDataTableUrlStateOptions = {}) {
  const {
    defaultLimit = 10,
    debounceMs = 350,
    defaultSort = { orderBy: 'createdAt', order: 'desc' },
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Phân trang
  const page = useMemo(() => {
    const raw = searchParams.get('page');
    const parsed = raw ? parseInt(raw, 10) : 1;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [searchParams]);

  const limit = useMemo(() => {
    const raw = searchParams.get('limit');
    const parsed = raw ? parseInt(raw, 10) : defaultLimit;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultLimit;
  }, [searchParams, defaultLimit]);

  // 2. Tìm kiếm
  const urlSearch = useMemo(() => {
    return searchParams.get('search') || '';
  }, [searchParams]);

  const [searchValue, setSearchValue] = useState(urlSearch);
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);

  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchValue(urlSearch);
  }

  // 3. Sắp xếp (Sorting) - Mặc định theo cột ngày tạo mới nhất (createdAt: desc)
  const activeSort = useMemo(() => {
    const rawSort = searchParams.get('sort');
    if (!rawSort) {
      return defaultSort;
    }

    try {
      if (rawSort.startsWith('[') || rawSort.startsWith('{')) {
        const parsed = JSON.parse(rawSort);
        const item = Array.isArray(parsed) ? parsed[0] : parsed;
        if (item?.orderBy) {
          return {
            orderBy: String(item.orderBy),
            order: item.order === 'asc' ? ('asc' as const) : ('desc' as const),
          };
        }
      }
    } catch {
      // Not JSON, continue to parse colon format
    }

    if (rawSort.includes(':')) {
      const [col, dir] = rawSort.split(':');
      if (col) {
        return {
          orderBy: col,
          order: dir?.toLowerCase() === 'asc' ? ('asc' as const) : ('desc' as const),
        };
      }
    }

    return {
      orderBy: rawSort,
      order: 'desc' as const,
    };
  }, [searchParams, defaultSort]);

  // TanStack Table SortingState
  const sorting: SortingState = useMemo(() => {
    return [{ id: activeSort.orderBy, desc: activeSort.order === 'desc' }];
  }, [activeSort]);

  const sortParam = useMemo(() => {
    return `${activeSort.orderBy}:${activeSort.order}`;
  }, [activeSort]);

  // Helper cập nhật URL
  const updateUrl = useCallback(
    (params: URLSearchParams) => {
      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [pathname, router],
  );

  // Debounce tìm kiếm
  useEffect(() => {
    if (searchValue === urlSearch) return;

    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = searchValue.trim();

      if (trimmed) {
        params.set('search', trimmed);
      } else {
        params.delete('search');
      }

      params.set('page', '1');
      updateUrl(params);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [searchValue, urlSearch, searchParams, debounceMs, updateUrl]);

  // Cập nhật trang
  const setPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage <= 1) {
        params.delete('page');
      } else {
        params.set('page', newPage.toString());
      }
      updateUrl(params);
    },
    [searchParams, updateUrl],
  );

  // Cập nhật số dòng trên trang
  const setLimit = useCallback(
    (newLimit: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('limit', newLimit.toString());
      params.set('page', '1');
      updateUrl(params);
    },
    [searchParams, updateUrl],
  );

  // Cập nhật bộ lọc
  const setFilter = useCallback(
    (key: string, value: string | string[] | undefined) => {
      const params = new URLSearchParams(searchParams.toString());

      if (!value || (Array.isArray(value) && value.length === 0)) {
        params.delete(key);
      } else if (Array.isArray(value)) {
        params.set(key, value.join(','));
      } else {
        params.set(key, value);
      }

      params.set('page', '1');
      updateUrl(params);
    },
    [searchParams, updateUrl],
  );

  const getFilter = useCallback(
    (key: string): string[] => {
      const val = searchParams.get(key);
      if (!val) return [];
      return val.split(',').filter(Boolean);
    },
    [searchParams],
  );

  // Cập nhật Sorting cho TanStack Table
  const setSorting = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const nextSorting = typeof updater === 'function' ? updater(sorting) : updater;
      const params = new URLSearchParams(searchParams.toString());

      if (nextSorting.length > 0) {
        const first = nextSorting[0];
        const isDefault =
          first.id === defaultSort.orderBy &&
          (first.desc ? 'desc' : 'asc') === defaultSort.order;

        if (isDefault) {
          params.delete('sort');
        } else {
          params.set('sort', `${first.id}:${first.desc ? 'desc' : 'asc'}`);
        }
      } else {
        params.delete('sort');
      }

      params.set('page', '1');
      updateUrl(params);
    },
    [sorting, defaultSort, searchParams, updateUrl],
  );

  const resetFilters = useCallback(() => {
    setSearchValue('');
    const params = new URLSearchParams();
    if (limit !== defaultLimit) {
      params.set('limit', limit.toString());
    }
    updateUrl(params);
  }, [limit, defaultLimit, updateUrl]);

  return {
    page,
    limit,
    searchValue,
    setSearchValue,
    setPage,
    setLimit,
    setFilter,
    getFilter,
    resetFilters,
    sorting,
    setSorting,
    sortParam,
  };
}
