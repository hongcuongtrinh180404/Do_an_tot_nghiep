import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface FormErrorMessageProps {
  message?: string;
  className?: string;
}

export function FormErrorMessage({
  message,
  className,
}: FormErrorMessageProps): React.JSX.Element | null {
  if (!message) return null;

  return (
    <div
      className={cn('flex items-center gap-1.5 text-xs font-medium text-destructive mt-1.5', className)}
      role="alert"
    >
      <Icon icon="lucide:alert-circle" className="size-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
