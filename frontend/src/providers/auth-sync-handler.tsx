'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AUTH_SYNC_CHANNEL,
  isAuthSyncMessageFromThisTab,
  type AuthSyncMessage,
} from '@/lib/auth-sync';

export function AuthSyncHandler(): null {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      return;
    }

    const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);

    channel.onmessage = (event: MessageEvent<AuthSyncMessage>) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      // The emitting tab already updated its own state and navigation.
      if (isAuthSyncMessageFromThisTab(data)) return;

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
