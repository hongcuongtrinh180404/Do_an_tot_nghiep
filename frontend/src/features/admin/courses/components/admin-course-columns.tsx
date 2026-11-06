'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { CourseStatusEnum, CourseLevelEnum, type ICourse } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/shared/data-table';

const statusConfig: Record<
  CourseStatusEnum,
  { label: string; badgeClass: string; icon: string }
> = {
  [CourseStatusEnum.PENDING_APPROVAL]: {
    label: 'Chờ duyệt',
    badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
    icon: 'lucide:clock',
  },
  [CourseStatusEnum.PUBLISHED]: {
    label: 'Đã xuất bản',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    icon: 'lucide:check-circle-2',
  },
  [CourseStatusEnum.DRAFT]: {
    label: 'Bản nháp',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
    icon: 'lucide:file-edit',
  },
  [CourseStatusEnum.ARCHIVED]: {
    label: 'Lưu trữ',
    badgeClass: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/25',
    icon: 'lucide:archive',
  },
};

const levelMap: Record<CourseLevelEnum, string> = {
  [CourseLevelEnum.BEGINNER]: 'Cơ bản',
  [CourseLevelEnum.INTERMEDIATE]: 'Trung cấp',
  [CourseLevelEnum.ADVANCED]: 'Nâng cao',
  [CourseLevelEnum.ALL_LEVELS]: 'Mọi cấp độ',
};

function formatVND(value: number): string {
  if (value === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
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

export interface AdminCourseColumnsOptions {
  onApprove: (course: ICourse) => void;
  onReject: (course: ICourse) => void;
}

export function createAdminCourseColumns({
  onApprove,
  onReject,
}: AdminCourseColumnsOptions): ColumnDef<ICourse>[] {
  return [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Khóa học" allowSorting={true} />
      ),
      cell: ({ row }) => {
        const course = row.original;
        return (
          <div className="flex items-center gap-3 min-w-[240px] max-w-[320px]">
            {course.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="size-10 rounded-lg object-cover border border-border/60 shrink-0 bg-muted"
              />
            ) : (
              <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/60 text-muted-foreground">
                <Icon icon="lucide:book-open" className="size-5" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground text-xs sm:text-sm truncate leading-snug">
                {course.title}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                /{course.slug}
              </span>
            </div>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      id: 'instructor',
      header: 'Giảng viên',
      cell: ({ row }) => {
        const instructor = row.original.instructor;
        if (!instructor) {
          return <span className="text-xs text-muted-foreground italic">Không có thông tin</span>;
        }
        const initial = instructor.fullName.charAt(0).toUpperCase() || 'U';
        return (
          <div className="flex items-center gap-2.5 min-w-[180px]">
            {instructor.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={instructor.avatarUrl}
                alt={instructor.fullName}
                className="size-7 rounded-full object-cover shrink-0 ring-1 ring-border/60"
              />
            ) : (
              <div className="size-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                {initial}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-foreground truncate">
                {instructor.fullName}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                {instructor.email}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'category',
      header: 'Danh mục & Trình độ',
      cell: ({ row }) => {
        const course = row.original;
        const levelLabel = levelMap[course.level] || 'Mọi cấp độ';
        return (
          <div className="flex flex-col gap-1 min-w-[140px]">
            <span className="text-xs font-medium text-foreground truncate">
              {course.category?.name || 'Chưa phân loại'}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Icon icon="lucide:layers" className="size-2.5" />
              <span>{levelLabel}</span>
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'price',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Học phí" allowSorting={true} />
      ),
      cell: ({ row }) => {
        const price = row.original.price;
        const isFree = price === 0;
        return (
          <span
            className={`text-xs font-semibold ${isFree
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-foreground'
              }`}
          >
            {formatVND(price)}
          </span>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Trạng thái" allowSorting={true} />
      ),
      cell: ({ row }) => {
        const course = row.original;
        const config = statusConfig[course.status] || {
          label: course.status,
          badgeClass: 'bg-muted text-muted-foreground border-border/50',
          icon: 'lucide:circle',
        };

        const hasRejection =
          course.status === CourseStatusEnum.DRAFT && Boolean(course.rejectionReason);

        return (
          <div className="flex flex-col items-start gap-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeClass}`}
            >
              <Icon icon={config.icon} className="size-3" />
              <span>{config.label}</span>
            </span>

            {hasRejection && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
                title={`Đã yêu cầu chỉnh sửa: ${course.rejectionReason}`}
              >
                <Icon icon="lucide:alert-circle" className="size-2.5" />
                <span>Đã phản hồi</span>
              </span>
            )}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'approvalRequestedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ngày gửi duyệt" allowSorting={true} />
      ),
      cell: ({ row }) => {
        const course = row.original;
        const dateStr = formatDate(course.approvalRequestedAt || course.createdAt);
        return (
          <span className="text-xs text-muted-foreground">
            {dateStr}
          </span>
        );
      },
      enableSorting: true,
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => {
        const course = row.original;
        const isPending = course.status === CourseStatusEnum.PENDING_APPROVAL;

        return (
          <div className="flex items-center gap-1.5 min-w-[190px]">
            {isPending && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onApprove(course)}
                  className="h-7 text-xs px-2.5 gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50 cursor-pointer"
                  title="Phê duyệt khóa học"
                >
                  <Icon icon="lucide:check" className="size-3" />
                  <span>Duyệt</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onReject(course)}
                  className="h-7 text-xs px-2.5 gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:border-amber-500/50 cursor-pointer"
                  title="Yêu cầu giảng viên chỉnh sửa"
                >
                  <Icon icon="lucide:message-square-diff" className="size-3" />
                  <span>Yêu cầu sửa</span>
                </Button>
              </>
            )}

            <Link
              href={`/courses/${course.id}?mode=edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 h-7 text-xs px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent hover:border-border/60 transition-colors"
              title="Xem trang nội dung khóa học"
            >
              <Icon icon="lucide:external-link" className="size-3" />
              <span>Xem</span>
            </Link>
          </div>
        );
      },
    },
  ];
}
