'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { Icon } from '@/components/ui/icon';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps): React.JSX.Element | null {
  const router = useRouter();
  const pathname = usePathname();
  const isMounted = useIsMounted();
  const { isLoading, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (!isMounted || isLoading) return;

    if (!isAuthenticated) {
      const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : '/login';
      router.replace(redirectUrl);
      return;
    }

    if (!isAdmin) {
      toast.error('Truy cập bị từ chối', {
        description: 'Tài khoản của bạn không có quyền truy cập khu vực Quản trị viên.',
      });
      router.replace('/');
    }
  }, [isMounted, isLoading, isAuthenticated, isAdmin, router, pathname]);

  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="size-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <Icon icon="lucide:shield-check" className="absolute size-5 text-primary" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">Đang xác thực quyền Quản trị...</p>
          <p className="text-xs text-muted-foreground">Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
