'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PasswordInputProps = React.ComponentProps<'input'>;

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className="relative flex items-center">
        <Input
          type={showPassword ? 'text' : 'password'}
          className={cn('pr-10', className)}
          ref={ref}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-transparent"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
          tabIndex={-1}
        >
          {showPassword ? (
            <Icon icon="lucide:eye-off" className="size-4" aria-hidden="true" />
          ) : (
            <Icon icon="lucide:eye" className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
