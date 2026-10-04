'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ICourseMindmap } from 'share-lib';
import { courseMindmapApi, courseMindmapKeys } from '../api/course-mindmap.api';

export function useCourseMindmapQuery(courseId: string) {
  return useQuery({
    queryKey: courseMindmapKeys.detail(courseId),
    queryFn: () => courseMindmapApi.getMindmap(courseId),
    enabled: Boolean(courseId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpsertCourseMindmapMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mindmapData: Record<string, unknown>) =>
      courseMindmapApi.upsertMindmap(courseId, mindmapData),
    onSuccess: (data: ICourseMindmap) => {
      queryClient.setQueryData(courseMindmapKeys.detail(courseId), data.mindmapData);
      toast.success('Lưu sơ đồ tư duy thành công', {
        description: 'Cấu trúc Mindmap của khóa học đã được lưu vào hệ thống.',
      });
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: {
          data?: { message?: string | string[] };
        };
      };
      const rawMessage = axiosError.response?.data?.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
      toast.error('Lưu sơ đồ tư duy thất bại', {
        description: message || 'Đã có lỗi xảy ra trong quá trình lưu dữ liệu sơ đồ.',
      });
    },
  });
}
