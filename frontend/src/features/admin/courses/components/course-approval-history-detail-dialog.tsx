'use client';

import * as React from 'react';
import Link from 'next/link';
import { CourseApprovalActionEnum, type ICourseApprovalHistory } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { DialogLayout } from '@/components/shared/dialog';
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
      second: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
}

interface CourseApprovalHistoryDetailDialogProps {
  history: ICourseApprovalHistory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCourseTimeline?: (courseId: string, courseTitle: string) => void;
}

export function CourseApprovalHistoryDetailDialog({
  history,
  open,
  onOpenChange,
  onOpenCourseTimeline,
}: CourseApprovalHistoryDetailDialogProps): React.JSX.Element {
  if (!history) {
    return <></>;
  }

  const isApproved = history.action === CourseApprovalActionEnum.APPROVED;
  const course = history.course;
  const admin = history.admin;
  const instructor = history.instructor;

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Chi tiết lần kiểm duyệt"
      description="Thông tin chi tiết quyết định phê duyệt hoặc yêu cầu chỉnh sửa của quản trị viên."
      icon={isApproved ? 'lucide:check-circle-2' : 'lucide:x-circle'}
      iconClassName={
        isApproved
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20'
          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20'
      }
      footer={
        <div className="flex items-center justify-between w-full">
          {onOpenCourseTimeline && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onOpenCourseTimeline(history.courseId, course?.title || 'Khóa học');
              }}
              className="text-xs h-9 gap-1.5 cursor-pointer"
            >
              <Icon icon="lucide:history" className="size-3.5" />
              <span>Xem lịch sử toàn khóa</span>
            </Button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {course && (
              <Button
                render={
                  <Link
                    href={getCourseUrl(history.courseId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-9 gap-1.5 cursor-pointer"
              >
                <Icon icon="lucide:external-link" className="size-3.5" />
                <span>Xem khóa học</span>
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 cursor-pointer"
            >
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {/* 1. Header Result Card */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            isApproved
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Icon
              icon={isApproved ? 'lucide:check-circle-2' : 'lucide:alert-circle'}
              className="size-5 shrink-0"
            />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider">
                {isApproved ? 'Đã phê duyệt xuất bản' : 'Yêu cầu chỉnh sửa (Từ chối)'}
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                Chuyển trạng thái từ{' '}
                <span className="font-mono font-medium">{history.previousStatus}</span> sang{' '}
                <span className="font-mono font-medium">{history.targetStatus}</span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] opacity-75 font-mono">
              {formatDate(history.createdAt)}
            </span>
          </div>
        </div>

        {/* 2. Course Info */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2.5">
          <div className="text-xs font-medium text-muted-foreground">Khóa học được kiểm duyệt:</div>
          <div className="flex items-start gap-3">
            {course?.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.thumbnailUrl}
                alt={course.title || 'Course thumbnail'}
                className="size-12 rounded-lg object-cover border border-border/60 shrink-0 bg-muted"
              />
            ) : (
              <div className="size-12 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/60 text-muted-foreground">
                <Icon icon="lucide:book-open" className="size-6" />
              </div>
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-sm text-foreground leading-snug">
                {course?.title || 'Khóa học không xác định'}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">
                /{course?.slug || history.courseId}
              </span>
              {course?.category && (
                <div className="text-[11px] text-muted-foreground mt-1">
                  Danh mục: <span className="font-medium text-foreground">{course.category.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Rejection Reason (if rejected) */}
        {!isApproved && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <Icon icon="lucide:message-square-diff" className="size-4" />
              <span>Nội dung yêu cầu chỉnh sửa gửi cho giảng viên:</span>
            </div>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap pl-5 border-l-2 border-amber-500/40">
              {history.reason || 'Không có lý do chi tiết được ghi lại.'}
            </p>
          </div>
        )}

        {/* 4. Reviewer & Instructor Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Admin Reviewer */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Icon icon="lucide:shield-check" className="size-3 text-sky-500" />
              <span>Quản trị viên thực hiện:</span>
            </div>
            <div className="text-xs font-medium text-foreground">
              {admin?.fullName || 'Quản trị viên'}
            </div>
            {admin?.email && (
              <div className="text-[11px] text-muted-foreground">{admin.email}</div>
            )}
          </div>

          {/* Instructor Owner */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Icon icon="lucide:user" className="size-3 text-emerald-500" />
              <span>Giảng viên sở hữu:</span>
            </div>
            <div className="text-xs font-medium text-foreground">
              {instructor?.fullName || 'Giảng viên'}
            </div>
            {instructor?.email && (
              <div className="text-[11px] text-muted-foreground">{instructor.email}</div>
            )}
          </div>
        </div>
      </div>
    </DialogLayout>
  );
}
