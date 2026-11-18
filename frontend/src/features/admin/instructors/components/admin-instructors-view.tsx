'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  type VisibilityState,
  type PaginationState,
} from '@tanstack/react-table';
import {
  InstructorApplicationStatusEnum,
  type IInstructorApplication,
} from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BaseDataTable, useDataTableUrlState } from '@/components/shared/data-table';
import {
  useAdminInstructorApplicationsQuery,
  usePendingApplicationsCountQuery,
} from '../api/admin-instructors.api';
import { createInstructorApprovalColumns } from './instructor-approval-columns';
import { InstructorApprovalDialog } from './instructor-approval-dialog';
import { InstructorRejectionDialog } from './instructor-rejection-dialog';
import { InstructorDetailDialog } from './instructor-detail-dialog';
import { InstructorTermsDialog } from './instructor-terms-dialog';
import type { InstructorApprovalTabType } from '../types';

export function AdminInstructorsView(): React.JSX.Element {
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

  // Selected tab: 'PENDING' | 'HISTORY'
  const selectedTabArray = getFilter('tab');
  const currentTab: InstructorApprovalTabType =
    selectedTabArray.length === 1 && selectedTabArray[0] === 'HISTORY'
      ? 'HISTORY'
      : 'PENDING';

  // Sub-status filter in History tab
  const selectedStatusArray = getFilter('status');
  const currentStatus =
    selectedStatusArray.length === 1 ? selectedStatusArray[0] : 'ALL';

  // Modal dialog states
  const [selectedApplication, setSelectedApplication] =
    React.useState<IInstructorApplication | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isApproveOpen, setIsApproveOpen] = React.useState(false);
  const [isRejectOpen, setIsRejectOpen] = React.useState(false);
  const [isTermsOpen, setIsTermsOpen] = React.useState(false);

  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  // Query Backend with real server-side parameters
  const { data, isLoading, refetch } = useAdminInstructorApplicationsQuery({
    page,
    limit,
    tab: currentTab,
    status:
      currentTab === 'HISTORY' && currentStatus !== 'ALL'
        ? (currentStatus as InstructorApplicationStatusEnum)
        : undefined,
    search: searchValue,
    sort: sortParam,
  });

  // Query general pending count for badge
  const pendingCountQuery = usePendingApplicationsCountQuery();
  const pendingTotal = pendingCountQuery.data?.pendingCount ?? 0;

  // Pagination state bound to URL
  const pagination: PaginationState = React.useMemo(
    () => ({
      pageIndex: page - 1,
      pageSize: limit,
    }),
    [page, limit],
  );

  const handleOpenDetail = (app: IInstructorApplication) => {
    setSelectedApplication(app);
    setIsDetailOpen(true);
  };

  const handleOpenApprove = (app: IInstructorApplication) => {
    setSelectedApplication(app);
    setIsApproveOpen(true);
  };

  const handleOpenReject = (app: IInstructorApplication) => {
    setSelectedApplication(app);
    setIsRejectOpen(true);
  };

  const columns = React.useMemo(
    () =>
      createInstructorApprovalColumns({
        onViewDetail: handleOpenDetail,
        onApprove: handleOpenApprove,
        onReject: handleOpenReject,
      }),
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data?.items || [],
    columns,
    pageCount: data?.totalPages || 1,
    state: {
      sorting,
      columnVisibility,
      pagination,
    },
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: (updater) => {
      const nextState = typeof updater === 'function' ? updater(pagination) : updater;
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

  const handleTabChange = (newTab: InstructorApprovalTabType) => {
    setFilter('tab', newTab === 'PENDING' ? [] : ['HISTORY']);
    setPage(1);
  };

  const handleStatusChange = (statusValue: string) => {
    if (statusValue === 'ALL') {
      setFilter('status', []);
    } else {
      setFilter('status', [statusValue]);
    }
    setPage(1);
  };

  const isFiltered =
    Boolean(searchValue.trim()) ||
    (currentTab === 'HISTORY' && currentStatus !== 'ALL');

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8 space-y-4">
      {/* 1. Header Information & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span>Phê Duyệt Giảng Viên</span>
            {pendingTotal > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                <Icon icon="lucide:clock" className="size-3 animate-pulse" />
                <span>{pendingTotal} chờ duyệt</span>
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Kiểm duyệt hồ sơ đăng ký giảng viên, xét duyệt năng lực sư phạm và quản lý điều khoản hợp tác.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Button Thiết lập điều khoản */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsTermsOpen(true)}
            className="text-xs h-9 gap-1.5 border-border/80 hover:bg-muted font-medium cursor-pointer"
          >
            <Icon icon="lucide:file-text" className="size-3.5 text-primary" />
            <span>Thiết lập điều khoản</span>
          </Button>

          {/* Refresh Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void refetch();
              void pendingCountQuery.refetch();
            }}
            className="text-xs h-9 gap-1.5 cursor-pointer"
            title="Làm mới danh sách"
          >
            <Icon
              icon="lucide:rotate-cw"
              className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Làm mới</span>
          </Button>
        </div>
      </div>

      {/* 2. Main 2 Tabs: Phê duyệt (PENDING) vs Lịch sử phê duyệt (HISTORY) */}
      <div className="flex items-center justify-between border-b border-border/60 pb-1 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('PENDING')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
              currentTab === 'PENDING'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Icon icon="lucide:clock" className="size-4" />
            <span>Phê duyệt</span>
            {pendingTotal > 0 && (
              <span className="ml-1 text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                {pendingTotal}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('HISTORY')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
              currentTab === 'HISTORY'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Icon icon="lucide:history" className="size-4" />
            <span>Lịch sử phê duyệt</span>
          </button>
        </div>

        {/* Sub-status filter when in HISTORY tab */}
        {currentTab === 'HISTORY' && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Lọc lịch sử:</span>
            <button
              type="button"
              onClick={() => handleStatusChange('ALL')}
              className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${
                currentStatus === 'ALL'
                  ? 'bg-secondary text-secondary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange(InstructorApplicationStatusEnum.APPROVED)}
              className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${
                currentStatus === InstructorApplicationStatusEnum.APPROVED
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Đã duyệt
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange(InstructorApplicationStatusEnum.REJECTED)}
              className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${
                currentStatus === InstructorApplicationStatusEnum.REJECTED
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Đã từ chối
            </button>
          </div>
        )}
      </div>

      {/* 3. Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Icon
            icon="lucide:search"
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Tìm theo tên ứng viên, email, số điện thoại, lĩnh vực..."
            className="pl-9 h-9 text-xs bg-card"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => setSearchValue('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <Icon icon="lucide:x" className="size-3.5" />
            </button>
          )}
        </div>

        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => resetFilters()}
            className="text-xs h-9 text-muted-foreground hover:text-foreground cursor-pointer self-start sm:self-auto"
          >
            <Icon icon="lucide:x" className="size-3.5 mr-1" />
            <span>Xóa bộ lọc</span>
          </Button>
        )}
      </div>

      {/* 4. Table Container */}
      <Card className="flex-1 min-h-0 flex flex-col border-border/60 bg-card overflow-hidden">
        <BaseDataTable
          table={table}
          isLoading={isLoading}
          totalItems={data?.total}
          emptyTitle={
            currentTab === 'PENDING'
              ? 'Không có hồ sơ chờ duyệt'
              : 'Không có dữ liệu lịch sử'
          }
          emptyDescription={
            currentTab === 'PENDING'
              ? 'Hiện không có hồ sơ giảng viên nào đang chờ phê duyệt.'
              : 'Không tìm thấy hồ sơ nào trong lịch sử phê duyệt.'
          }
          className="flex-1 min-h-0"
        />
      </Card>

      {/* 5. Modals & Dialogs */}
      <InstructorDetailDialog
        application={selectedApplication}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onApprove={(app) => {
          setSelectedApplication(app);
          setIsApproveOpen(true);
        }}
        onReject={(app) => {
          setSelectedApplication(app);
          setIsRejectOpen(true);
        }}
      />

      <InstructorApprovalDialog
        application={selectedApplication}
        open={isApproveOpen}
        onOpenChange={setIsApproveOpen}
      />

      <InstructorRejectionDialog
        application={selectedApplication}
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
      />

      <InstructorTermsDialog
        open={isTermsOpen}
        onOpenChange={setIsTermsOpen}
      />
    </div>
  );
}
