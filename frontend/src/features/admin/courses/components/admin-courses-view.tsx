'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  type VisibilityState,
  type PaginationState,
} from '@tanstack/react-table';
import { CourseApprovalActionEnum, CourseStatusEnum, type ICourse, type ICourseApprovalHistory } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BaseDataTable, useDataTableUrlState } from '@/components/shared/data-table';
import {
  useAdminCoursesQuery,
  useAdminCourseStatsQuery,
  useAdminCourseApprovalHistoriesQuery,
  useAdminCourseApprovalHistoryStatsQuery,
} from '../api/admin-courses.api';
import { createAdminCourseColumns } from './admin-course-columns';
import { createAdminCourseApprovalHistoryColumns } from './admin-course-approval-history-columns';
import { AdminCourseStats } from './admin-course-stats';
import { CourseApprovalDialog } from './course-approval-dialog';
import { CourseRejectionDialog } from './course-rejection-dialog';
import { CourseApprovalHistoryDetailDialog } from './course-approval-history-detail-dialog';
import { CourseTimelineHistoryDialog } from './course-timeline-history-dialog';
import type { AdminCoursesTabType, CourseApprovalHistoryStatusFilter } from '../types';

const STATUS_TABS: Array<{ value: string; label: string; icon: string }> = [
  { value: 'ALL', label: 'Tất cả', icon: 'lucide:layers' },
  { value: CourseStatusEnum.PENDING_APPROVAL, label: 'Chờ duyệt', icon: 'lucide:clock' },
  { value: CourseStatusEnum.PUBLISHED, label: 'Đã xuất bản', icon: 'lucide:check-circle-2' },
  { value: CourseStatusEnum.DRAFT, label: 'Bản nháp', icon: 'lucide:file-edit' },
  { value: CourseStatusEnum.ARCHIVED, label: 'Ngưng bán', icon: 'lucide:archive' },
];

