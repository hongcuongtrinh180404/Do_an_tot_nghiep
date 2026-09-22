'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { IApiResponse, IUserProfile } from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { authKeys } from '@/features/auth/api/auth.api';
import { useIsMounted } from '@/hooks/use-is-mounted';
import type {
  IUpdateProfilePayload,
  IAvatarUploadResponse,
} from '../types/profile.types';

export const profileKeys = {
  all: ['profile'] as const,
  detail: () => [...profileKeys.all, 'detail'] as const,
};

export const profileApi = {
  async getProfile(): Promise<IUserProfile> {
    const res = await apiClient.get<IApiResponse<IUserProfile>>('/users/profile');
    return res.data.data;
  },

  async updateProfile(payload: IUpdateProfilePayload): Promise<IUserProfile> {
    const res = await apiClient.patch<IApiResponse<IUserProfile>>(
      '/users/profile',
      payload,
    );
    return res.data.data;
  },

  async uploadAvatar(file: File): Promise<IAvatarUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<IApiResponse<IAvatarUploadResponse>>(
      '/users/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return res.data.data;
  },
};

export function useUserProfileQuery() {
  const isMounted = useIsMounted();
  const hasToken =
    isMounted && typeof window !== 'undefined'
      ? !!localStorage.getItem('accessToken')
      : false;

  return useQuery({
    queryKey: profileKeys.detail(),
    queryFn: () => profileApi.getProfile(),
    enabled: isMounted && hasToken,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IUpdateProfilePayload) =>
      profileApi.updateProfile(payload),
    onSuccess: (updatedUser: IUserProfile) => {
      // Sync into React Query caches
      queryClient.setQueryData(profileKeys.detail(), updatedUser);
      queryClient.setQueryData(authKeys.me(), updatedUser);

      // Sync into localStorage
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          localStorage.setItem('user', JSON.stringify({ ...parsed, ...updatedUser }));
        }
      } catch {
        // Ignore JSON error
      }

      toast.success('Cập nhật thông tin thành công!', {
        description: 'Thông tin tài khoản của bạn đã được cập nhật.',
      });
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Không thể cập nhật thông tin. Vui lòng thử lại.';
      toast.error('Lỗi cập nhật', {
        description: message || 'Vui lòng kiểm tra lại kết nối hoặc thông tin đã nhập.',
      });
    },
  });
}

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: (data: IAvatarUploadResponse) => {
      const updatedUser = data.user;

      // Sync into React Query caches
      queryClient.setQueryData(profileKeys.detail(), updatedUser);
      queryClient.setQueryData(authKeys.me(), updatedUser);

      // Sync into localStorage
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          localStorage.setItem('user', JSON.stringify({ ...parsed, ...updatedUser }));
        }
      } catch {
        // Ignore JSON error
      }

      toast.success('Tải ảnh đại diện thành công!', {
        description: 'Ảnh đại diện cá nhân mới đã được lưu trữ an toàn trên Cloudinary.',
      });
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Không thể tải ảnh lên Cloudinary. Vui lòng kiểm tra lại file hoặc cấu hình.';
      toast.error('Lỗi upload avatar', {
        description: message || 'Quá trình upload thất bại. Vui lòng thử lại.',
      });
    },
  });
}
