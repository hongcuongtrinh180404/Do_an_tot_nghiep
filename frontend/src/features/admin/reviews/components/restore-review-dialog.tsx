'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { IReview } from 'share-lib';
import { DialogLayout } from '@/components/shared/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/icon';
import { useAdminRestoreReviewMutation } from '../api/admin-reviews.api';

const restoreReviewSchema = z.object({
  reason: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
});

type RestoreReviewFormData = z.infer<typeof restoreReviewSchema>;

interface RestoreReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: IReview | null;
  onSuccess?: () => void;
}

export function RestoreReviewDialog({
  open,
  onOpenChange,
  review,
  onSuccess,
}: RestoreReviewDialogProps): React.JSX.Element | null {
  const restoreMutation = useAdminRestoreReviewMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<RestoreReviewFormData>({
    resolver: zodResolver(restoreReviewSchema),
    defaultValues: {
      reason: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({ reason: '' });
    }
  }, [open, reset]);

  if (!review) return null;

  const onSubmit = (data: RestoreReviewFormData) => {
    restoreMutation.mutate(
      {
        id: review.id,
        payload: { reason: data.reason || 'Khôi phục hiển thị đánh giá công khai' },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      },
    );
  };

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Khôi Phục Đánh Giá"
      description="Hiển thị công khai trở lại đánh giá đã bị ẩn trên hệ thống."
      icon="lucide:rotate-ccw"
      iconClassName="bg-emerald-500/10 text-emerald-600 ring-emerald-500/20"
      className="sm:max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Current Review Information */}
        <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">
              {review.user?.fullName || 'Học viên'}
            </span>
            <div className="flex items-center gap-1 text-amber-500">
              <Icon icon="lucide:star" className="size-3.5 fill-current" />
              <span className="font-bold">{review.rating}/5</span>
            </div>
          </div>
          {review.course && (
            <p className="text-muted-foreground truncate">
              Khóa học: <span className="font-medium text-foreground">{review.course.title}</span>
            </p>
          )}
          {review.hideReason && (
            <div className="rounded-lg bg-amber-50 border border-amber-200/80 p-2.5 text-amber-900 text-xs">
              <span className="font-semibold">Lý do đã ẩn trước đó: </span>
              <span>{review.hideReason}</span>
            </div>
          )}
        </div>

        {/* Optional Note */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Ghi chú khôi phục (Tùy chọn)
          </label>
          <Textarea
            {...register('reason')}
            rows={2}
            placeholder="Ví dụ: Đã xác minh lại và đánh giá phù hợp tiêu chuẩn cộng đồng..."
            className="text-xs leading-relaxed"
          />
        </div>

        {/* System Impact Note */}
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 flex items-start gap-2.5 text-[11px] text-emerald-900">
          <Icon icon="lucide:check-circle-2" className="size-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-semibold">Hệ quả xử lý:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-emerald-800">
              <li>Đánh giá sẽ hiển thị công khai trở lại tại trang chi tiết khóa học.</li>
              <li>Điểm trung bình và tổng số đánh giá sẽ được cộng lại tự động.</li>
              <li>Hệ thống lưu lại lịch sử khôi phục cùng thông tin Admin thực hiện.</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || restoreMutation.isPending}
          >
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isSubmitting || restoreMutation.isPending}
          >
            {isSubmitting || restoreMutation.isPending ? (
              <>
                <Icon icon="lucide:loader-2" className="size-3.5 animate-spin mr-1.5" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:rotate-ccw" className="size-3.5 mr-1.5" />
                <span>Khôi Phục Hiển Thị</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </DialogLayout>
  );
}

