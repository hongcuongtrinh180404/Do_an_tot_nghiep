'use client';

import React from 'react';
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
import { Icon } from '@/components/ui/icon';
import {
  useSectionLessonsQuery,
  useDeleteSectionMutation,
} from '../api/course.api';

interface DeleteSectionDialogProps {
  courseId?: string;
  section: ISection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (deletedSectionId: string) => void;
}

export function DeleteSectionDialog({
  courseId,
  section,
  open,
  onOpenChange,
  onSuccess,
}: DeleteSectionDialogProps): React.JSX.Element {
  const activeCourseId = courseId || section?.courseId || '';
  const deleteMutation = useDeleteSectionMutation(activeCourseId);

  // Lấy danh sách bài học của chương từ cache React Query
  const { data: lessons } = useSectionLessonsQuery(section?.id ?? '');
  const lessonList = lessons ?? [];
  const lessonCount = lessonList.length;

  const isDeleting = deleteMutation.isPending;

  const handleConfirmDelete = async () => {
    if (!section || !activeCourseId) return;

    try {
      await deleteMutation.mutateAsync(section.id);
      onOpenChange(false);
      onSuccess?.(section.id);
    } catch {
      // Notification handled in useDeleteSectionMutation onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isDeleting && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        {/* 1. Header: Icon khối vuông bo góc + Tiêu đề & Mô tả phụ + Nút (X) góc phải */}
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/40 dark:text-rose-400 shrink-0">
              <Icon icon="lucide:alert-triangle" className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Xóa chương học
              </DialogTitle>
              <DialogDescription className="sr-only">
                Xác nhận xóa chương học khỏi khóa học
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 2. Body (Nội dung chính) */}
        <div className="py-2 space-y-3">
          <p className="text-xs sm:text-sm text-foreground/90 font-medium">
            Bạn có chắc chắn muốn xóa chương{' '}
            <span className="font-semibold text-foreground">
              {section?.title}
            </span>{' '}
            không?
          </p>

          {/* Hộp cảnh báo dữ liệu con (Giữ điểm nhấn bôi đỏ) */}
          <div className="bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 rounded-xl p-3.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {lessonCount > 0 ? (
              <span>
                Thao tác này sẽ xóa vĩnh viễn toàn bộ{' '}
                <strong className="text-rose-600 dark:text-rose-400 font-bold">
                  {lessonCount} bài học
                </strong>{' '}
                và tất cả tài liệu đính kèm bên trong. Hành động này không thể hoàn tác!
              </span>
            ) : (
              <span>
                Chương này hiện chưa có bài học nào. Thao tác này sẽ xóa chương học khỏi đề cương và không thể hoàn tác.
              </span>
            )}
          </div>
        </div>

        {/* 3. Footer: Dạt sang góc phải giống modal Thêm chương */}
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
              <span>Xóa chương học</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
