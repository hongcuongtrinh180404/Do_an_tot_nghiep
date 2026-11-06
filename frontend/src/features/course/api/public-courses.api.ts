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
  byInstructor: (instructorId: string) =>
    [...publicCourseKeys.all, 'instructor', instructorId] as const,
};

export function useInstructorPublicCoursesQuery(
  instructorId?: string | null,
  enabled: boolean = true,
) {
  const isMounted = useIsMounted();

  return useQuery<IPublicCoursesResult>({
    queryKey: publicCourseKeys.byInstructor(instructorId ?? ''),
    queryFn: () => fetchPublicCourses({ instructorId: instructorId ?? undefined, limit: 12 }),
    enabled: Boolean(instructorId) && enabled && isMounted,
    staleTime: 60 * 1000,
  });
}

export function usePublicCoursesCatalogQuery(params: IPublicCoursesFilterParams) {
  const isMounted = useIsMounted();

  return useQuery<IPublicCoursesResult>({
    queryKey: publicCourseKeys.catalog(params),
    queryFn: () => fetchPublicCourses(params),
    enabled: isMounted,
    staleTime: 30 * 1000,
  });
}

