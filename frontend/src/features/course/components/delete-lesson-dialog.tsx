'use client';

import React from 'react';
import type { ILesson } from 'share-lib';
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
import { useDeleteLessonMutation } from '../api/course.api';

export interface DeleteLessonDialogProps {
  courseId?: string;
  sectionId?: string;
  lesson: ILesson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (deletedLessonId: string) => void;
}

export function DeleteLessonDialog({
  courseId,
  sectionId,
  lesson,
  open,
  onOpenChange,
  onSuccess,
}: DeleteLessonDialogProps): React.JSX.Element {
  const activeSectionId = sectionId || lesson?.sectionId || '';
  const deleteMutation = useDeleteLessonMutation(activeSectionId, courseId);

  const isDeleting = deleteMutation.isPending;
  const isVideo = lesson?.content?.type === 'video';
  const itemTypeLabel = isVideo ? 'bài học' : 'tài liệu';
  const itemTitle = lesson?.title || 'Bài học';

  const handleConfirmDelete = async () => {
    if (!lesson?.id) return;

    try {
      await deleteMutation.mutateAsync(lesson.id);
      onOpenChange(false);
      onSuccess?.(lesson.id);
    } catch {
      // Thông báo lỗi được xử lý trong onError của useDeleteLessonMutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isDeleting && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        {/* 1. Header: Icon cảnh báo đỏ bo tròn + Tiêu đề */}
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/40 dark:text-rose-400 shrink-0">
              <Icon icon="lucide:alert-triangle" className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Xóa {itemTypeLabel}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Xác nhận xóa {itemTypeLabel} khỏi chương học
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 2. Body: Nội dung xác nhận & Cảnh báo an toàn */}
        <div className="py-2 space-y-3">
          <p className="text-xs sm:text-sm text-foreground/90 font-medium">
            Bạn có chắc chắn muốn xóa {itemTypeLabel}{' '}
            <span className="font-semibold text-foreground">
              &quot;{itemTitle}&quot;
            </span>{' '}
            không?
          </p>

          <div className="bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 rounded-xl p-3.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300 space-y-1">
            <p className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <Icon icon="lucide:info" className="size-3.5 shrink-0" />
              <span>Hành động không thể hoàn tác</span>
            </p>
            <p>
              {isVideo
                ? 'Thao tác này sẽ xóa bài học, dọn dẹp video bài giảng cùng toàn bộ tài liệu đính kèm liên quan. Thứ tự các bài học phía sau sẽ tự động được dồn lại.'
                : 'Thao tác này sẽ gỡ bỏ tài liệu này khỏi chương học. Thứ tự các bài học phía sau sẽ tự động được dồn lại.'}
            </p>
          </div>
        </div>

        {/* 3. Footer: Nút Hủy và Nút Xác nhận */}
        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="rounded-lg"
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold px-4 py-2 shadow-xs transition inline-flex items-center gap-1.5"
          >
            {isDeleting ? (
              <>
                <Icon icon="lucide:loader-2" className="size-3.5 animate-spin" />
                <span>Đang xóa...</span>
              </>
            ) : (
              <span>Xác nhận xóa</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
