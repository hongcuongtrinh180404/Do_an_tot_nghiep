'use client';

import { useQuery } from '@tanstack/react-query';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { apiClient } from '@/lib/api-client';
import type { IApiResponse, IRevenueOverviewKpi, IRevenueChartItem, IAdminReviewStats } from 'share-lib';
import type {
  DashboardPeriodType,
  IDashboardCustomDates,
  IDashboardKpiData,
  IDashboardRevenueChartPoint,
} from '../types';
import {
  KPI_DATA_BY_PERIOD,
  REVENUE_CHART_SERIES,
  INSTRUCTORS_DATA,
  COURSES_PERFORMANCE_DATA,
  PENDING_TASKS_DATA,
} from '../constants/mock-dashboard-data';

export const adminDashboardKeys = {
  all: ['admin-dashboard'] as const,
  overview: (period: DashboardPeriodType, customDates?: IDashboardCustomDates) =>
    [...adminDashboardKeys.all, 'overview', period, customDates] as const,
};

export interface AdminDashboardAggregateResult {
  kpis: IDashboardKpiData;
  chartSeries: IDashboardRevenueChartPoint[];
  instructors: typeof INSTRUCTORS_DATA;
  courses: typeof COURSES_PERFORMANCE_DATA;
  pendingTasks: typeof PENDING_TASKS_DATA;
  isBackendConnected: boolean;
}

export async function fetchAdminDashboardData(
  period: DashboardPeriodType,
  customDates?: IDashboardCustomDates,
): Promise<AdminDashboardAggregateResult> {
  const fallbackKpis = KPI_DATA_BY_PERIOD[period] || KPI_DATA_BY_PERIOD.this_month;
  let chartSeries = REVENUE_CHART_SERIES.day;
  let isBackendConnected = false;

  try {
    // Map period to API timeRange
    const timeRangeMap: Record<DashboardPeriodType, string> = {
      today: 'today',
      yesterday: 'today',
      '7d': '7days',
      '30d': '30days',
      this_month: 'thisMonth',
      last_month: 'lastMonth',
      this_year: 'thisYear',
      custom: 'custom',
    };

    const params: Record<string, string | undefined> = {
      timeRange: timeRangeMap[period] || 'thisMonth',
      startDate: period === 'custom' ? customDates?.startDate : undefined,
      endDate: period === 'custom' ? customDates?.endDate : undefined,
    };

    // Concurrently fetch available backend stats
    const [revenueRes, chartRes, reviewStatsRes, pendingAppsRes] = await Promise.allSettled([
      apiClient.get<IApiResponse<IRevenueOverviewKpi>>('/payments/revenue/overview', { params }),
      apiClient.get<IApiResponse<IRevenueChartItem[]>>('/payments/revenue/chart', { params }),
      apiClient.get<IApiResponse<IAdminReviewStats>>('/reviews/admin/stats'),
      apiClient.get<IApiResponse<{ pendingCount: number }>>('/admin/instructor-applications/stats/pending-count'),
    ]);

    const kpis: IDashboardKpiData = { ...fallbackKpis };

    if (revenueRes.status === 'fulfilled' && revenueRes.value.data?.data) {
      const rev = revenueRes.value.data.data;
      kpis.grossRevenue.cur = rev.totalRevenue || fallbackKpis.grossRevenue.cur;
      kpis.platformRevenue.cur = rev.platformCommission || fallbackKpis.platformRevenue.cur;
      kpis.instructorRevenue.cur = rev.instructorEarnings || fallbackKpis.instructorRevenue.cur;
      kpis.enrollments.paid = rev.successfulOrders || fallbackKpis.enrollments.paid;
      isBackendConnected = true;
    }

    if (chartRes.status === 'fulfilled' && chartRes.value.data?.data?.length) {
      const items = chartRes.value.data.data;
      chartSeries = items.map((item) => ({
        date: item.date,
        label: item.label,
        grossRevenue: item.totalRevenue,
        platformRevenue: item.platformCommission,
        instructorRevenue: item.instructorEarnings,
        orderCount: item.orderCount,
      }));
      isBackendConnected = true;
    }

    if (pendingAppsRes.status === 'fulfilled' && pendingAppsRes.value.data?.data) {
      const pCount = pendingAppsRes.value.data.data.pendingCount ?? fallbackKpis.pendingTasks.instructors;
      kpis.pendingTasks.instructors = pCount;
    }

    if (reviewStatsRes.status === 'fulfilled' && reviewStatsRes.value.data?.data) {
      const rStats = reviewStatsRes.value.data.data;
      kpis.pendingTasks.reviews = rStats.reportedCount ?? fallbackKpis.pendingTasks.reviews;
    }

    kpis.pendingTasks.cur =
      kpis.pendingTasks.courses + kpis.pendingTasks.instructors + kpis.pendingTasks.reviews;

    return {
      kpis,
      chartSeries,
      instructors: INSTRUCTORS_DATA,
      courses: COURSES_PERFORMANCE_DATA,
      pendingTasks: PENDING_TASKS_DATA,
      isBackendConnected,
    };
  } catch {
    // If network or server fails, return baseline verified data
    return {
      kpis: fallbackKpis,
      chartSeries: REVENUE_CHART_SERIES.day,
      instructors: INSTRUCTORS_DATA,
      courses: COURSES_PERFORMANCE_DATA,
      pendingTasks: PENDING_TASKS_DATA,
      isBackendConnected: false,
    };
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
