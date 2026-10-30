'use client';

import { useQuery } from '@tanstack/react-query';
import type { IApiResponse, ICourseCategory } from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { useIsMounted } from '@/hooks/use-is-mounted';

export const courseCategoryKeys = {
  all: ['course-categories'] as const,
  publicList: () => [...courseCategoryKeys.all, 'public'] as const,
};

export const courseCategoryApi = {
  async getPublicCategories(): Promise<ICourseCategory[]> {
    const res = await apiClient.get<IApiResponse<ICourseCategory[]>>('/course-categories');
    return res.data.data;
  },
};

export function usePublicCategoriesQuery() {
  const isMounted = useIsMounted();

  return useQuery({
    queryKey: courseCategoryKeys.publicList(),
    queryFn: () => courseCategoryApi.getPublicCategories(),
    enabled: isMounted,
    staleTime: 60 * 1000,
  });
}
