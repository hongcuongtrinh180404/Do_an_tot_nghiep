'use client';

import { RoleEnum } from 'share-lib';
import { useCurrentUserQuery, useLogoutMutation } from '../api/auth.api';

export function useAuth(options?: { logoutRedirectTo?: string }) {
  const { data: user, isLoading, isError, refetch } = useCurrentUserQuery();
  const logoutMutation = useLogoutMutation({ redirectTo: options?.logoutRedirectTo });

  return {
    user,
    isLoading,
    isError,
    isAuthenticated: !!user,
    isAdmin: user?.role === RoleEnum.ADMIN,
    isUser: user?.role === RoleEnum.USER,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    refetchUser: refetch,
  };
}
