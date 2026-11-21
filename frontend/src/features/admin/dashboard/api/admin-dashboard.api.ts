'use client';

import { useQuery } from '@tanstack/react-query';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { apiClient } from '@/lib/api-client';
import type {
  IApiResponse,
  IAdminDashboardAggregateResponse,
  IDashboardKpiData,
  IDashboardRevenueChartPoint,
  CategoryRevenueItem,
  IDashboardPendingTask,
  IDashboardCoursePerformance,
  DashboardPeriodType,
} from 'share-lib';
import type { IDashboardCustomDates } from '../types';

export const adminDashboardKeys = {
  all: ['admin-dashboard'] as const,
  overview: (period: DashboardPeriodType, customDates?: IDashboardCustomDates) =>
    [...adminDashboardKeys.all, 'overview', period, customDates] as const,
  chart: (
    period: DashboardPeriodType,
    groupBy: 'day' | 'month',
    customDates?: IDashboardCustomDates,
  ) => [...adminDashboardKeys.all, 'chart', period, groupBy, customDates] as const,
};

export interface AdminDashboardAggregateResult {
  kpis: IDashboardKpiData;
  chartSeries: IDashboardRevenueChartPoint[];
  categoryRevenue: CategoryRevenueItem[];
  pendingTasks: IDashboardPendingTask[];
  courses: IDashboardCoursePerformance[];
  isBackendConnected: boolean;
}

const EMPTY_KPIS: IDashboardKpiData = {
  grossRevenue: { cur: 0, prev: 0 },
  platformRevenue: { cur: 0, prev: 0 },
  instructorRevenue: { cur: 0, prev: 0 },
  newStudents: { cur: 0, prev: 0 },
  enrollments: { cur: 0, prev: 0, paid: 0, free: 0 },
  pendingTasks: { cur: 0, courses: 0, instructors: 0, reviews: 0 },
};

export async function fetchAdminDashboardData(
  period: DashboardPeriodType,
  customDates?: IDashboardCustomDates,
): Promise<AdminDashboardAggregateResult> {
  try {
    const params: Record<string, string | undefined> = {
      period,
      startDate: period === 'custom' ? customDates?.startDate : undefined,
      endDate: period === 'custom' ? customDates?.endDate : undefined,
    };

    const res = await apiClient.get<IApiResponse<IAdminDashboardAggregateResponse>>(
      '/admin/dashboard/aggregate',
      { params },
    );

    const payload = res.data?.data;

    if (payload) {
      return {
        kpis: payload.kpis || EMPTY_KPIS,
        chartSeries: payload.chartSeries || [],
        categoryRevenue: payload.categoryRevenue || [],
        pendingTasks: payload.pendingTasks || [],
        courses: payload.courses || [],
        isBackendConnected: true,
      };
    }

    return {
      kpis: EMPTY_KPIS,
      chartSeries: [],
      categoryRevenue: [],
      pendingTasks: [],
      courses: [],
      isBackendConnected: true,
    };
  } catch (error) {
    console.error('Failed to fetch admin dashboard aggregate data:', error);
    return {
      kpis: EMPTY_KPIS,
      chartSeries: [],
      categoryRevenue: [],
      pendingTasks: [],
      courses: [],
      isBackendConnected: false,
    };
  }
}

export async function fetchAdminDashboardChartData(
  period: DashboardPeriodType,
  groupBy: 'day' | 'month',
  customDates?: IDashboardCustomDates,
): Promise<IDashboardRevenueChartPoint[]> {
  try {
    const params: Record<string, string | undefined> = {
      period,
      groupBy,
      startDate: period === 'custom' ? customDates?.startDate : undefined,
      endDate: period === 'custom' ? customDates?.endDate : undefined,
    };

    const res = await apiClient.get<IApiResponse<IDashboardRevenueChartPoint[]>>(
      '/admin/dashboard/chart',
      { params },
    );

    return res.data?.data || [];
  } catch (error) {
    console.error('Failed to fetch admin dashboard chart data:', error);
    return [];
  }
}

export function useAdminDashboardQuery(
  period: DashboardPeriodType,
  customDates?: IDashboardCustomDates,
) {
  const isMounted = useIsMounted();

  return useQuery({
    queryKey: adminDashboardKeys.overview(period, customDates),
    queryFn: () => fetchAdminDashboardData(period, customDates),
    enabled: isMounted,
    staleTime: 60 * 1000,
  });
}

export function useAdminDashboardChartQuery(
  period: DashboardPeriodType,
  groupBy: 'day' | 'month',
  customDates?: IDashboardCustomDates,
) {
  const isMounted = useIsMounted();

  return useQuery({
    queryKey: adminDashboardKeys.chart(period, groupBy, customDates),
    queryFn: () => fetchAdminDashboardChartData(period, groupBy, customDates),
    enabled: isMounted,
    staleTime: 60 * 1000,
  });
}
