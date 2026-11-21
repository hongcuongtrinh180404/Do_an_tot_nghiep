'use client';

import * as React from 'react';
import { CourseApprovalActionEnum } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { DialogLayout } from '@/components/shared/dialog';
import { useCourseApprovalHistoryQuery } from '../api/admin-courses.api';

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

interface CourseTimelineHistoryDialogProps {
  courseId: string | null;
  courseTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CourseTimelineHistoryDialog({
  courseId,
  courseTitle,
  open,
  onOpenChange,
}: CourseTimelineHistoryDialogProps): React.JSX.Element {
  const { data: histories, isLoading, isError, refetch } = useCourseApprovalHistoryQuery(
    open ? courseId : null,
  );

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Lịch sử kiểm duyệt khóa học"
      description={
        courseTitle
          ? `Toàn bộ các lần phê duyệt và từ chối của khóa học "${courseTitle}".`
          : 'Dòng thời gian các lần phê duyệt và từ chối của khóa học.'
      }
      icon="lucide:history"
      iconClassName="bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-500/20"
      footer={
        <div className="flex justify-end w-full">
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-9 cursor-pointer"
          >
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-1 max-h-[60vh] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
            <Icon icon="lucide:loader-2" className="size-6 animate-spin text-primary" />
            <span className="text-xs">Đang tải lịch sử kiểm duyệt...</span>
          </div>
        ) : isError ? (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-center space-y-2">
            <p className="text-xs text-destructive font-medium">Không thể tải lịch sử kiểm duyệt</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { void refetch(); }}
              className="text-xs h-8"
            >
              Thử lại
            </Button>
          </div>
        ) : !histories || histories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-2">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Icon icon="lucide:history" className="size-5" />
            </div>
            <p className="text-xs font-medium text-foreground">Chưa có lịch sử phê duyệt</p>
            <p className="text-[11px] text-muted-foreground max-w-xs">
              Khóa học này chưa từng được quản trị viên duyệt hoặc từ chối sau khi tính năng lịch sử được kích hoạt.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
            {histories.map((item, idx) => {
              const isApproved = item.action === CourseApprovalActionEnum.APPROVED;
              return (
                <div key={item.id || idx} className="relative group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-6 top-0.5 size-5 rounded-full border-2 bg-background flex items-center justify-center ${
                      isApproved
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-rose-500 text-rose-600'
                    }`}
                  >
                    <Icon
                      icon={isApproved ? 'lucide:check' : 'lucide:x'}
                      className="size-2.5 stroke-[3]"
                    />
                  </div>

                  {/* Content Card */}
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/30 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          isApproved
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25'
                        }`}
                      >
                        <Icon
                          icon={isApproved ? 'lucide:check-circle-2' : 'lucide:x-circle'}
                          className="size-3"
                        />
                        <span>{isApproved ? 'Đã phê duyệt xuất bản' : 'Yêu cầu chỉnh sửa'}</span>
                      </span>

                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Người duyệt:{' '}
                      <span className="font-medium text-foreground">
                        {item.admin?.fullName || 'Quản trị viên'}
                      </span>
                      {item.admin?.email && (
                        <span className="text-[11px] ml-1">({item.admin.email})</span>
                      )}
                    </div>

                    {!isApproved && item.reason && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-foreground space-y-1">
                        <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <Icon icon="lucide:message-square-diff" className="size-3" />
                          <span>Lý do phản hồi:</span>
                        </div>
                        <p className="whitespace-pre-wrap text-[11px] leading-relaxed">
                          {item.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DialogLayout>
  );
}
