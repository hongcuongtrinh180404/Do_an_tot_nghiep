'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  IApiResponse,
  IAuthResponse,
  ILoginPayload,
  IRegisterPayload,
  IRegisterResponse,
  IGoogleAuthPayload,
  IVerifyEmailPayload,
  IResendVerificationPayload,
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

  async loginWithGoogle(payload: IGoogleAuthPayload): Promise<IAuthResponse> {
    const res = await apiClient.post<IApiResponse<IAuthResponse>>('/auth/google', {
      idToken: payload.idToken,
    });
    return res.data.data;
  },

  async register(payload: IRegisterPayload): Promise<IRegisterResponse> {
    const res = await apiClient.post<IApiResponse<IRegisterResponse>>('/auth/register', {
      email: payload.email.trim(),
      password: payload.password,
      firstName: payload.firstName?.trim() || undefined,
      lastName: payload.lastName?.trim() || undefined,
    });
    return res.data.data;
  },

  async verifyEmail(payload: IVerifyEmailPayload): Promise<IAuthResponse> {
    const res = await apiClient.post<IApiResponse<IAuthResponse>>('/auth/verify-email', {
      token: payload.token.trim(),
    });
    return res.data.data;
  },

  async resendVerification(
    payload: IResendVerificationPayload,
  ): Promise<{ sent: boolean; message: string }> {
    const res = await apiClient.post<IApiResponse<{ sent: boolean; message: string }>>(
      '/auth/resend-verification',
      {
        email: payload.email.trim(),
      },
    );
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

export function useGoogleAuthMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IGoogleAuthPayload) => authApi.loginWithGoogle(payload),
    onSuccess: (data: IAuthResponse) => {
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('app_auth_sync');
          channel.postMessage({ type: 'AUTH_USER_SWITCHED', user: data.user });
          channel.close();
        } catch {
          // ignore error
        }
      }

      queryClient.setQueryData(authKeys.me(), data.user);
      toast.success('Đăng nhập Google thành công!', {
        description: `Chào mừng ${data.user.fullName || data.user.email}`,
      });
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Đăng nhập Google thất bại. Vui lòng thử lại sau.';
      toast.error('Lỗi xác thực Google', {
        description: message || 'Không thể xác thực danh tính từ tài khoản Google.',
      });
    },
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (payload: IRegisterPayload) => authApi.register(payload),
    onSuccess: (data: IRegisterResponse) => {
      toast.success('Đăng ký tài khoản thành công!', {
        description: data.message || 'Vui lòng kiểm tra email để kích hoạt tài khoản.',
      });
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

export function useVerifyEmailMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IVerifyEmailPayload) => authApi.verifyEmail(payload),
    onSuccess: (data: IAuthResponse) => {
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('app_auth_sync');
          channel.postMessage({ type: 'AUTH_USER_SWITCHED', user: data.user });
          channel.close();
        } catch {
          // ignore error
        }
      }

      queryClient.setQueryData(authKeys.me(), data.user);
      toast.success('Kích hoạt tài khoản thành công!', {
        description: `Chào mừng ${data.user.fullName || data.user.email} đến với Mindly!`,
      });
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Mã xác thực không hợp lệ hoặc đã hết hạn.';
      toast.error('Kích hoạt thất bại', {
        description: message,
      });
    },
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: (payload: IResendVerificationPayload) => authApi.resendVerification(payload),
    onSuccess: (data: { sent: boolean; message: string }) => {
      toast.success('Đã gửi lại email xác thực', {
        description: data.message || 'Vui lòng kiểm tra hộp thư đến của bạn.',
      });
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Không thể gửi lại email xác thực. Vui lòng thử lại sau.';
      toast.error('Lỗi gửi email', {
        description: message,
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
