import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface FormLabelProps extends React.ComponentPropsWithoutRef<typeof Label> {
  required?: boolean;
}

export function FormLabel({
  children,
  required,
  className,
  ...props
}: FormLabelProps): React.JSX.Element {
  if (!children) return <></>;

  return (
    <Label
      className={cn('text-xs font-semibold text-foreground flex items-center gap-1 select-none', className)}
      {...props}
    >
      <span>{children}</span>
      {required && <span className="text-destructive font-bold text-xs" title="Bắt buộc">*</span>}
    </Label>
  );
}
