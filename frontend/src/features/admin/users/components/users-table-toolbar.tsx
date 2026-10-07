'use client';

import * as React from 'react';
import type { Table } from '@tanstack/react-table';
import type { IUserProfile } from 'share-lib';
import {
  DataTableToolbar,
  DataTableFacetedFilter,
} from '@/components/shared/data-table';
import {
  ROLE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from '../constants/user-filter-options';

interface UsersTableToolbarProps {
  table: Table<IUserProfile>;
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedRoles: string[];
  onRolesChange: (roles: string[]) => void;
  selectedStatuses: string[];
  onStatusesChange: (statuses: string[]) => void;
  isFiltered: boolean;
  onResetFilters: () => void;
}

export function UsersTableToolbar({
  table,
  searchValue,
  onSearchChange,
  selectedRoles,
  onRolesChange,
  selectedStatuses,
  onStatusesChange,
  isFiltered,
  onResetFilters,
}: UsersTableToolbarProps): React.JSX.Element {
  return (
    <DataTableToolbar
      table={table}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder="Tìm kiếm tên, email, tài khoản..."
      isFiltered={isFiltered}
      onResetFilters={onResetFilters}
    >
      <DataTableFacetedFilter
        title="Vai trò"
        options={ROLE_FILTER_OPTIONS}
        selectedValues={selectedRoles}
        onSelect={onRolesChange}
      />

      <DataTableFacetedFilter
        title="Trạng thái"
        options={STATUS_FILTER_OPTIONS}
        selectedValues={selectedStatuses}
        onSelect={onStatusesChange}
      />
    </DataTableToolbar>
  );
}
