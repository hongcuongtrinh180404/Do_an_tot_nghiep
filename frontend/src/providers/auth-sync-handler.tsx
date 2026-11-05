'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AuthSyncMessage {
  type: 'AUTH_LOGOUT' | 'AUTH_USER_SWITCHED';
  reason?: string;
  user?: unknown;
}

export function AuthSyncHandler(): null {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      return;
    }

    const channel = new BroadcastChannel('app_auth_sync');

    channel.onmessage = (event: MessageEvent<AuthSyncMessage>) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'AUTH_LOGOUT') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        queryClient.clear();

        toast.info(
          data.reason === 'EXPIRED'
            ? 'Phiên đăng nhập đã hết hạn. Đang chuyển về trang chủ.'
            : 'Tài khoản đã đăng xuất từ một phiên khác.',
        );

        if (pathname !== '/') {
          router.replace('/');
        }
        router.refresh();
      } else if (data.type === 'AUTH_USER_SWITCHED') {
        queryClient.clear();
        if (pathname !== '/') {
          router.replace('/');
        }
        router.refresh();
      }
    };

    return () => {
      channel.close();
    };
  }, [router, pathname, queryClient]);

  return null;
}

