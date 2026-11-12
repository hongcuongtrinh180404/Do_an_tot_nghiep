'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { IReview } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/shared/data-table';

export interface CreateAdminReviewColumnsOptions {
  onViewDetail: (review: IReview) => void;
  onHide: (review: IReview) => void;
  onRestore: (review: IReview) => void;
  onDelete: (review: IReview) => void;
}

function formatDate(dateValue?: Date | string | null): string {
  if (!dateValue) return '—';
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
}

export function createAdminReviewColumns({
  onViewDetail,
  onHide,
  onRestore,
  onDelete,
}: CreateAdminReviewColumnsOptions): ColumnDef<IReview>[] {
  return [
    {
      id: 'student',
      header: 'Học viên',
      cell: ({ row }) => {
        const review = row.original;
        const user = review.user;
        const name = user?.fullName || 'Học viên ẩn danh';
        const email = user?.email || '—';

        const initial = name.charAt(0).toUpperCase() || 'U';

        return (
          <div className="flex items-center gap-2.5 min-w-[160px] max-w-[220px]">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={name}
                className="size-8 rounded-full object-cover shrink-0 ring-1 ring-border/60"
              />
            ) : (
              <div className="size-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{email}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'course',
      header: 'Khóa học',
      cell: ({ row }) => {
        const course = row.original.course;
        const title = course?.title || 'Khóa học';
        return (
          <div className="min-w-[140px] max-w-[200px]" title={title}>
            <p className="text-xs font-medium text-foreground truncate">{title}</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'rating',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Số sao" allowSorting={true} />
      ),
      cell: ({ row }) => {
        const rating = row.original.rating;
        return (
          <div className="flex items-center gap-1 min-w-[70px]">
            <Icon icon="lucide:star" className="size-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-foreground">{rating}.0</span>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'comment',
      header: 'Nội dung nhận xét',
      cell: ({ row }) => {
        const comment = row.original.comment;
        return (
          <div className="min-w-[180px] max-w-[280px]">
            {comment ? (
              <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed" title={comment}>
                {comment}
              </p>
            ) : (
              <span className="text-xs italic text-muted-foreground/60">(Không có nhận xét)</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const review = row.original;
        if (review.deletedAt || review.status === 'deleted') {
          return (
            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[11px] gap-1">
              <Icon icon="lucide:trash-2" className="size-3" />
              Đã xóa mềm
            </Badge>
          );
        }
        if (review.status === 'hidden') {
          return (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] gap-1">
              <Icon icon="lucide:eye-off" className="size-3" />
              Đã bị ẩn
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] gap-1">
            <Icon icon="lucide:check-circle-2" className="size-3" />
            Công khai
          </Badge>
        );
      },
    },
    {
      id: 'reports',
      header: 'Báo cáo',
      cell: ({ row }) => {
        const reportCount = row.original.reportCount || 0;
        if (reportCount === 0) {
          return <span className="text-xs text-muted-foreground/60">—</span>;
        }
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[11px] gap-1 font-semibold">
            <Icon icon="lucide:flag" className="size-3" />
            {reportCount} báo cáo
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Thời gian" allowSorting={true} />
      ),
      cell: ({ row }) => {
        return (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.createdAt)}
          </span>
        );
      },
      enableSorting: true,
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => {
        const review = row.original;
        const isDeleted = Boolean(review.deletedAt) || review.status === 'deleted';
        const isHidden = review.status === 'hidden' && !isDeleted;
        const isVisible = review.status === 'visible' && !isDeleted;

        return (
          <div className="flex items-center gap-1.5 min-w-[150px]">
            {/* View Detail button */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onViewDetail(review)}
              className="h-7 text-xs px-2 gap-1 text-foreground border-border/80 hover:bg-muted/60"
              title="Xem chi tiết đánh giá"
            >
              <Icon icon="lucide:eye" className="size-3.5" />
              <span>Chi tiết</span>
            </Button>

            {/* If Visible -> Hide button */}
            {isVisible && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onHide(review)}
                className="h-7 text-xs px-2 gap-1 text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200"
                title="Ẩn đánh giá vi phạm"
              >
                <Icon icon="lucide:eye-off" className="size-3.5" />
                <span>Ẩn</span>
              </Button>
            )}

            {/* If Hidden -> Restore button */}
            {isHidden && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onRestore(review)}
                className="h-7 text-xs px-2 gap-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                title="Khôi phục hiển thị đánh giá"
              >
                <Icon icon="lucide:rotate-ccw" className="size-3.5" />
                <span>Khôi phục</span>
              </Button>
            )}

            {/* If not deleted -> Delete button */}
            {!isDeleted && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onDelete(review)}
                className="h-7 text-xs px-2 gap-1 text-destructive hover:bg-destructive/10 border-destructive/20"
                title="Xóa mềm đánh giá vi phạm"
              >
                <Icon icon="lucide:trash-2" className="size-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
