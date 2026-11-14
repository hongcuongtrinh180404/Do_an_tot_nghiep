'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  IApiResponse,
  ITeachingStatsOverview,
  IInstructorCourseRevenue,
  ICourseReviewStats,
  IReview,
} from 'share-lib';
import { apiClient } from '@/lib/api-client';

export interface IPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ITeachingOverviewParams {
  timeRange?: string;
  startDate?: string;
  endDate?: string;
}

export interface ICoursesRevenueParams extends ITeachingOverviewParams {
  search?: string;
  sort?: 'revenue_desc' | 'earnings_desc' | 'sales_desc';
  page?: number;
  limit?: number;
}

export interface IInstructorReviewsParams {
  courseId?: string;
  rating?: number;
  sort?: 'created_desc' | 'created_asc';
  page?: number;
  limit?: number;
}

export const teachingStatsKeys = {
  all: ['instructor-teaching-stats'] as const,
  overview: (params: ITeachingOverviewParams) =>
    [...teachingStatsKeys.all, 'overview', params] as const,
  courses: (params: ICoursesRevenueParams) =>
    [...teachingStatsKeys.all, 'courses', params] as const,
  reviewStats: (courseId?: string) =>
    [...teachingStatsKeys.all, 'review-stats', courseId || 'all'] as const,
  reviewsList: (params: IInstructorReviewsParams) =>
    [...teachingStatsKeys.all, 'reviews-list', params] as const,
};

export const teachingStatsApi = {
  async getOverview(params: ITeachingOverviewParams): Promise<ITeachingStatsOverview> {
    const res = await apiClient.get<IApiResponse<ITeachingStatsOverview>>(
      '/instructor/teaching-stats/overview',
      { params },
    );
    return res.data.data;
  },

  async getCoursesRevenue(
    params: ICoursesRevenueParams,
  ): Promise<IPaginatedResult<IInstructorCourseRevenue>> {
    const res = await apiClient.get<IApiResponse<IPaginatedResult<IInstructorCourseRevenue>>>(
      '/instructor/teaching-stats/courses',
      { params },
    );
    return res.data.data;
  },

  async getReviewStats(courseId?: string): Promise<ICourseReviewStats> {
    const res = await apiClient.get<IApiResponse<ICourseReviewStats>>(
      '/reviews/instructor/stats',
      { params: courseId ? { courseId } : {} },
    );
    return res.data.data;
  },

  async getReviews(params: IInstructorReviewsParams): Promise<IPaginatedResult<IReview>> {
    const res = await apiClient.get<IApiResponse<IPaginatedResult<IReview>>>(
      '/reviews/instructor',
      { params },
    );
    return res.data.data;
  },
};

export function useTeachingOverviewQuery(params: ITeachingOverviewParams) {
  return useQuery({
    queryKey: teachingStatsKeys.overview(params),
    queryFn: () => teachingStatsApi.getOverview(params),
    staleTime: 30 * 1000,
  });
}

export function useCoursesRevenueQuery(params: ICoursesRevenueParams) {
  return useQuery({
    queryKey: teachingStatsKeys.courses(params),
    queryFn: () => teachingStatsApi.getCoursesRevenue(params),
    staleTime: 30 * 1000,
  });
}

export function useInstructorReviewStatsQuery(courseId?: string) {
  return useQuery({
    queryKey: teachingStatsKeys.reviewStats(courseId),
    queryFn: () => teachingStatsApi.getReviewStats(courseId),
    staleTime: 30 * 1000,
  });
}

export function useInstructorReviewsQuery(params: IInstructorReviewsParams) {
  return useQuery({
    queryKey: teachingStatsKeys.reviewsList(params),
    queryFn: () => teachingStatsApi.getReviews(params),
    staleTime: 30 * 1000,
  });
}
