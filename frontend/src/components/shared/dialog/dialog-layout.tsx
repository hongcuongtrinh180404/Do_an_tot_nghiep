'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface DialogLayoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: string;
  iconClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function DialogLayout({
  open,
  onOpenChange,
  title,
  description,
  icon,
  iconClassName,
  children,
  footer,
  className,
}: DialogLayoutProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-md p-6 gap-5 bg-card border-border/80 shadow-lg', className)}>
        <DialogHeader className="gap-2">
          <div className="flex items-start gap-3">
            {icon && (
              <div
                className={cn(
                  'size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/20',
                  iconClassName,
                )}
              >
                <Icon icon={icon} className="size-5" />
              </div>
            )}
            <div className="space-y-1 text-left flex-1 min-w-0">
              <DialogTitle className="text-base font-bold text-foreground tracking-tight">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="py-1">{children}</div>

        {footer && <DialogFooter className="gap-2 sm:gap-2">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
