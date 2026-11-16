'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { DialogLayout } from './dialog-layout';

export interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  itemName?: string;
  description?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
  showNotice?: boolean;
  noticeText?: React.ReactNode;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title = 'Xác nhận xóa',
  itemName,
  description,
  onConfirm,
  isLoading = false,
  confirmText = 'Xác nhận xóa',
  cancelText = 'Hủy bỏ',
  showNotice = false,
  noticeText = 'Lưu ý: Dữ liệu bị xóa sẽ được lưu trữ dưới dạng xóa mềm và có thể khôi phục lại khi cần thiết từ phía quản trị cấp cao.',
}: DeleteConfirmDialogProps): React.JSX.Element {
  const defaultDesc = itemName
    ? `Bạn có chắc chắn muốn xóa "${itemName}" không? Hành động này có thể đưa dữ liệu vào thùng rác hoặc xóa khỏi hệ thống.`
    : 'Bạn có chắc chắn muốn xóa không?';

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description || defaultDesc}
      descriptionPlacement="below"
      icon="lucide:triangle-alert"
      iconClassName="size-12 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40 ring-0 shadow-2xs"
      className="sm:max-w-md rounded-2xl border-border/80 shadow-2xl"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-9 px-4 rounded-xl text-sm font-medium border-border/80 bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="h-9 px-4 rounded-xl text-sm font-medium bg-rose-50 hover:bg-rose-100/90 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 border border-rose-200/70 dark:border-rose-900/50 shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            {isLoading && <Icon icon="lucide:loader-2" className="size-3.5 animate-spin" />}
            {isLoading ? 'Đang xóa...' : confirmText}
          </Button>
        </>
      }
    >
      {showNotice && (
        <div className="text-xs text-muted-foreground bg-destructive/5 border border-destructive/20 rounded-xl p-3">
          {noticeText}
        </div>
      )}
    </DialogLayout>
  );
}
