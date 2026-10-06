'use client';

import React from 'react';
import type { ILessonMaterial } from 'share-lib';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useDeleteLessonMaterialMutation } from '../api/course.api';

export interface DeleteLessonMaterialDialogProps {
  courseId?: string;
  lessonId?: string;
  material: ILessonMaterial | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteLessonMaterialDialog({
  courseId,
  lessonId,
  material,
  open,
  onOpenChange,
  onSuccess,
}: DeleteLessonMaterialDialogProps): React.JSX.Element {
  const deleteMutation = useDeleteLessonMaterialMutation({
    courseId,
  });

  const isDeleting = deleteMutation.isPending;

  const handleConfirmDelete = async () => {
    if (!lessonId || !material?.id) return;

    try {
      await deleteMutation.mutateAsync({
        lessonId,
        materialId: material.id,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Error is handled in mutation onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isDeleting && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <Icon icon="lucide:alert-triangle" className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Xóa tài liệu đính kèm
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Xác nhận gỡ bỏ tài liệu khỏi bài học
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <p className="text-foreground/90 leading-relaxed">
            Bạn có chắc chắn muốn xóa tài liệu{' '}
            <strong className="text-foreground font-semibold">
              &quot;{material?.title || material?.fileName}&quot;
            </strong>{' '}
            này không?
          </p>

          <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-destructive text-[11px] space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Icon icon="lucide:info" className="size-3.5 shrink-0" />
              <span>Hành động không thể hoàn tác</span>
            </p>
            <p className="text-destructive/80 leading-relaxed">
              Tệp tài liệu sẽ bị xóa vĩnh viễn khỏi máy chủ lưu trữ MinIO và học viên sẽ không còn quyền truy cập.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="text-xs"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="text-xs gap-1.5"
          >
            {isDeleting ? (
              <>
                <Icon icon="lucide:loader-2" className="size-3.5 animate-spin" />
                <span>Đang xóa...</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:trash-2" className="size-3.5" />
                <span>Xác nhận xóa</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
