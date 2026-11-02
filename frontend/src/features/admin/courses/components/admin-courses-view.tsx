'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  type VisibilityState,
  type PaginationState,
} from '@tanstack/react-table';
import { CourseStatusEnum, type ICourse } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BaseDataTable, useDataTableUrlState } from '@/components/shared/data-table';
import { useAdminCoursesQuery } from '../api/admin-courses.api';
import { createAdminCourseColumns } from './admin-course-columns';
import { CourseApprovalDialog } from './course-approval-dialog';
import { CourseRejectionDialog } from './course-rejection-dialog';

const STATUS_TABS: Array<{ value: string; label: string; icon: string }> = [
  { value: 'ALL', label: 'Tất cả', icon: 'lucide:layers' },
  { value: CourseStatusEnum.PENDING_APPROVAL, label: 'Chờ duyệt', icon: 'lucide:clock' },
  { value: CourseStatusEnum.PUBLISHED, label: 'Đã xuất bản', icon: 'lucide:check-circle-2' },
  { value: CourseStatusEnum.DRAFT, label: 'Bản nháp', icon: 'lucide:file-edit' },
  { value: CourseStatusEnum.ARCHIVED, label: 'Lưu trữ', icon: 'lucide:archive' },
];

export function AdminCoursesView(): React.JSX.Element {
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

  const selectedStatusArray = getFilter('status');
  const currentStatus = selectedStatusArray.length === 1 ? selectedStatusArray[0] : 'ALL';

  // Target courses for modals
  const [approvingCourse, setApprovingCourse] = React.useState<ICourse | null>(null);
  const [rejectingCourse, setRejectingCourse] = React.useState<ICourse | null>(null);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  // Query Backend with real server-side parameters
  const { data, isLoading, isError, refetch } = useAdminCoursesQuery({
    page,
    limit,
    search: searchValue,
    status: currentStatus !== 'ALL' ? (currentStatus as CourseStatusEnum) : undefined,
    sort: sortParam,
  });

  // Query general pending count for badge
  const pendingCountQuery = useAdminCoursesQuery({
    limit: 1,
    status: CourseStatusEnum.PENDING_APPROVAL,
  });
  const pendingTotal = pendingCountQuery.data?.total ?? 0;

  // Pagination state bound to URL
  const pagination: PaginationState = React.useMemo(
    () => ({
      pageIndex: page - 1,
      pageSize: limit,
    }),
    [page, limit],
  );

  const columns = React.useMemo(
    () =>
      createAdminCourseColumns({
        onApprove: (course) => setApprovingCourse(course),
        onReject: (course) => setRejectingCourse(course),
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

  const handleStatusChange = (statusValue: string) => {
    if (statusValue === 'ALL') {
      setFilter('status', []);
    } else {
      setFilter('status', [statusValue]);
    }
  };

  const isFiltered = Boolean(searchValue.trim()) || currentStatus !== 'ALL';

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8 space-y-4">
      {/* 1. Header Information */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span>Quản Lý & Phê Duyệt Khóa Học</span>
            {pendingTotal > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300 px-2.5 py-0.5 rounded-full border border-sky-500/30">
                <Icon icon="lucide:bell" className="size-3 animate-pulse" />
                <span>{pendingTotal} chờ duyệt</span>
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Kiểm duyệt chất lượng nội dung, quản lý trạng thái xuất bản và phản hồi yêu cầu chỉnh sửa cho giảng viên.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void refetch();
            void pendingCountQuery.refetch();
          }}
          disabled={isLoading}
          className="h-8.5 text-xs gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Icon
            icon="lucide:refresh-cw"
            className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`}
          />
          <span>Làm mới</span>
        </Button>
      </div>

      {/* 2. Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <Card className="p-3.5 bg-card/60 border-border/60">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Tổng khóa học</span>
            <Icon icon="lucide:book-open" className="size-4" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {data?.total ?? '--'}
          </div>
        </Card>

        <Card
          onClick={() => handleStatusChange(CourseStatusEnum.PENDING_APPROVAL)}
          className={`p-3.5 border transition-all cursor-pointer ${
            currentStatus === CourseStatusEnum.PENDING_APPROVAL
              ? 'bg-sky-500/10 border-sky-500/40 ring-1 ring-sky-500/30'
              : 'bg-card/60 border-border/60 hover:border-sky-500/30 hover:bg-sky-500/5'
          }`}
        >
          <div className="flex items-center justify-between text-sky-700 dark:text-sky-300 mb-1">
            <span className="text-xs font-medium">Chờ phê duyệt</span>
            <Icon icon="lucide:clock" className="size-4" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-sky-800 dark:text-sky-200">
            {pendingTotal}
          </div>
        </Card>

        <Card
          onClick={() => handleStatusChange(CourseStatusEnum.PUBLISHED)}
          className={`p-3.5 border transition-all cursor-pointer ${
            currentStatus === CourseStatusEnum.PUBLISHED
              ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
              : 'bg-card/60 border-border/60 hover:border-emerald-500/30 hover:bg-emerald-500/5'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 mb-1">
            <span className="text-xs font-medium">Đang xuất bản</span>
            <Icon icon="lucide:check-circle-2" className="size-4" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-800 dark:text-emerald-200">
            {currentStatus === CourseStatusEnum.PUBLISHED ? data?.total ?? '--' : 'Đang hoạt động'}
          </div>
        </Card>

        <Card
          onClick={() => handleStatusChange(CourseStatusEnum.DRAFT)}
          className={`p-3.5 border transition-all cursor-pointer ${
            currentStatus === CourseStatusEnum.DRAFT
              ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
              : 'bg-card/60 border-border/60 hover:border-amber-500/30 hover:bg-amber-500/5'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 mb-1">
            <span className="text-xs font-medium">Bản nháp / Cần sửa</span>
            <Icon icon="lucide:file-edit" className="size-4" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-800 dark:text-amber-200">
            {currentStatus === CourseStatusEnum.DRAFT ? data?.total ?? '--' : 'Chỉnh sửa'}
          </div>
        </Card>
      </div>

      {/* 3. Toolbar & Status Filter Tabs */}
      <div className="flex flex-col gap-3 shrink-0">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const isActive = currentStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleStatusChange(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-background text-foreground shadow-xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon icon={tab.icon} className="size-3.5" />
                <span>{tab.label}</span>
                {tab.value === CourseStatusEnum.PENDING_APPROVAL && pendingTotal > 0 && (
                  <span className="size-4.5 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center ml-0.5">
                    {pendingTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Icon
              icon="lucide:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="Tìm theo tên khóa học hoặc đường dẫn..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm bg-background border-border/60 rounded-xl"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => setSearchValue('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                title="Xóa tìm kiếm"
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
              onClick={resetFilters}
              className="h-8.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Icon icon="lucide:x" className="size-3" />
              <span>Đặt lại bộ lọc</span>
            </Button>
          )}
        </div>
      </div>

      {/* 4. Table Container with Fixed Viewport & Unified Scroll */}
      <div className="flex-1 min-h-0 flex flex-col">
        {isError && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            Không thể tải danh sách khóa học. Vui lòng thử làm mới.
          </p>
        )}
        <BaseDataTable
          table={table}
          isLoading={isLoading}
          totalItems={data?.total ?? 0}
          emptyTitle="Không tìm thấy khóa học"
          emptyDescription="Không có khóa học nào phù hợp với điều kiện lọc hiện tại."
        />
      </div>

      {/* 5. Modals for Approval & Rejection */}
      <CourseApprovalDialog
        course={approvingCourse}
        open={Boolean(approvingCourse)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setApprovingCourse(null);
        }}
      />

      <CourseRejectionDialog
        course={rejectingCourse}
        open={Boolean(rejectingCourse)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setRejectingCourse(null);
        }}
      />
    </div>
  );
}
