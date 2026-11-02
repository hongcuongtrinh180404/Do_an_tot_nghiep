'use client';

import { useQuery } from '@tanstack/react-query';
import { useIsMounted } from '@/hooks/use-is-mounted';
import {
  fetchPublicCourses,
  type IPublicCoursesFilterParams,
  type IPublicCoursesResult,
} from '../services/public-courses.service';

export const publicCourseKeys = {
  all: ['public-courses'] as const,
  catalog: (params: IPublicCoursesFilterParams) =>
    [...publicCourseKeys.all, 'catalog', params] as const,
};

export function usePublicCoursesCatalogQuery(params: IPublicCoursesFilterParams) {
  const isMounted = useIsMounted();

  return useQuery<IPublicCoursesResult>({
    queryKey: publicCourseKeys.catalog(params),
    queryFn: () => fetchPublicCourses(params),
    enabled: isMounted,
    staleTime: 30 * 1000,
  });
}

