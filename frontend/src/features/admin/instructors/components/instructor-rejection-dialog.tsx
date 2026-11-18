'use client';

import * as React from 'react';
import type { IInstructorApplication } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { DialogLayout } from '@/components/shared/dialog';
import { useRejectInstructorMutation } from '../api/admin-instructors.api';

interface InstructorRejectionDialogProps {
  application: IInstructorApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstructorRejectionDialog({
  application,
  open,
  onOpenChange,
}: InstructorRejectionDialogProps): React.JSX.Element {
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const rejectMutation = useRejectInstructorMutation();

  React.useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!application) return;
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      setError('Vui lòng nhập lý do từ chối cụ thể (tối thiểu 10 ký tự)');
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        applicationId: application.id,
        rejectionReason: trimmed,
      });
      onOpenChange(false);
    } catch {
      // Error handled in mutation
    }
  };

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Từ chối hồ sơ giảng viên"
      description="Nhập lý do phản hồi để ứng viên biết rõ điểm cần hoàn thiện hoặc bổ sung."
      icon="lucide:x-circle"
      iconClassName="bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={rejectMutation.isPending}
            className="text-xs h-9 cursor-pointer"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={rejectMutation.isPending}
            className="text-xs h-9 gap-1.5 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
          >
            {rejectMutation.isPending ? (
              <>
                <Icon icon="lucide:loader-2" className="size-3.5 animate-spin" />
                <span>Đang gửi phản hồi...</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:send" className="size-3.5" />
                <span>Xác nhận từ chối</span>
              </>
            )}
          </Button>
        </>
      }
    >
      {application && (
        <div className="space-y-4 py-1">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Ứng viên:</span>
              <span className="font-semibold text-foreground text-sm">
                {application.applicantName}
              </span>
            </div>
            <div className="text-muted-foreground">
              {application.email} • {application.phone}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="rejection-reason"
              className="text-xs font-medium text-foreground flex items-center justify-between"
            >
              <span>Lý do từ chối (bắt buộc):</span>
              <span className="text-[11px] text-muted-foreground">
                {reason.trim().length}/1000 ký tự
              </span>
            </label>
            <textarea
              id="rejection-reason"
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error && e.target.value.trim().length >= 10) {
                  setError(null);
                }
              }}
              placeholder="Ví dụ: Hồ sơ chưa đạt tiêu chuẩn số năm kinh nghiệm sư phạm, hoặc cần bổ sung chứng chỉ giảng dạy liên quan..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 resize-none"
              maxLength={1000}
            />
            {error && (
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </DialogLayout>
  );
}
