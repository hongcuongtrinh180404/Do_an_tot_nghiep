'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import {
  RevenueTimeFilter,
  type RevenueTimeFilterValue,
} from './revenue-time-filter';
import { RevenueKpiCards } from './revenue-kpi-cards';
import { RevenueChart } from './revenue-chart';
import { TransactionTable, type TransactionStatusFilterType } from './transaction-table';
import { TransactionDetailDrawer } from './transaction-detail-drawer';
import { InstructorsRevenueTable } from './instructors-revenue-table';
import {
  useRevenueOverviewQuery,
  useRevenueChartQuery,
  useRevenueTransactionsQuery,
} from '../api/revenue-admin.api';

export function RevenueView(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Active Tab: 'overview' | 'instructors'
  const currentTab = (searchParams.get('tab') || 'overview') === 'instructors'
    ? 'instructors'
    : 'overview';

  const [activeTab, setActiveTab] = React.useState<'overview' | 'instructors'>(currentTab);

  React.useEffect(() => {
    setActiveTab(currentTab);
  }, [currentTab]);

  const handleTabChange = (tab: 'overview' | 'instructors') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Shared Time Filter for Tab 1
  const [timeFilter, setTimeFilter] = React.useState<RevenueTimeFilterValue>({
    timeRange: '30days',
  });

  // Separate Time Filter for Tab 2
  const [instructorTimeFilter, setInstructorTimeFilter] = React.useState<RevenueTimeFilterValue>({
    timeRange: '30days',
  });

  // Tab 1: Transactions Search & Sort & Pagination
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<TransactionStatusFilterType>('ALL');
  const [sort, setSort] = React.useState('newest');
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);

  // Drawer selected order code
  const [selectedOrderCode, setSelectedOrderCode] = React.useState<string | null>(null);

  // Queries for Tab 1
  const overviewQuery = useRevenueOverviewQuery(timeFilter);
  const chartQuery = useRevenueChartQuery(timeFilter);
  const transactionsQuery = useRevenueTransactionsQuery({
    ...timeFilter,
    page,
    limit,
    search,
    sort,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  });

  const handleTimeFilterChange = (val: RevenueTimeFilterValue) => {
    setTimeFilter(val);
    setPage(1); // Reset transaction page to 1 when time filter changes
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Quản Lý Doanh Thu & Hoa Hồng
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Báo cáo tài chính toàn hệ thống, danh sách giao dịch thành công và quản lý hoa hồng giảng viên.
          </p>
        </div>
      </div>

      {/* Main 2 Tabs Bar */}
      <div className="border-b border-border/60 shrink-0">
        <div className="flex gap-2 sm:gap-6">
          <button
            type="button"
            onClick={() => handleTabChange('overview')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon icon="lucide:layout-dashboard" className="size-4" />
            <span>Tổng quan doanh thu</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('instructors')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'instructors'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon icon="lucide:graduation-cap" className="size-4" />
            <span>Doanh thu giảng viên</span>
          </button>
        </div>
      </div>

      {/* Tab 1 Content: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Time Filter */}
          <div className="bg-card p-3 rounded-xl border border-border/60 flex flex-wrap items-center justify-between gap-3">
            <RevenueTimeFilter
              value={timeFilter}
              onChange={handleTimeFilterChange}
            />
            <span className="text-[11px] text-muted-foreground italic">
              * Số liệu tính trên các giao dịch đã xác nhận thanh toán thành công
            </span>
          </div>

          {/* 4 KPI Cards */}
          <RevenueKpiCards
            kpi={overviewQuery.data}
            isLoading={overviewQuery.isLoading}
          />

          {/* Revenue Chart */}
          <RevenueChart
            data={chartQuery.data}
            isLoading={chartQuery.isLoading}
          />

          {/* Transactions Table Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Danh Sách Giao Dịch
                </h3>
                <p className="text-xs text-muted-foreground">
                  Theo dõi toàn bộ đơn hàng và trạng thái thanh toán qua cổng SePay
                </p>
              </div>
            </div>

            <TransactionTable
              data={transactionsQuery.data}
              isLoading={transactionsQuery.isLoading}
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sort={sort}
              onSortChange={setSort}
              page={page}
              onPageChange={setPage}
              limit={limit}
              onLimitChange={setLimit}
              onSelectTransaction={(code) => setSelectedOrderCode(code)}
            />
          </div>
        </div>
      )}

      {/* Tab 2 Content: Instructors Revenue */}
      {activeTab === 'instructors' && (
        <InstructorsRevenueTable
          timeFilter={instructorTimeFilter}
          onTimeFilterChange={setInstructorTimeFilter}
        />
      )}

      {/* Transaction Detail Drawer (Slide-over from right) */}
      <TransactionDetailDrawer
        orderCode={selectedOrderCode}
        isOpen={Boolean(selectedOrderCode)}
        onClose={() => setSelectedOrderCode(null)}
      />
    </div>
  );
}

