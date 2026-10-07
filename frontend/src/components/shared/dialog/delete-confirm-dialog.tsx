'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
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
}: DeleteConfirmDialogProps): React.JSX.Element {
  const defaultDesc = itemName
    ? `Bạn có chắc chắn muốn xóa "${itemName}" không? Hành động này có thể đưa dữ liệu vào thùng rác hoặc xóa khỏi hệ thống.`
    : 'Bạn có chắc chắn muốn thực hiện hành động này không? Hành động này không thể hoàn tác.';

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description || defaultDesc}
      icon="lucide:alert-triangle"
      iconClassName="bg-destructive/15 text-destructive ring-destructive/20"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="text-xs"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="text-xs font-semibold shadow-xs"
          >
            {isLoading ? 'Đang xóa...' : confirmText}
          </Button>
        </>
      }
    >
      <div className="text-xs text-muted-foreground bg-destructive/5 border border-destructive/20 rounded-lg p-3">
        Lưu ý: Dữ liệu bị xóa sẽ được lưu trữ dưới dạng xóa mềm và có thể khôi phục lại khi cần thiết từ phía quản trị cấp cao.
      </div>
    </DialogLayout>
  );
}
