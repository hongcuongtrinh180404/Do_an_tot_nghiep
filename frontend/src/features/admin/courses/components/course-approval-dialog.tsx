'use client';

import * as React from 'react';
import type { ICourse } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { DialogLayout } from '@/components/shared/dialog';
import { useApproveCourseMutation } from '../api/admin-courses.api';

interface CourseApprovalDialogProps {
  course: ICourse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CourseApprovalDialog({
  course,
  open,
  onOpenChange,
}: CourseApprovalDialogProps): React.JSX.Element {
  const approveMutation = useApproveCourseMutation();

  const handleConfirm = async () => {
    if (!course) return;
    try {
      await approveMutation.mutateAsync(course.id);
      onOpenChange(false);
    } catch {
      // Error handled in mutation
    }
  };

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Phê duyệt khóa học"
      description="Xác nhận kiểm duyệt chất lượng và xuất bản khóa học lên hệ thống."
      icon="lucide:check-circle-2"
      iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={approveMutation.isPending}
            className="text-xs h-9 cursor-pointer"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={approveMutation.isPending}
            className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
          >
            {approveMutation.isPending ? (
              <>
                <Icon icon="lucide:loader-2" className="size-3.5 animate-spin" />
                <span>Đang phê duyệt...</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:check" className="size-3.5" />
                <span>Xác nhận phê duyệt</span>
              </>
            )}
          </Button>
        </>
      }
    >
      {course && (
        <div className="space-y-3 py-1">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2">
            <div className="text-xs text-muted-foreground">Tên khóa học:</div>
            <div className="text-sm font-semibold text-foreground leading-snug">
              {course.title}
            </div>

            {course.instructor && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                <Icon icon="lucide:user" className="size-3.5 text-muted-foreground" />
                <span>Giảng viên:</span>
                <span className="font-medium text-foreground">{course.instructor.fullName}</span>
                <span className="text-[11px] text-muted-foreground">({course.instructor.email})</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
            Khóa học sẽ chuyển sang trạng thái <strong>Đã xuất bản (Published)</strong>. Học viên có thể tìm kiếm, xem trang giới thiệu và đăng ký học ngay lập tức.
          </div>
        </div>
      )}
    </DialogLayout>
  );
}

