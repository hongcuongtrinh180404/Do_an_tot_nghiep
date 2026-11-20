'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import type { DashboardPeriodType, IDashboardCustomDates } from '../types';
import { useAdminDashboardQuery } from '../api/admin-dashboard.api';
import { DashboardHeader } from './dashboard-header';
import { DashboardKpiCards } from './dashboard-kpi-cards';
import { DashboardRevenueSection } from './dashboard-revenue-section';
import { DashboardInstructorsSection } from './dashboard-instructors-section';
import { DashboardCoursesSection } from './dashboard-courses-section';
import { DashboardReviewsSection } from './dashboard-reviews-section';
import { DashboardPendingDrawer } from './dashboard-pending-drawer';
import { PERIOD_LABELS } from '../constants/mock-dashboard-data';

export function AdminDashboardView(): React.JSX.Element {
  const [globalPeriod, setGlobalPeriod] = React.useState<DashboardPeriodType>('this_month');
  const [customDates, setCustomDates] = React.useState<IDashboardCustomDates>({
    startDate: '2026-11-01',
    endDate: '2026-11-19',
  });

  const [isPendingDrawerOpen, setIsPendingDrawerOpen] = React.useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = React.useState(false);
  const [isSimulatedError, setIsSimulatedError] = React.useState(false);

  const {
    data: dashboardData,
    isLoading,
    isError,
    refetch,
  } = useAdminDashboardQuery(globalPeriod, globalPeriod === 'custom' ? customDates : undefined);

  const handlePeriodChange = (newPeriod: DashboardPeriodType) => {
    setGlobalPeriod(newPeriod);
    toast.success(`Đã cập nhật dữ liệu: ${PERIOD_LABELS[newPeriod]}`);
  };

  const handleCustomDatesChange = (dates: IDashboardCustomDates) => {
    setCustomDates(dates);
    toast.success(`Đã lọc dữ liệu từ ${dates.startDate} đến ${dates.endDate}`);
  };

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    setIsSimulatedError(false);
    try {
      await refetch();
      toast.success('Đã làm mới dữ liệu thống kê Dashboard');
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 400);
    }
  };

  const hasError = isError || isSimulatedError;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
      {/* Global Error Banner */}
      {hasError && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="size-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Icon icon="lucide:wifi-off" className="size-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">
                Không thể tải dữ liệu thời gian thực từ máy chủ
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dữ liệu hiển thị đang sử dụng bộ nhớ đệm cục bộ. Vui lòng kiểm tra kết nối mạng và thử lại.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-xs"
          >
            <Icon icon="lucide:rotate-ccw" className="size-3.5" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* 1. Header & Global Period Filters */}
      <DashboardHeader
        period={globalPeriod}
        onPeriodChange={handlePeriodChange}
        customDates={customDates}
        onCustomDatesChange={handleCustomDatesChange}
        onRefresh={handleManualRefresh}
        isRefreshing={isManualRefreshing || isLoading}
      />

      {/* 2. 6 KPI Cards (3x2 Grid) */}
      <DashboardKpiCards
        kpis={dashboardData?.kpis ?? {
          grossRevenue: { cur: 1284500000, prev: 1096200000 },
          platformRevenue: { cur: 385350000, prev: 328860000 },
          instructorRevenue: { cur: 899150000, prev: 767340000 },
          newStudents: { cur: 3490, prev: 2980 },
          enrollments: { cur: 7860, prev: 6790, paid: 2140, free: 5720 },
          pendingTasks: { cur: 16, courses: 5, instructors: 3, reviews: 8 },
        }}
        onOpenPendingDrawer={() => setIsPendingDrawerOpen(true)}
        isLoading={isLoading}
      />

      {/* 3. Section: Revenue Analysis & Commission Breakdown */}
      <DashboardRevenueSection
        globalPeriod={globalPeriod}
        initialChartData={dashboardData?.chartSeries}
      />

      {/* 4. Section: Top Instructors Ranking */}
      <DashboardInstructorsSection globalPeriod={globalPeriod} />

      {/* 5. Section: Course Performance (3 Tabs) */}
      <DashboardCoursesSection globalPeriod={globalPeriod} />

      {/* 6. Section: Course Quality & Ratings (2 Equal Columns) */}
      <DashboardReviewsSection globalPeriod={globalPeriod} />

      {/* Drawer 1: Pending Tasks (NO SePay) */}
      <DashboardPendingDrawer
        isOpen={isPendingDrawerOpen}
        onClose={() => setIsPendingDrawerOpen(false)}
      />
    </div>
  );
}
