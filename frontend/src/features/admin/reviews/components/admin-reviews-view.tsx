'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  type VisibilityState,
  type PaginationState,
} from '@tanstack/react-table';
import type { IReview } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BaseDataTable, useDataTableUrlState } from '@/components/shared/data-table';
import { DeleteConfirmDialog } from '@/components/shared/dialog/delete-confirm-dialog';
import {
  useAdminReviewsQuery,
  useAdminReviewStatsQuery,
  useAdminDeleteReviewMutation,
} from '../api/admin-reviews.api';
import { createAdminReviewColumns } from './admin-review-columns';
import { ReviewDetailDialog } from './review-detail-dialog';
import { HideReviewDialog } from './hide-review-dialog';
import { RestoreReviewDialog } from './restore-review-dialog';
import { ReviewQueryError } from './review-query-error';

const STATUS_TABS: Array<{ value: string; label: string; icon: string }> = [
  { value: 'ALL', label: 'Tất cả', icon: 'lucide:layers' },
  { value: 'visible', label: 'Đang hiển thị', icon: 'lucide:check-circle-2' },
  { value: 'hidden', label: 'Đã bị ẩn', icon: 'lucide:eye-off' },
  { value: 'reported', label: 'Bị báo cáo', icon: 'lucide:flag' },
  { value: 'deleted', label: 'Thùng rác', icon: 'lucide:trash-2' },
];

