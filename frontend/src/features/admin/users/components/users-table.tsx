'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  type VisibilityState,
  type PaginationState,
} from '@tanstack/react-table';
import { BaseDataTable, useDataTableUrlState } from '@/components/shared/data-table';
import { userColumns } from './user-columns';
import { UsersTableToolbar } from './users-table-toolbar';
import { useAdminUsersQuery } from '../api/users-admin.api';

export function UsersTable(): React.JSX.Element {
  const {
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
  } = useDataTableUrlState({
    defaultLimit: 10,
    defaultSort: { orderBy: 'createdAt', order: 'desc' },
  });

  const selectedRoles = getFilter('role');
  const selectedStatuses = getFilter('status');

  // Query Backend với tham số thực tế, bao gồm cả sorting gửi xuống DB
  const { data, isLoading } = useAdminUsersQuery({
    page,
    limit,
    search: searchValue,
    role: selectedRoles.length === 1 ? selectedRoles[0] : undefined,
    status: selectedStatuses.length === 1 ? selectedStatuses[0] : undefined,
    sort: sortParam,
  });

  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  // Pagination state bound to URL
  const pagination: PaginationState = React.useMemo(
    () => ({
      pageIndex: page - 1,
      pageSize: limit,
    }),
    [page, limit],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data?.items || [],
    columns: userColumns,
    pageCount: data?.totalPages || 1,
    state: {
      sorting,
      columnVisibility,
      pagination,
    },
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: (updater) => {
      const nextState =
        typeof updater === 'function' ? updater(pagination) : updater;
      if (nextState.pageIndex !== pagination.pageIndex) {
        setPage(nextState.pageIndex + 1);
      }
      if (nextState.pageSize !== pagination.pageSize) {
        setLimit(nextState.pageSize);
      }
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  const isFiltered =
    Boolean(searchValue.trim()) ||
    selectedRoles.length > 0 ||
    selectedStatuses.length > 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8 space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Quản Lý Người Dùng
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Danh sách tất cả tài khoản trong hệ thống kèm trạng thái, vai trò và ngày khởi tạo.
          </p>
        </div>
      </div>

      {/* Toolbar for Search & Faceted Filter options */}
      <UsersTableToolbar
        table={table}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        selectedRoles={selectedRoles}
        onRolesChange={(roles) => setFilter('role', roles)}
        selectedStatuses={selectedStatuses}
        onStatusesChange={(statuses) => setFilter('status', statuses)}
        isFiltered={isFiltered}
        onResetFilters={resetFilters}
      />

      {/* Reusable BaseDataTable with Fixed Viewport & Sticky Header */}
      <BaseDataTable
        table={table}
        isLoading={isLoading}
        totalItems={data?.total}
        emptyTitle="Không có người dùng nào"
        emptyDescription="Không tìm thấy người dùng phù hợp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại."
        emptyIcon="lucide:user-x"
      />
    </div>
  );
}
