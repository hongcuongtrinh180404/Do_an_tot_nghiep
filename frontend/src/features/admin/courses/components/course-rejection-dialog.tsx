'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ICourse } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { DialogLayout } from '@/components/shared/dialog';
import { useRejectCourseMutation } from '../api/admin-courses.api';

const rejectionSchema = z.object({
  reason: z
    .string()
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, {
      message: 'Vui lòng nhập lý do yêu cầu chỉnh sửa.',
    })
    .refine((val) => val.length >= 10, {
      message: 'Lý do yêu cầu chỉnh sửa phải có ít nhất 10 ký tự để giảng viên nắm rõ thông tin.',
    }),
});

type RejectionFormData = z.infer<typeof rejectionSchema>;

interface CourseRejectionDialogProps {
  course: ICourse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CourseRejectionDialog({
  course,
  open,
  onOpenChange,
}: CourseRejectionDialogProps): React.JSX.Element {
  const rejectMutation = useRejectCourseMutation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RejectionFormData>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: {
      reason: '',
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const reasonValue = watch('reason') || '';

  React.useEffect(() => {
    if (open) {
      reset({ reason: '' });
    }
  }, [open, reset]);

  const onSubmit = async (data: RejectionFormData) => {
    if (!course) return;
    try {
      await rejectMutation.mutateAsync({
        courseId: course.id,
        reason: data.reason,
      });
      onOpenChange(false);
    } catch {
      // Error handled in mutation toast
    }
  };

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Yêu cầu chỉnh sửa khóa học"
      description="Gửi phản hồi yêu cầu giảng viên kiểm tra và cập nhật lại nội dung khóa học."
      icon="lucide:message-square-diff"
      iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20"
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
            onClick={handleSubmit(onSubmit)}
            disabled={rejectMutation.isPending}
            className="text-xs h-9 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
          >
            {rejectMutation.isPending ? (
              <>
                <Icon icon="lucide:loader-2" className="size-3.5 animate-spin" />
                <span>Đang gửi phản hồi...</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:send" className="size-3.5" />
                <span>Gửi yêu cầu chỉnh sửa</span>
              </>
            )}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
        {course && (
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="text-xs text-muted-foreground">Khóa học cần chỉnh sửa:</div>
            <div className="text-sm font-semibold text-foreground truncate mt-0.5">
              {course.title}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="rejection-reason" className="text-xs font-semibold text-foreground">
              Lý do yêu cầu chỉnh sửa <span className="text-destructive">*</span>
            </label>
            <span className="text-[11px] text-muted-foreground">
              {reasonValue.trim().length}/500
            </span>
          </div>

          <textarea
            id="rejection-reason"
            rows={4}
            maxLength={500}
            placeholder="Ví dụ: Video bài giảng thứ 2 bị mất âm thanh. Vui lòng kiểm tra và gửi phê duyệt lại."
            {...register('reason')}
            disabled={rejectMutation.isPending}
            className={`w-full rounded-xl border bg-background p-3 text-xs sm:text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus-visible:ring-2 disabled:opacity-50 resize-y leading-relaxed ${errors.reason
                ? 'border-destructive focus-visible:ring-destructive/30'
                : 'border-input focus-visible:border-ring focus-visible:ring-ring/30'
              }`}
          />

          {errors.reason && (
            <p className="text-xs text-destructive flex items-center gap-1.5 mt-1 font-medium">
              <Icon icon="lucide:alert-circle" className="size-3.5 shrink-0" />
              <span>{errors.reason.message}</span>
            </p>
          )}

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Khóa học sẽ được chuyển về trạng thái <strong>Bản nháp (Draft)</strong>. Giảng viên sẽ xem được lý do chi tiết này và có thể gửi phê duyệt lại sau khi đã khắc phục.
          </p>
        </div>
      </form>
    </DialogLayout>
  );
}