export function AdminCoursesView(): React.JSX.Element {
  // Shared URL state for tab, status, pagination, search and sort
  const {
    page,
    limit,
    searchValue,
    setSearchValue,
    setPage,
    setLimit,
    setFilter,
    setFilters,
    getFilter,
    resetFilters,
    sorting,
    setSorting,
    sortParam,
  } = useDataTableUrlState({
    defaultLimit: 10,
    defaultSort: { orderBy: 'createdAt', order: 'desc' },
  });

  // 1. Main Navigation Tab (COURSES | HISTORY)
  const tabFilterArray = getFilter('tab');
  const currentTab: AdminCoursesTabType = tabFilterArray[0] === 'HISTORY' ? 'HISTORY' : 'COURSES';

  // 2. Sub-status filter in History tab (ALL | APPROVED | REJECTED)
  const historyStatusArray = getFilter('historyStatus');
  const historyStatus: CourseApprovalHistoryStatusFilter =
    (historyStatusArray[0] as CourseApprovalHistoryStatusFilter) || 'ALL';

  // 3. Status filter in Courses tab
  const selectedStatusArray = getFilter('status');
  const currentStatus = selectedStatusArray.length === 1 ? selectedStatusArray[0] : 'ALL';

  // Target courses/histories for modals
  const [approvingCourse, setApprovingCourse] = React.useState<ICourse | null>(null);
  const [rejectingCourse, setRejectingCourse] = React.useState<ICourse | null>(null);
  const [selectedHistory, setSelectedHistory] = React.useState<ICourseApprovalHistory | null>(null);
  const [timelineCourse, setTimelineCourse] = React.useState<{ id: string; title?: string } | null>(null);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  // 4. Data queries for Tab 1 (Courses)
  const {
    data: coursesData,
    isLoading: isCoursesLoading,
    isFetching: isCoursesFetching,
    refetch: refetchCourses,
  } = useAdminCoursesQuery({
    page,
    limit,
    search: searchValue,
    status: currentStatus !== 'ALL' ? (currentStatus as CourseStatusEnum) : undefined,
    sort: sortParam,
  });

  const statsQuery = useAdminCourseStatsQuery();
  const pendingTotal = statsQuery.data?.pendingApproval ?? 0;

  // 5. Data queries for Tab 2 (History)
  const historyStatsQuery = useAdminCourseApprovalHistoryStatsQuery();
  const historyTotal = historyStatsQuery.data?.total ?? 0;
  const approvedTotal = historyStatsQuery.data?.approved ?? 0;
  const rejectedTotal = historyStatsQuery.data?.rejected ?? 0;

  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    refetch: refetchHistory,
  } = useAdminCourseApprovalHistoriesQuery({
    page,
    limit,
    search: searchValue,
    action:
      historyStatus === 'APPROVED'
        ? CourseApprovalActionEnum.APPROVED
        : historyStatus === 'REJECTED'
          ? CourseApprovalActionEnum.REJECTED
          : undefined,
    sort: sortParam,
  });

  const isRefreshing =
    currentTab === 'COURSES'
      ? isCoursesFetching || statsQuery.isFetching
      : isHistoryFetching || historyStatsQuery.isFetching;

  // Pagination state bound to URL
  const pagination: PaginationState = React.useMemo(
    () => ({
      pageIndex: page - 1,
      pageSize: limit,
    }),
    [page, limit],
  );

  // Tab 1 Columns
  const courseColumns = React.useMemo(
    () =>
      createAdminCourseColumns({
        onApprove: (course) => setApprovingCourse(course),
        onReject: (course) => setRejectingCourse(course),
        onViewHistory: (course) => setTimelineCourse({ id: course.id, title: course.title }),
      }),
    [],
  );

  // Tab 2 Columns
  const historyColumns = React.useMemo(
    () =>
      createAdminCourseApprovalHistoryColumns({
        onViewDetail: (history) => setSelectedHistory(history),
        onViewCourseTimeline: (courseId, title) => setTimelineCourse({ id: courseId, title }),
      }),
    [],
  );

  // Table instance for Tab 1
  // eslint-disable-next-line react-hooks/incompatible-library
  const coursesTable = useReactTable({
    data: coursesData?.items || [],
    columns: courseColumns,
    pageCount: coursesData?.totalPages || 1,
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

  // Table instance for Tab 2
  // eslint-disable-next-line react-hooks/incompatible-library
  const historyTable = useReactTable({
    data: historyData?.items || [],
    columns: historyColumns,
    pageCount: historyData?.totalPages || 1,
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

  const handleTabChange = (newTab: AdminCoursesTabType) => {
    if (newTab === 'HISTORY') {
      setFilter('tab', ['HISTORY']);
    } else {
      setFilters({ tab: [], historyStatus: [] });
    }
  };

  const handleStatusChange = (statusValue: string) => {
    if (statusValue === 'ALL') {
      setFilter('status', []);
    } else {
      setFilter('status', [statusValue]);
    }
  };

  const handleHistoryStatusChange = (statusValue: CourseApprovalHistoryStatusFilter) => {
    if (statusValue === 'ALL') {
      setFilter('historyStatus', []);
    } else {
      setFilter('historyStatus', [statusValue]);
    }
  };

  const handleResetFilters = () => {
    resetFilters();
    if (currentTab === 'HISTORY') {
      setFilter('historyStatus', []);
    }
  };

  const isFiltered =
    Boolean(searchValue.trim()) ||
    (currentTab === 'COURSES' ? currentStatus !== 'ALL' : historyStatus !== 'ALL');

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8 space-y-4">
      {/* 1. Header Information */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span>Quản Lý & Phê Duyệt Khóa Học</span>
            {pendingTotal > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300 px-2.5 py-0.5 rounded-full border border-sky-500/30">
                <Icon icon="lucide:bell" className="size-3" />
                <span>{pendingTotal} chờ duyệt</span>
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Kiểm duyệt chất lượng nội dung, quản lý trạng thái xuất bản và theo dõi nhật ký lịch sử phê duyệt.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (currentTab === 'COURSES') {
              void refetchCourses();
              void statsQuery.refetch();
            } else {
              void refetchHistory();
              void historyStatsQuery.refetch();
            }
          }}
          disabled={isRefreshing}
          className="h-8.5 text-xs gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Icon
            icon="lucide:refresh-cw"
            className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span>Làm mới</span>
        </Button>
      </div>

      {/* 2. Main 2 Tabs: Danh sách khóa học vs Lịch sử phê duyệt */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-1 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('COURSES')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
              currentTab === 'COURSES'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Icon icon="lucide:book-open" className="size-4" />
            <span>Danh sách khóa học</span>
            {pendingTotal > 0 && (
              <span className="ml-1 text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300">
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
            {historyTotal > 0 && (
              <span className="ml-1 text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                {historyTotal}
              </span>
            )}
          </button>
        </div>

        {/* Sub-status filter when in HISTORY tab */}
        {currentTab === 'HISTORY' && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs py-1">
            <span className="text-muted-foreground hidden sm:inline">Lọc:</span>
            <button
              type="button"
              onClick={() => handleHistoryStatusChange('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                historyStatus === 'ALL'
                  ? 'bg-secondary text-secondary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <span>Tất cả</span>
              {historyTotal > 0 && (
                <span className="ml-1.5 text-[10px] opacity-75 font-mono">({historyTotal})</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleHistoryStatusChange('APPROVED')}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                historyStatus === 'APPROVED'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <span>Đã phê duyệt</span>
              {approvedTotal > 0 && (
                <span className="ml-1.5 text-[10px] opacity-75 font-mono">({approvedTotal})</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleHistoryStatusChange('REJECTED')}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                historyStatus === 'REJECTED'
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <span>Đã từ chối</span>
              {rejectedTotal > 0 && (
                <span className="ml-1.5 text-[10px] opacity-75 font-mono">({rejectedTotal})</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 3. Tab 1 Content: Stat Cards & Status Tabs */}
      {currentTab === 'COURSES' && (
        <>
          <AdminCourseStats
            stats={statsQuery.data}
            currentStatus={currentStatus}
            isPending={statsQuery.isPending}
            isFetching={statsQuery.isFetching}
            isError={statsQuery.isError}
            onStatusChange={handleStatusChange}
            onRetry={() => { void statsQuery.refetch(); }}
          />

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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
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
                  onClick={handleResetFilters}
                  className="h-8.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <Icon icon="lucide:x" className="size-3" />
                  <span>Đặt lại bộ lọc</span>
                </Button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 min-h-0 flex flex-col">
            <BaseDataTable
              table={coursesTable}
              isLoading={isCoursesLoading}
              totalItems={coursesData?.total ?? 0}
              emptyTitle="Không tìm thấy khóa học"
              emptyDescription="Không có khóa học nào phù hợp với điều kiện lọc hiện tại."
            />
          </div>
        </>
      )}

      {/* 4. Tab 2 Content: Approval History */}
      {currentTab === 'HISTORY' && (
        <>
          {/* History Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="relative flex-1 max-w-md">
              <Icon
                icon="lucide:search"
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
              />
              <Input
                type="text"
                placeholder="Tìm theo tên khóa học, giảng viên, admin hoặc lý do..."
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
                onClick={handleResetFilters}
                className="h-8.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Icon icon="lucide:x" className="size-3" />
                <span>Đặt lại bộ lọc</span>
              </Button>
            )}
          </div>

          {/* Table Container */}
          <div className="flex-1 min-h-0 flex flex-col">
            <BaseDataTable
              table={historyTable}
              isLoading={isHistoryLoading}
              totalItems={historyData?.total ?? 0}
              emptyTitle="Chưa có lịch sử phê duyệt"
              emptyDescription="Không tìm thấy lần phê duyệt hoặc từ chối nào phù hợp với điều kiện tìm kiếm."
            />
          </div>
        </>
      )}

      {/* 5. Modals for Course Approval & Rejection */}
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

      {/* 6. Modals for History Detail & Course Timeline */}
      <CourseApprovalHistoryDetailDialog
        history={selectedHistory}
        open={Boolean(selectedHistory)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedHistory(null);
        }}
        onOpenCourseTimeline={(courseId, title) => {
          setTimelineCourse({ id: courseId, title });
        }}
      />

      <CourseTimelineHistoryDialog
        courseId={timelineCourse?.id ?? null}
        courseTitle={timelineCourse?.title}
        open={Boolean(timelineCourse)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setTimelineCourse(null);
        }}
      />
    </div>
  );
}
