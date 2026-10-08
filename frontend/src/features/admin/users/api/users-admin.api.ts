'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { IApiResponse, IUserProfile, RoleEnum, UserStatusEnum } from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { useIsMounted } from '@/hooks/use-is-mounted';

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: RoleEnum | string;
  status?: UserStatusEnum | string;
  sort?: string;
}

export interface UpdateUserAdminPayload {
  fullName?: string;
  username?: string;
  bio?: string;
  role?: RoleEnum;
  status?: UserStatusEnum;
}

export const usersAdminKeys = {
  all: ['admin-users'] as const,
  list: (params: AdminUsersQueryParams) => [...usersAdminKeys.all, 'list', params] as const,
  detail: (userId: string) => [...usersAdminKeys.all, 'detail', userId] as const,
};

export const usersAdminApi = {
  async getUsers(params: AdminUsersQueryParams): Promise<PaginationResult<IUserProfile>> {
    const queryParams: Record<string, string | number> = {
      page: params.page || 1,
      limit: params.limit || 10,
    };

    if (params.search?.trim()) {
      queryParams.search = params.search.trim();
    }

    if (params.role) {
      queryParams.role = params.role;
    }

    if (params.status) {
      queryParams.status = params.status;
    }

    if (params.sort) {
      queryParams.sort = params.sort;
    }

    const res = await apiClient.get<IApiResponse<PaginationResult<IUserProfile>>>('/users', {
      params: queryParams,
    });

    return res.data.data;
  },

  async getUserDetail(userId: string): Promise<IUserProfile> {
    const res = await apiClient.get<IApiResponse<IUserProfile>>(`/users/${userId}`);
    return res.data.data;
  },

  async updateUser(userId: string, payload: UpdateUserAdminPayload): Promise<IUserProfile> {
    const res = await apiClient.patch<IApiResponse<IUserProfile>>(`/users/${userId}`, payload);
    return res.data.data;
  },

  async deleteUser(userId: string): Promise<{ deleted: boolean }> {
    const res = await apiClient.delete<IApiResponse<{ deleted: boolean }>>(`/users/${userId}`);
    return res.data.data;
  },
};

export function useAdminUsersQuery(params: AdminUsersQueryParams) {
  const isMounted = useIsMounted();

  return useQuery({
    queryKey: usersAdminKeys.list(params),
    queryFn: () => usersAdminApi.getUsers(params),
    enabled: isMounted && typeof window !== 'undefined' && !!localStorage.getItem('accessToken'),
    staleTime: 60 * 1000,
  });
}

export function useAdminUserDetailQuery(userId: string) {
  const isMounted = useIsMounted();

  return useQuery({
    queryKey: usersAdminKeys.detail(userId),
    queryFn: () => usersAdminApi.getUserDetail(userId),
    enabled: isMounted && Boolean(userId) && typeof window !== 'undefined' && !!localStorage.getItem('accessToken'),
    staleTime: 60 * 1000,
  });
}

export function useUpdateUserAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateUserAdminPayload }) =>
      usersAdminApi.updateUser(userId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: usersAdminKeys.all });
      toast.success('Cập nhật người dùng thành công', {
        description: `Thông tin tài khoản "${data.fullName || data.email}" đã được cập nhật.`,
      });
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Không thể cập nhật thông tin người dùng. Vui lòng thử lại sau.';
      toast.error('Lỗi cập nhật', { description: message });
    },
  });
}

export function useDeleteUserAdminMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => usersAdminApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersAdminKeys.all });
      toast.success('Xóa người dùng thành công', {
        description: 'Tài khoản người dùng đã được chuyển vào trạng thái xóa mềm.',
      });
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Không thể xóa người dùng. Vui lòng thử lại sau.';
      toast.error('Lỗi khi xóa', { description: message });
    },
  });
}
