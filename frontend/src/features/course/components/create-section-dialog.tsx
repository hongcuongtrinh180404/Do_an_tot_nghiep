'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/icon';

import {
  createSectionSchema,
  type CreateSectionFormData,
} from '../schemas/create-section.schema';
import { useCreateSectionMutation } from '../api/course.api';

interface CreateSectionDialogProps {
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultOrder?: number;
}

export function CreateSectionDialog({
  courseId,
  open,
  onOpenChange,
  defaultOrder = 0,
}: CreateSectionDialogProps): React.JSX.Element {
  const createSectionMutation = useCreateSectionMutation(courseId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSectionFormData>({
    resolver: zodResolver(createSectionSchema),
    defaultValues: {
      title: '',
      description: '',
      order: defaultOrder,
    },
  });

  // Reset form with latest defaultOrder whenever dialog opens
  useEffect(() => {
    if (open) {
      reset({
        title: '',
        description: '',
        order: defaultOrder,
      });
    }
  }, [open, defaultOrder, reset]);

  const isPending = isSubmitting || createSectionMutation.isPending;

  const onSubmit = async (data: CreateSectionFormData) => {
    try {
      await createSectionMutation.mutateAsync({
        title: data.title,
        description: data.description?.trim() ? data.description.trim() : undefined,
        order: data.order,
      });
      onOpenChange(false);
      reset();
    } catch {
      // Error notifications are handled inside useCreateSectionMutation's onError callback
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon icon="lucide:folder-plus" className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Thêm chương học mới
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Tạo một chương học mới để phân chia cấu trúc bài giảng cho khóa học này.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Tên chương học */}
          <div className="space-y-1.5">
            <Label htmlFor="section-title" className="text-xs font-medium text-foreground">
              Tên chương học <span className="text-destructive">*</span>
            </Label>
            <Input
              id="section-title"
              placeholder="Ví dụ: Chương 1: Giới thiệu tổng quan"
              disabled={isPending}
              aria-invalid={Boolean(errors.title)}
              {...register('title')}
            />
            {errors.title && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <Icon icon="lucide:alert-circle" className="size-3.5 shrink-0" />
                <span>{errors.title.message}</span>
              </p>
            )}
          </div>

          {/* Mô tả chương học */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="section-description" className="text-xs font-medium text-foreground">
                Mô tả chương học
              </Label>
              <span className="text-[11px] text-muted-foreground">Không bắt buộc</span>
            </div>
            <Textarea
              id="section-description"
              rows={3}
              placeholder="Mô tả tóm tắt nội dung kiến thức sẽ học trong chương này..."
              disabled={isPending}
              aria-invalid={Boolean(errors.description)}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <Icon icon="lucide:alert-circle" className="size-3.5 shrink-0" />
                <span>{errors.description.message}</span>
              </p>
            )}
          </div>

          {/* Thứ tự */}
          <div className="space-y-1.5">
            <Label htmlFor="section-order" className="text-xs font-medium text-foreground">
              Thứ tự hiển thị <span className="text-destructive">*</span>
            </Label>
            <Input
              id="section-order"
              type="number"
              min={0}
              step={1}
              placeholder="0"
              disabled={isPending}
              aria-invalid={Boolean(errors.order)}
              {...register('order', { valueAsNumber: true })}
            />
            <p className="text-[11px] text-muted-foreground">
              Số nguyên từ 0 trở lên dùng để sắp xếp thứ tự các chương học trong khóa học.
            </p>
            {errors.order && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <Icon icon="lucide:alert-circle" className="size-3.5 shrink-0" />
                <span>{errors.order.message}</span>
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? (
                <>
                  <Icon icon="lucide:loader-2" className="size-3.5 mr-1.5 animate-spin" />
                  Đang thêm...
                </>
              ) : (
                <>
                  <Icon icon="lucide:plus" className="size-3.5 mr-1.5" />
                  Thêm chương
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
