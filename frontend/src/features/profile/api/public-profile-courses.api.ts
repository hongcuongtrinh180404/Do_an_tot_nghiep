'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { IApiResponse, IPublicProfileCourses, ProfileCourseType } from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { useIsMounted } from '@/hooks/use-is-mounted';
export function usePublicProfileCoursesQuery(username: string, type: ProfileCourseType, enabled = true) {
  const isMounted = useIsMounted();
  return useInfiniteQuery({
    queryKey: ['public-profile-courses', username, type],
    enabled: isMounted && Boolean(username) && enabled,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: IPublicProfileCourses) => lastPage.nextCursor ?? undefined,
    staleTime: 60000,
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.get<IApiResponse<IPublicProfileCourses>>(
        `/users/public/${encodeURIComponent(username)}/courses`,
        { params: { type, ...(pageParam ? { cursor: pageParam } : {}) } },
      );
      return response.data.data;
    },
  });
}
