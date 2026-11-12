'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DialogLayout } from '@/components/shared/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/icon';
import { useReportReviewMutation } from '../../api/review.api';

const reportSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'Vui lòng mô tả lý do báo cáo (tối thiểu 5 ký tự)')
    .max(500, 'Lý do báo cáo tối đa 500 ký tự'),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface ReportReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string | null;
  courseId: string;
}

export function ReportReviewDialog({
  open,
  onOpenChange,
  reviewId,
  courseId,
}: ReportReviewDialogProps): React.JSX.Element | null {
  const reportMutation = useReportReviewMutation(courseId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reason: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({ reason: '' });
    }
  }, [open, reset]);

  if (!reviewId) return null;

  const onSubmit = (data: ReportFormData) => {
    reportMutation.mutate(
      {
        reviewId,
        reason: data.reason,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Báo Cáo Đánh Giá Vi Phạm"
      description="Gửi phản ánh tới Ban quản trị về đánh giá vi phạm quy tắc cộng đồng hoặc spam."
      icon="lucide:flag"
      iconClassName="bg-destructive/10 text-destructive ring-destructive/20"
      className="sm:max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1">
            <span>Lý do báo cáo</span>
            <span className="text-destructive">*</span>
          </label>
          <Textarea
            {...register('reason')}
            rows={3}
            placeholder="Ví dụ: Đánh giá chứa từ ngữ xúc phạm, spam quảng cáo, không liên quan đến khóa học..."
            className="text-xs leading-relaxed"
          />
          {errors.reason && (
            <p className="text-[11px] text-destructive font-medium">{errors.reason.message}</p>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-[11px] text-muted-foreground leading-relaxed">
          Báo cáo của bạn sẽ được bảo mật danh tính và chuyển đến Quản trị viên để kiểm duyệt theo tiêu chuẩn cộng đồng.
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || reportMutation.isPending}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="destructive"
            disabled={isSubmitting || reportMutation.isPending}
          >
            {isSubmitting || reportMutation.isPending ? (
              <>
                <Icon icon="lucide:loader-2" className="size-3.5 animate-spin mr-1.5" />
                <span>Đang gửi...</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:flag" className="size-3.5 mr-1.5" />
                <span>Gửi Báo Cáo</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </DialogLayout>
  );
}

