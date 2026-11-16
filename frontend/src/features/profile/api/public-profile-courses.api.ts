'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { IApiResponse, ICourse } from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { useIsMounted } from '@/hooks/use-is-mounted';
import {
  mapCourseToPublicCard,
  type IPublicCoursesResult,
} from '@/features/course/services/public-courses.service';

export function usePublicProfileCoursesQuery(instructorId?: string, page = 1) {
  const isMounted = useIsMounted();
  return useQuery<IPublicCoursesResult>({
    queryKey: ['public-profile-courses', instructorId, page],
    enabled: isMounted && Boolean(instructorId),
    placeholderData: keepPreviousData,
    staleTime: 60000,
    queryFn: async () => {
      // Do not use the catalog's mock-data fallback on a real person's profile.
      const response = await apiClient.get<IApiResponse<{
        items: ICourse[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>>('/courses', { params: { instructorId, page, limit: 12 } });
      const result = response.data.data;
      return { ...result, items: result.items.map((course) => mapCourseToPublicCard(course)) };
    },
  });
}
