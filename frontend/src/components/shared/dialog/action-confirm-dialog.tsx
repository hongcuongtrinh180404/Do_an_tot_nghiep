'use client';

import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { Button, buttonVariants } from '@/components/ui/button';
import { DialogLayout } from './dialog-layout';
import { cn } from '@/lib/utils';

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;

export type ActionDialogVariant = 'default' | 'warning' | 'info' | 'success' | 'destructive';

export interface ActionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  noticeText?: React.ReactNode;
  itemName?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
  variant?: ActionDialogVariant;
  icon?: string;
}

const variantStyles: Record<
  ActionDialogVariant,
  {
    icon: string;
    iconClassName: string;
    confirmButtonVariant: ButtonVariant;
    confirmButtonClassName?: string;
    noticeClassName: string;
  }
> = {
  default: {
    icon: 'lucide:help-circle',
    iconClassName: 'bg-primary/10 text-primary ring-primary/20',
    confirmButtonVariant: 'default',
    noticeClassName: 'bg-muted/50 border-border/50 text-muted-foreground',
  },
  warning: {
    icon: 'lucide:alert-triangle',
    iconClassName: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/25',
    confirmButtonVariant: 'default',
    confirmButtonClassName:
      'bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 shadow-xs',
    noticeClassName: 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300',
  },
  info: {
    icon: 'lucide:info',
    iconClassName: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-sky-500/25',
    confirmButtonVariant: 'default',
    confirmButtonClassName:
      'bg-sky-600 hover:bg-sky-700 text-white dark:bg-sky-500 dark:hover:bg-sky-600 shadow-xs',
    noticeClassName: 'bg-sky-500/10 border-sky-500/25 text-sky-800 dark:text-sky-300',
  },
  success: {
    icon: 'lucide:check-circle-2',
    iconClassName: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/25',
    confirmButtonVariant: 'default',
    confirmButtonClassName:
      'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-xs',
    noticeClassName: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300',
  },
  destructive: {
    icon: 'lucide:alert-octagon',
    iconClassName: 'bg-destructive/15 text-destructive ring-destructive/20',
    confirmButtonVariant: 'destructive',
    noticeClassName: 'bg-destructive/10 border-destructive/25 text-destructive',
  },
};

export function ActionConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  noticeText,
  itemName,
  onConfirm,
  isLoading = false,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'default',
  icon,
}: ActionConfirmDialogProps): React.JSX.Element {
  const currentVariant = variantStyles[variant] ?? variantStyles.default;
  const activeIcon = icon || currentVariant.icon;

  const defaultDescription = itemName
    ? `Bạn có chắc chắn muốn thực hiện hành động này đối với "${itemName}" không?`
    : 'Bạn có chắc chắn muốn thực hiện hành động này không?';

  return (
    <DialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description || defaultDescription}
      icon={activeIcon}
      iconClassName={currentVariant.iconClassName}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={currentVariant.confirmButtonVariant}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'text-xs font-semibold shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden',
              currentVariant.confirmButtonClassName,
            )}
          >
            {isLoading ? 'Đang xử lý...' : confirmText}
          </Button>
        </>
      }
    >
      {noticeText ? (
        <div className={cn('text-xs rounded-lg p-3 border leading-relaxed', currentVariant.noticeClassName)}>
          {noticeText}
        </div>
      ) : null}
    </DialogLayout>
  );
}
