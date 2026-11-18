import * as React from 'react';
import { InstructorApplicationStatusEnum } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface InstructorStatusBadgeProps {
  status: InstructorApplicationStatusEnum;
  className?: string;
  showIcon?: boolean;
}

export function InstructorStatusBadge({
  status,
  className,
  showIcon = true,
}: InstructorStatusBadgeProps): React.JSX.Element {
  switch (status) {
    case InstructorApplicationStatusEnum.PENDING:
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
            className,
          )}
        >
          {showIcon && <Icon icon="lucide:clock" className="size-3.5" />}
          <span>Chờ phê duyệt</span>
        </span>
      );
    case InstructorApplicationStatusEnum.APPROVED:
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
            className,
          )}
        >
          {showIcon && <Icon icon="lucide:check-circle-2" className="size-3.5" />}
          <span>Đã phê duyệt</span>
        </span>
      );
    case InstructorApplicationStatusEnum.REJECTED:
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
            className,
          )}
        >
          {showIcon && <Icon icon="lucide:x-circle" className="size-3.5" />}
          <span>Đã từ chối</span>
        </span>
      );
    default:
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/60',
            className,
          )}
        >
          <span>{status}</span>
        </span>
      );
  }
}
