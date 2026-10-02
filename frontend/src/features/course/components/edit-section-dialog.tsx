'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ISection } from 'share-lib';

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
import { courseKeys } from '../api/course.api';

interface EditSectionDialogProps {
  section: ISection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedSection: ISection) => void;
}

export function EditSectionDialog({
  section,
  open,
  onOpenChange,
  onSuccess,
}: EditSectionDialogProps): React.JSX.Element {
  const queryClient = useQueryClient();

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
    },
  });

  // Pre-fill form when section changes or dialog opens
  useEffect(() => {
    if (open && section) {
      reset({
        title: section.title,
        description: section.description ?? '',
      });
    }
  }, [open, section, reset]);

  const onSubmit = async (data: CreateSectionFormData) => {
    if (!section) return;

    try {
      // Create updated section representation
      const updatedSection: ISection = {
        ...section,
        title: data.title,
        description: data.description?.trim() ? data.description.trim() : undefined,
        order: section.order,
        updatedAt: new Date().toISOString(),
      };

      // Invalidate queries so UI refreshes
      await queryClient.invalidateQueries({
        queryKey: courseKeys.sections(section.courseId),
      });

      toast.success('Cập nhật chương học thành công!', {
        description: `Chương "${data.title}" đã được lưu thông tin mới.`,
      });

      if (onSuccess) {
        onSuccess(updatedSection);
      }
      onOpenChange(false);
    } catch {
      toast.error('Có lỗi xảy ra khi lưu thay đổi', {
        description: 'Vui lòng kiểm tra lại thông tin và thử lại.',
      });
    }
  };

  const displayOrder = section ? String(section.order + 1).padStart(2, '0') : '01';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
              CHƯƠNG {displayOrder}
            </span>
          </div>
          <DialogTitle className="text-base sm:text-lg font-bold">
            Chỉnh sửa chương học
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cập nhật tiêu đề, mô tả và thứ tự hiển thị của chương học trong đề cương.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Title Field */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-section-title" className="text-xs font-semibold">
              Tiêu đề chương <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-section-title"
              placeholder="VD: Kiến trúc Node.js Core & Vòng đời Request"
              disabled={isSubmitting}
              {...register('title')}
              className={errors.title ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {errors.title?.message && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <Icon icon="lucide:alert-circle" className="size-3" />
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-section-description" className="text-xs font-semibold">
              Mục tiêu & Tóm tắt kiến thức (Tùy chọn)
            </Label>
            <Textarea
              id="edit-section-description"
              placeholder="Mô tả ngắn gọn mục tiêu kiến thức và kỹ năng đạt được trong chương này..."
              rows={4}
              disabled={isSubmitting}
              {...register('description')}
              className={
                errors.description ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {errors.description?.message && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <Icon icon="lucide:alert-circle" className="size-3" />
                {errors.description.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-3 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Icon icon="lucide:loader-2" className="size-3.5 mr-1.5 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Icon icon="lucide:check" className="size-3.5 mr-1.5" />
                  Lưu thay đổi
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