export function AdminReviewsView(): React.JSX.Element {
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

  const selectedRatingArray = getFilter('rating');
  const currentRating = selectedRatingArray.length === 1 ? selectedRatingArray[0] : 'ALL';

  // State for Dialogs
  const [detailReviewId, setDetailReviewId] = React.useState<string | null>(null);
  const [hidingReview, setHidingReview] = React.useState<IReview | null>(null);
  const [restoringReview, setRestoringReview] = React.useState<IReview | null>(null);
  const [deletingReview, setDeletingReview] = React.useState<IReview | null>(null);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  // Mutations
  const deleteMutation = useAdminDeleteReviewMutation();

  // Queries
  const statsQuery = useAdminReviewStatsQuery();
  const { data: statsData } = statsQuery;

  const reviewsQuery = useAdminReviewsQuery({
    page,
    limit,
    search: searchValue,
    status: currentStatus !== 'ALL' ? currentStatus : undefined,
    rating: currentRating !== 'ALL' ? Number(currentRating) : undefined,
    sort: sortParam,
  });
  const { data, isLoading } = reviewsQuery;
  const isRefreshing = reviewsQuery.isFetching || statsQuery.isFetching;

  const pagination: PaginationState = React.useMemo(
    () => ({
      pageIndex: page - 1,
      pageSize: limit,
    }),
    [page, limit],
  );

  const columns = React.useMemo(
    () =>
      createAdminReviewColumns({
        onViewDetail: (review) => setDetailReviewId(review.id),
        onHide: (review) => setHidingReview(review),
        onRestore: (review) => setRestoringReview(review),
        onDelete: (review) => setDeletingReview(review),
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
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      if (next.pageSize !== limit) {
        setLimit(next.pageSize);
      } else if (next.pageIndex !== pagination.pageIndex) {
        setPage(next.pageIndex + 1);
      }
    },
    getCoreRowModel: getCoreRowModel(),
  });

  const handleTabChange = (val: string) => {
    if (val === 'ALL') {
      setFilter('status', []);
    } else {
      setFilter('status', [val]);
    }
  };

  const handleRatingChange = (val: string | null) => {
    if (!val || val === 'ALL') {
      setFilter('rating', []);
    } else {
      setFilter('rating', [val]);
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingReview) return;
    deleteMutation.mutate(
      {
        id: deletingReview.id,
        reason: 'Quản trị viên xóa mềm đánh giá vi phạm nghiêm trọng',
      },
      {
        onSuccess: () => {
          setDeletingReview(null);
        },
      },
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      {/* 1. Header with Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0">
        <Card className="p-3.5 border-border/80 bg-card/60 flex flex-row items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon icon="lucide:message-square" className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground truncate">Tổng đánh giá</p>
            <p className="text-lg font-bold text-foreground leading-tight">
              {statsData?.total ?? '—'}
            </p>
          </div>
        </Card>

        <Card className="p-3.5 border-border/80 bg-card/60 flex flex-row items-center gap-3">
          <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Icon icon="lucide:check-circle-2" className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground truncate">Đang công khai</p>
            <p className="text-lg font-bold text-emerald-600 leading-tight">
              {statsData?.visibleCount ?? '—'}
            </p>
          </div>
        </Card>

        <Card className="p-3.5 border-border/80 bg-card/60 flex flex-row items-center gap-3">
          <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Icon icon="lucide:eye-off" className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground truncate">Đã bị ẩn</p>
            <p className="text-lg font-bold text-amber-600 leading-tight">
              {statsData?.hiddenCount ?? '—'}
            </p>
          </div>
        </Card>

        <Card className="p-3.5 border-border/80 bg-card/60 flex flex-row items-center gap-3">
          <div className="size-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <Icon icon="lucide:flag" className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground truncate">Bị báo cáo</p>
            <p className="text-lg font-bold text-destructive leading-tight">
              {statsData?.reportedCount ?? '—'}
            </p>
          </div>
        </Card>

        <Card className="p-3.5 border-border/80 bg-card/60 flex flex-row items-center gap-3 col-span-2 sm:col-span-1">
          <div className="size-9 rounded-xl bg-amber-400/10 text-amber-500 flex items-center justify-center shrink-0">
            <Icon icon="lucide:star" className="size-4 fill-current" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground truncate">Điểm TB toàn sàn</p>
            <p className="text-lg font-bold text-foreground leading-tight">
              {statsData ? `${statsData.averageRating} / 5` : '—'}
            </p>
          </div>
        </Card>
      </div>

      {statsQuery.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Icon icon="lucide:alert-circle" className="size-4 text-destructive" />
          <span>Không thể cập nhật thống kê đánh giá.</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={statsQuery.isFetching}
            onClick={() => { void statsQuery.refetch(); }}
          >
            Thử lại thống kê
          </Button>
        </div>
      )}

      {/* 2. Status Navigation Tabs */}
      <div className="shrink-0 flex items-center gap-1.5 border-b border-border/60 pb-1 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const isActive = currentStatus === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTabChange(tab.value)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <Icon icon={tab.icon} className="size-3.5" />
              <span>{tab.label}</span>
              {tab.value === 'reported' && (statsData?.reportedCount ?? 0) > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                  {statsData?.reportedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Icon
              icon="lucide:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            />
            <Input
              aria-label="Tìm đánh giá theo học viên, khóa học hoặc nội dung"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Tìm theo học viên, khóa học hoặc nội dung..."
              className="pl-9 text-xs h-9"
            />
            {searchValue && (
              <button
                type="button"
                aria-label="Xóa tìm kiếm"
                onClick={() => setSearchValue('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <Icon icon="lucide:x" className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Star Filter */}
          <Select value={currentRating} onValueChange={handleRatingChange}>
            <SelectTrigger aria-label="Lọc theo số sao" className="w-[140px] h-9 text-xs">
              <SelectValue>{currentRating === 'ALL' ? 'Tất cả số sao' : `${currentRating} sao`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả số sao</SelectItem>
              <SelectItem value="5">5 sao</SelectItem>
              <SelectItem value="4">4 sao</SelectItem>
              <SelectItem value="3">3 sao</SelectItem>
              <SelectItem value="2">2 sao</SelectItem>
              <SelectItem value="1">1 sao</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            disabled={isRefreshing}
            onClick={() => {
              void reviewsQuery.refetch();
              void statsQuery.refetch();
            }}
          >
            <Icon icon="lucide:refresh-cw" className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>

          {(searchValue || currentRating !== 'ALL' || currentStatus !== 'ALL') && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 text-xs text-muted-foreground hover:text-foreground px-2.5 gap-1"
            >
              <Icon icon="lucide:rotate-ccw" className="size-3.5" />
              <span>Đặt lại</span>
            </Button>
          )}
        </div>
      </div>

      {/* 4. Table Container with Fixed Viewport Scroll */}
      <div className="min-h-0 flex-1 flex flex-col rounded-xl border border-border/80 bg-card overflow-hidden">
        {reviewsQuery.isError ? (
          <ReviewQueryError
            title="Không thể tải danh sách đánh giá"
            isRetrying={reviewsQuery.isFetching}
            onRetry={() => { void reviewsQuery.refetch(); }}
          />
        ) : (
          <BaseDataTable
            table={table}
            isLoading={isLoading}
            totalItems={data?.total}
            emptyTitle="Không tìm thấy đánh giá"
            emptyDescription="Không có đánh giá nào phù hợp với điều kiện tìm kiếm hoặc bộ lọc hiện tại."
          />
        )}
      </div>

      {/* 5. Modals */}
      {/* Review Detail Modal */}
      <ReviewDetailDialog
        open={Boolean(detailReviewId)}
        onOpenChange={(open) => !open && setDetailReviewId(null)}
        reviewId={detailReviewId}
        onHideClick={(review) => setHidingReview(review)}
        onRestoreClick={(review) => setRestoringReview(review)}
        onDeleteClick={(review) => setDeletingReview(review)}
      />

      {/* Hide Review Modal */}
      <HideReviewDialog
        open={Boolean(hidingReview)}
        onOpenChange={(open) => !open && setHidingReview(null)}
        review={hidingReview}
      />

      {/* Restore Review Modal */}
      <RestoreReviewDialog
        open={Boolean(restoringReview)}
        onOpenChange={(open) => !open && setRestoringReview(null)}
        review={restoringReview}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmDialog
        open={Boolean(deletingReview)}
        onOpenChange={(open) => !open && setDeletingReview(null)}
        title="Xóa Mềm Đánh Giá Vi Phạm"
        description="Bạn có chắc chắn muốn xóa đánh giá này? Đánh giá sẽ được chuyển sang trạng thái đã xóa mềm để phục vụ đối soát, không còn xuất hiện trên trang khóa học."
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
