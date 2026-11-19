'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { IApiResponse, IInstructorApplication, IInstructorTerm } from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { useIsMounted } from '@/hooks/use-is-mounted';

export interface ApplyInstructorApplicationPayload {
  phone: string;
  expertises: string[];
  bio: string;
  experience: string;
  cvFileName?: string;
  cvFileUrl?: string;
}

export const instructorApplicationKeys = {
  all: ['instructor-application'] as const,
  mine: () => [...instructorApplicationKeys.all, 'mine'] as const,
  terms: () => [...instructorApplicationKeys.all, 'terms'] as const,
};

export const instructorApplicationApi = {
  async getMyApplication(): Promise<IInstructorApplication | null> {
    try {
      const response = await apiClient.get<IApiResponse<IInstructorApplication | null>>(
        '/instructor-applications/my-application',
      );
      return response.data.data;
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number } };
      if (axiosError?.response?.status === 401) {
        return null;
      }
      throw err;
    }
  },

  async apply(payload: ApplyInstructorApplicationPayload): Promise<IInstructorApplication> {
    const response = await apiClient.post<IApiResponse<IInstructorApplication>>(
      '/instructor-applications/apply',
      payload,
    );
    return response.data.data;
  },

  async getTerms(): Promise<IInstructorTerm[]> {
    const response = await apiClient.get<IApiResponse<IInstructorTerm[]>>(
      '/instructor-applications/terms',
    );
    return response.data.data;
  },
};

export function useMyInstructorApplicationQuery(enabled = true) {
  const isMounted = useIsMounted();
  return useQuery({
    queryKey: instructorApplicationKeys.mine(),
    queryFn: () => instructorApplicationApi.getMyApplication(),
    enabled: isMounted && enabled,
    staleTime: 1000 * 60,
  });
}

export function useInstructorApplicationTermsQuery() {
  const isMounted = useIsMounted();
  return useQuery({
    queryKey: instructorApplicationKeys.terms(),
    queryFn: () => instructorApplicationApi.getTerms(),
    enabled: isMounted,
    staleTime: 1000 * 60 * 5,
  });
}

export function useApplyInstructorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApplyInstructorApplicationPayload) =>
      instructorApplicationApi.apply(payload),
    onSuccess: () => {
      toast.success('Gửi hồ sơ đăng ký thành công!', {
        description: 'Hồ sơ của bạn đã được tiếp nhận và đang chờ Ban Quản Trị xem xét.',
      });
      void queryClient.invalidateQueries({ queryKey: instructorApplicationKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['admin-instructors'] });
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: { data?: { message?: string | string[] } };
      };
      const message =
        axiosError?.response?.data?.message || 'Có lỗi xảy ra trong quá trình nộp hồ sơ.';
      toast.error('Nộp hồ sơ thất bại', {
        description: Array.isArray(message) ? message[0] : message,
      });
    },
  });
}
