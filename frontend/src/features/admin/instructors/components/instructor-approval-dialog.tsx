'use client';

import * as React from 'react';
import type { IInstructorApplication } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { DialogLayout } from '@/components/shared/dialog';
import { useApproveInstructorMutation } from '../api/admin-instructors.api';

interface InstructorApprovalDialogProps {
  application: IInstructorApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstructorApprovalDialog({
  application,
  open,
  onOpenChange,
}: InstructorApprovalDialogProps): React.JSX.Element {
  const approveMutation = useApproveInstructorMutation();

  const handleConfirm = async () => {
    if (!application) return;
    try {
      await approveMutation.mutateAsync(application.id);
      onOpenChange(false);
    } catch {
      // Error handled in mutation
    }
  };

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Phê duyệt hồ sơ giảng viên"
      description="Xác nhận cấp quyền Giảng viên chính thức cho ứng viên trên hệ thống Mindly."
      icon="lucide:user-check"
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
      {application && (
        <div className="space-y-3 py-1">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ứng viên:</span>
              <span className="text-sm font-semibold text-foreground">
                {application.applicantName}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Icon icon="lucide:mail" className="size-3.5" />
              <span>{application.email}</span>
              <span className="mx-1">•</span>
              <Icon icon="lucide:phone" className="size-3.5" />
              <span>{application.phone}</span>
            </div>
            {application.expertises?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {application.expertises.map((exp) => (
                  <span
                    key={exp}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground"
                  >
                    {exp}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
            Học viên sẽ được nâng quyền thành <strong>Giảng viên (Role: INSTRUCTOR)</strong>, có thể truy cập phân hệ quản lý bài giảng và tạo khóa học mới ngay lập tức.
          </div>
        </div>
      )}
    </DialogLayout>
  );
}
