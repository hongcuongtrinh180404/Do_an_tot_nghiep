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
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  descriptionPlacement?: 'beside' | 'below';
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
  bodyClassName,
  headerClassName,
  footerClassName,
  descriptionPlacement = 'beside',
}: DialogLayoutProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-md p-6 gap-4 bg-card border-border/80 shadow-2xl rounded-2xl overflow-hidden',
          className,
        )}
      >
        <DialogHeader className={cn('shrink-0 gap-3', headerClassName)}>
          {descriptionPlacement === 'below' ? (
            <div className="space-y-3.5 text-left">
              <div className="flex items-center gap-3.5 min-w-0 pr-6">
                {icon && (
                  <div
                    className={cn(
                      'size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/20',
                      iconClassName,
                    )}
                  >
                    <Icon icon={icon} className="size-6" />
                  </div>
                )}
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground tracking-tight leading-snug">
                  {title}
                </DialogTitle>
              </div>
              {description && (
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </DialogDescription>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-3.5 pr-6">
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
          )}
        </DialogHeader>

        {children && <div className={cn('py-1', bodyClassName)}>{children}</div>}

        {footer && (
          <DialogFooter
            className={cn(
              '!-mx-6 !-mb-6 px-6 py-3.5 bg-zinc-50/70 dark:bg-zinc-900/30 border-t border-border/50 shrink-0 gap-2.5 sm:gap-2.5 sm:justify-end !rounded-b-2xl',
              footerClassName,
            )}
          >
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
