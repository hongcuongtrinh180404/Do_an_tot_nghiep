'use client';

import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { queryOptions, useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import type { IApiResponse, ICourse, ICourseApprovalChecklist, ISection } from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { courseKeys } from './course.api';

export const courseApprovalApi = {
  async getChecklist(courseId: string): Promise<ICourseApprovalChecklist> {
    const response = await apiClient.get<IApiResponse<ICourseApprovalChecklist>>(
      `/courses/${courseId}/approval-checklist`,
    );
    return response.data.data;
  },
  async requestApproval(courseId: string): Promise<ICourse> {
    const response = await apiClient.post<IApiResponse<ICourse>>(
      `/courses/${courseId}/request-approval`,
    );
    return response.data.data;
  },
  async cancelApproval(courseId: string): Promise<ICourse> {
    const response = await apiClient.post<IApiResponse<ICourse>>(
      `/courses/${courseId}/cancel-approval`,
    );
    return response.data.data;
  },
};

export function approvalChecklistOptions(courseId: string) {
  return queryOptions({
    queryKey: courseKeys.approvalChecklist(courseId),
    queryFn: () => courseApprovalApi.getChecklist(courseId),
    staleTime: 0,
    retry: false,
  });
}

export function approvalErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (message) return message;
  }
  return 'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
}

export function useCourseApprovalWritesPending(courseId: string): boolean {
  const queryClient = useQueryClient();
  return useIsMutating({
    predicate: (mutation) => {
      const meta = mutation.options.meta;
      if (meta?.approvalCourseId === courseId) return true;
      const sections = queryClient.getQueryData<ISection[]>(courseKeys.sections(courseId));
      return Boolean(sections?.some((section) => section.id === meta?.approvalSectionId));
    },
  }) > 0;
}

export function useRequestCourseApprovalMutation(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => courseApprovalApi.requestApproval(courseId),
    onSuccess: (course) => {
      queryClient.setQueryData(courseKeys.detail(courseId), course);
      void queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      void queryClient.invalidateQueries({ queryKey: courseKeys.myCourses() });
      void queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
    onError: (error) => {
      if (isAxiosError<{ checklist?: ICourseApprovalChecklist }>(error)) {
        const checklist = error.response?.data?.checklist;
        if (checklist) queryClient.setQueryData(courseKeys.approvalChecklist(courseId), checklist);
        if (error.response?.status === 409) {
          void queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
        }
      }
    },
  });
}

export function useCancelCourseApprovalMutation(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => courseApprovalApi.cancelApproval(courseId),
    onSuccess: (course) => {
      queryClient.setQueryData(courseKeys.detail(courseId), course);
      void queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      void queryClient.invalidateQueries({ queryKey: courseKeys.myCourses() });
      void queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Đã hủy yêu cầu phê duyệt khóa học thành công!');
    },
    onError: (error) => {
      const msg = approvalErrorMessage(error);
      toast.error('Lỗi khi hủy yêu cầu duyệt', {
        description: msg,
      });
      if (isAxiosError(error) && error.response?.status === 409) {
        void queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
        void queryClient.invalidateQueries({ queryKey: courseKeys.myCourses() });
      }
    },
  });
}
