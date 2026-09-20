'use client';

import * as React from 'react';
import { Icon as IconifyIcon, type IconProps as IconifyProps } from '@iconify/react';
import { cn } from '@/lib/utils';

export interface IconProps extends IconifyProps {
  className?: string;
}

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className, icon, ...props }, ref) => {
    return (
      <IconifyIcon
        ref={ref}
        icon={icon}
        className={cn('inline-block size-4 shrink-0', className)}
        {...props}
      />
    );
  },
);

Icon.displayName = 'Icon';
