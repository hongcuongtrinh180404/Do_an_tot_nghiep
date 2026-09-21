'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  IApiResponse,
  IAuthResponse,
  ILoginPayload,
  IRegisterPayload,
  IUserProfile,
} from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { useIsMounted } from '@/hooks/use-is-mounted';

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

export const authApi = {
  async login(payload: ILoginPayload): Promise<IAuthResponse> {
    const res = await apiClient.post<IApiResponse<IAuthResponse>>('/auth/login', {
      email: payload.email.trim(),
      password: payload.password,
    });
    return res.data.data;
  },

  async register(payload: IRegisterPayload): Promise<IAuthResponse> {
    const res = await apiClient.post<IApiResponse<IAuthResponse>>('/auth/register', {
      email: payload.email.trim(),
      password: payload.password,
      firstName: payload.firstName?.trim() || undefined,
      lastName: payload.lastName?.trim() || undefined,
    });
    return res.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post<IApiResponse<{ loggedOut: boolean }>>('/auth/logout');
  },

  async getMe(): Promise<IUserProfile> {
    const res = await apiClient.get<IApiResponse<IUserProfile>>('/auth/me');
    return res.data.data;
  },
};

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ILoginPayload) => authApi.login(payload),
    onSuccess: (data: IAuthResponse) => {
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      queryClient.setQueryData(authKeys.me(), data.user);
      toast.success('Đăng nhập thành công!', {
        description: `Chào mừng ${data.user.firstName || data.user.email}`,
      });
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      toast.error('Lỗi đăng nhập', {
        description: message || 'Thông tin tài khoản hoặc mật khẩu không chính xác.',
      });
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IRegisterPayload) => authApi.register(payload),
    onSuccess: (data: IAuthResponse) => {
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      queryClient.setQueryData(authKeys.me(), data.user);
      toast.success('Đăng ký tài khoản thành công!');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Đăng ký thất bại. Vui lòng thử lại.';
      toast.error('Lỗi đăng ký', {
        description: message || 'Không thể đăng ký tài khoản.',
      });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      queryClient.removeQueries({ queryKey: authKeys.all });
      toast.info('Đã đăng xuất khỏi hệ thống');
    },
  });
}

export function useCurrentUserQuery() {
  const isMounted = useIsMounted();

  const hasToken =
    isMounted && typeof window !== 'undefined'
      ? !!localStorage.getItem('accessToken')
      : false;

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => authApi.getMe(),
    enabled: isMounted && hasToken,
    staleTime: 5 * 60 * 1000,
  });
}
