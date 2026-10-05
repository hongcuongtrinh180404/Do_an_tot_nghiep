'use client';

import React from 'react';
import type { ISection } from 'share-lib';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useSectionLessonsQuery } from '../api/course.api';

interface DeleteSectionDialogProps {
  section: ISection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteSectionDialog({
  section,
  open,
  onOpenChange,
  onSuccess,
}: DeleteSectionDialogProps): React.JSX.Element {
  // Lấy danh sách bài học của chương từ cache React Query
  const { data: lessons } = useSectionLessonsQuery(section?.id ?? '');
  const lessonList = lessons ?? [];
  const lessonCount = lessonList.length;

  const handleConfirmDelete = () => {
    // Mock UI feedback - chưa gọi API xóa backend theo yêu cầu
    toast.info('Tính năng xóa chương học đang hoàn thiện giao diện (chưa kích hoạt API backend).');
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-slate-900/60 backdrop-blur-xs"
        className="max-w-md w-full rounded-2xl bg-white dark:bg-card p-6 shadow-2xl border border-border/40 gap-0"
      >
        {/* Header / Icon Cảnh Báo */}
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mb-4">
          <Icon icon="lucide:alert-triangle" className="size-6" />
        </div>

        <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
          Xác nhận xóa chương học?
        </DialogTitle>

        <DialogDescription className="sr-only">
          Hộp thoại xác nhận xóa chương học và dữ liệu bài học liên quan.
        </DialogDescription>

        {/* Nội Dung Cảnh Báo (Body) */}
        <div className="mt-2 text-sm text-foreground/90 font-medium leading-normal">
          Bạn có chắc chắn muốn xóa chương{' '}
          <span className="font-semibold text-foreground">
            &ldquo;{section?.title}&rdquo;
          </span>
          ?
        </div>

        {/* Cảnh báo dữ liệu con: Trường hợp có bài học vs chưa có bài học */}
        {lessonCount > 0 ? (
          <div className="mt-3.5 p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            Thao tác này sẽ xóa vĩnh viễn toàn bộ{' '}
            <strong className="text-rose-600 dark:text-rose-400 font-bold">
              {lessonCount} bài học
            </strong>{' '}
            và tài liệu đính kèm thuộc chương này. Hành động này không thể hoàn tác!
          </div>
        ) : (
          <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
            Chương này hiện chưa có bài học nào. Thao tác này sẽ xóa chương học khỏi đề cương và không thể hoàn tác.
          </p>
        )}

        {/* Footer (2 Nút Hành Động) */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-white border-slate-200 hover:bg-slate-100 text-slate-700 dark:bg-transparent dark:border-border dark:text-slate-300 dark:hover:bg-muted font-medium px-4 py-2 rounded-xl text-xs transition"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            onClick={handleConfirmDelete}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-xs transition"
          >
            Xóa vĩnh viễn
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
