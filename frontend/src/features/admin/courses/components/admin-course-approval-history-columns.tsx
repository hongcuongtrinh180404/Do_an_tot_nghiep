'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { CourseApprovalActionEnum, type ICourseApprovalHistory } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/shared/data-table';
import { getCourseUrl } from '@/features/course/utils/course-view-mode.util';

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

export interface AdminCourseApprovalHistoryColumnsOptions {
  onViewDetail: (history: ICourseApprovalHistory) => void;
  onViewCourseTimeline?: (courseId: string, courseTitle: string) => void;
}

export function createAdminCourseApprovalHistoryColumns({
  onViewDetail,
  onViewCourseTimeline,
}: AdminCourseApprovalHistoryColumnsOptions): ColumnDef<ICourseApprovalHistory>[] {
  return [
    {
      accessorKey: 'course',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Khóa học" allowSorting={false} />
      ),
      cell: ({ row }) => {
        const item = row.original;
        const course = item.course;
        const title = course?.title || 'Khóa học không xác định';
        const slug = course?.slug || '';
        const thumbnailUrl = course?.thumbnailUrl;
        const categoryName = course?.category?.name;

        return (
          <div className="flex items-center gap-3 min-w-[240px] max-w-[320px]">
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailUrl}
                alt={title}
                className="size-10 rounded-lg object-cover border border-border/60 shrink-0 bg-muted"
              />
            ) : (
              <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/60 text-muted-foreground">
                <Icon icon="lucide:book-open" className="size-5" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground text-xs sm:text-sm truncate leading-snug" title={title}>
                {title}
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                {categoryName && (
                  <>
                    <span className="truncate">{categoryName}</span>
                    <span>•</span>
                  </>
                )}
                <span className="truncate">/{slug}</span>
              </div>
            </div>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: 'instructor',
      header: 'Giảng viên',
      cell: ({ row }) => {
        const instructor = row.original.instructor;
        if (!instructor) {
          return <span className="text-xs text-muted-foreground italic">Không có thông tin</span>;
        }

        return (
          <div className="flex items-center gap-2.5 min-w-[160px] max-w-[200px]">
            {instructor.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={instructor.avatarUrl}
                alt={instructor.fullName}
                className="size-7 rounded-full object-cover border border-border/60 shrink-0 bg-muted"
              />
            ) : (
              <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-semibold">
                {instructor.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-foreground truncate" title={instructor.fullName}>
                {instructor.fullName}
              </span>
              <span className="text-[11px] text-muted-foreground truncate" title={instructor.email}>
                {instructor.email}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'action',
      header: 'Kết quả duyệt',
      cell: ({ row }) => {
        const action = row.original.action;
        const isApproved = action === CourseApprovalActionEnum.APPROVED;

        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isApproved
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25'
            }`}
          >
            <Icon
              icon={isApproved ? 'lucide:check-circle-2' : 'lucide:x-circle'}
              className="size-3.5"
            />
            <span>{isApproved ? 'Đã phê duyệt' : 'Đã từ chối'}</span>
          </span>
        );
      },
    },
    {
      accessorKey: 'reason',
      header: 'Lý do / Phản hồi',
      cell: ({ row }) => {
        const item = row.original;
        if (item.action === CourseApprovalActionEnum.APPROVED) {
          return (
            <span className="text-xs text-muted-foreground italic flex items-center gap-1">
              <Icon icon="lucide:check" className="size-3 text-emerald-500" />
              <span>Đạt tiêu chuẩn xuất bản</span>
            </span>
          );
        }

        if (!item.reason) {
          return <span className="text-xs text-muted-foreground italic">Không có nội dung</span>;
        }

        return (
          <div
            className="flex items-start gap-1.5 max-w-[240px] text-xs text-muted-foreground cursor-pointer group"
            onClick={() => onViewDetail(item)}
            title="Bấm để xem đầy đủ lý do từ chối"
          >
            <Icon icon="lucide:message-square-diff" className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {item.reason}
            </span>
          </div>
        );
      },
    },
    {
      id: 'admin',
      header: 'Người kiểm duyệt',
      cell: ({ row }) => {
        const admin = row.original.admin;
        if (!admin) {
          return <span className="text-xs text-muted-foreground italic">Quản trị viên</span>;
        }

        return (
          <div className="flex items-center gap-2 min-w-[140px] max-w-[180px]">
            {admin.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={admin.avatarUrl}
                alt={admin.fullName}
                className="size-6 rounded-full object-cover border border-border/60 shrink-0 bg-muted"
              />
            ) : (
              <div className="size-6 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 text-[10px] font-semibold">
                <Icon icon="lucide:shield-check" className="size-3.5" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-foreground truncate" title={admin.fullName}>
                {admin.fullName}
              </span>
              <span className="text-[10px] text-muted-foreground truncate" title={admin.email}>
                {admin.email}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Thời gian duyệt" allowSorting={false} />
      ),
      cell: ({ row }) => {
        const dateStr = formatDate(row.original.createdAt);
        return <span className="text-xs text-muted-foreground whitespace-nowrap">{dateStr}</span>;
      },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => {
        const item = row.original;
        const courseId = item.courseId;
        const courseTitle = item.course?.title || 'Khóa học';

        return (
          <div className="flex items-center gap-1.5 min-w-[130px]">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onViewDetail(item)}
              className="h-7 text-xs px-2 gap-1 border-border/80 hover:bg-muted font-medium cursor-pointer"
              title="Xem chi tiết lần kiểm duyệt này"
            >
              <Icon icon="lucide:eye" className="size-3 text-muted-foreground" />
              <span>Chi tiết</span>
            </Button>

            {onViewCourseTimeline && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onViewCourseTimeline(courseId, courseTitle)}
                className="h-7 text-xs px-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Xem toàn bộ lịch sử của khóa học này"
              >
                <Icon icon="lucide:history" className="size-3.5" />
              </Button>
            )}

            {courseId && (
              <Link
                href={getCourseUrl(courseId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Xem khóa học ở trang công khai"
              >
                <Icon icon="lucide:external-link" className="size-3" />
              </Link>
            )}
          </div>
        );
      },
    },
  ];
}
