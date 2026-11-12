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
import { useAdminHideReviewMutation } from '../api/admin-reviews.api';

const hideReviewSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'Vui lòng nhập lý do ẩn chi tiết (tối thiểu 5 ký tự)')
    .max(500, 'Lý do ẩn tối đa 500 ký tự'),
});

type HideReviewFormData = z.infer<typeof hideReviewSchema>;

interface HideReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: IReview | null;
  onSuccess?: () => void;
}

export function HideReviewDialog({
  open,
  onOpenChange,
  review,
  onSuccess,
}: HideReviewDialogProps): React.JSX.Element | null {
  const hideMutation = useAdminHideReviewMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HideReviewFormData>({
    resolver: zodResolver(hideReviewSchema),
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

  const onSubmit = (data: HideReviewFormData) => {
    hideMutation.mutate(
      {
        id: review.id,
        payload: { reason: data.reason },
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
      title="Ẩn Đánh Giá Khóa Học"
      description="Ẩn đánh giá vi phạm quy tắc cộng đồng khỏi trang chi tiết khóa học."
      icon="lucide:eye-off"
      iconClassName="bg-amber-500/10 text-amber-600 ring-amber-500/20"
      className="sm:max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Review Preview */}
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
          {review.comment && (
            <p className="text-foreground/90 bg-background/60 p-2.5 rounded-lg border border-border/40 italic line-clamp-3">
              &quot;{review.comment}&quot;
            </p>
          )}
        </div>

        {/* Reason Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1">
            <span>Lý do ẩn vi phạm</span>
            <span className="text-destructive">*</span>
          </label>
          <Textarea
            {...register('reason')}
            rows={3}
            placeholder="Ví dụ: Đánh giá chứa ngôn từ thô tục, quảng cáo trái phép hoặc spam..."
            className="text-xs leading-relaxed"
          />
          {errors.reason && (
            <p className="text-[11px] text-destructive font-medium">{errors.reason.message}</p>
          )}
        </div>

        {/* System Impact Note */}
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 flex items-start gap-2.5 text-[11px] text-amber-900">
          <Icon icon="lucide:alert-triangle" className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-semibold">Hệ quả xử lý:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
              <li>Đánh giá sẽ lập tức bị ẩn khỏi trang chi tiết khóa học.</li>
              <li>Điểm trung bình và tổng đánh giá sẽ được tự động tính toán lại.</li>
              <li>Học viên vẫn xem được đánh giá và lý do ẩn tại tài khoản cá nhân.</li>
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
            disabled={isSubmitting || hideMutation.isPending}
          >
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="destructive"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            disabled={isSubmitting || hideMutation.isPending}
          >
            {isSubmitting || hideMutation.isPending ? (
              <>
                <Icon icon="lucide:loader-2" className="size-3.5 animate-spin mr-1.5" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:eye-off" className="size-3.5 mr-1.5" />
                <span>Xác nhận Ẩn Đánh Giá</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </DialogLayout>
  );
}

