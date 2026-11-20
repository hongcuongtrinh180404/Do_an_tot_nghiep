'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import type {
  DashboardPeriodType,
  IDashboardRevenueChartPoint,
  RevenueGroupBy,
  RevenueChartType,
} from '../types';
import { formatVnd } from '../../revenue/utils/revenue-format.util';
import {
  REVENUE_CHART_SERIES,
} from '../constants/mock-dashboard-data';

interface DashboardRevenueSectionProps {
  globalPeriod: DashboardPeriodType;
  initialChartData?: IDashboardRevenueChartPoint[];
}

export function DashboardRevenueSection({
  globalPeriod,
  initialChartData,
}: DashboardRevenueSectionProps): React.JSX.Element {
  const [groupBy, setGroupBy] = React.useState<RevenueGroupBy>('day');
  const [chartType, setChartType] = React.useState<RevenueChartType>('line');
  const [periodOverride, setPeriodOverride] = React.useState<string>('default');
  const [visibleSeries, setVisibleSeries] = React.useState<[boolean, boolean, boolean]>([
    true,
    true,
    true,
  ]);
  const [hoveredPoint, setHoveredPoint] = React.useState<IDashboardRevenueChartPoint | null>(null);

  const isFilterModified =
    groupBy !== 'day' || chartType !== 'line' || periodOverride !== 'default';

  const handleResetFilters = () => {
    setGroupBy('day');
    setChartType('line');
    setPeriodOverride('default');
  };

  const chartData: IDashboardRevenueChartPoint[] = React.useMemo(() => {
    if (groupBy === 'day' && periodOverride === 'default' && initialChartData?.length) {
      return initialChartData;
    }
    const base = REVENUE_CHART_SERIES[groupBy];
    const effectivePeriod = periodOverride === 'default' ? globalPeriod : periodOverride;

    const scaleMap: Record<string, number> = {
      today: 0.1,
      yesterday: 0.08,
      '7d': 0.35,
      '30d': 1.15,
      this_month: 1.0,
      last_month: 1.25,
      this_year: 1.0,
      custom: 0.45,
    };
    const factor = groupBy === 'day' ? scaleMap[effectivePeriod] || 1 : 1;

    return base.map((item) => ({
      ...item,
      grossRevenue: Math.round(item.grossRevenue * factor),
      platformRevenue: Math.round(item.platformRevenue * factor),
      instructorRevenue: Math.round(item.instructorRevenue * factor),
      orderCount: Math.round(item.orderCount * factor),
    }));
  }, [groupBy, periodOverride, globalPeriod, initialChartData]);

  const totalGross = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.grossRevenue, 0);
  }, [chartData]);

  // Max value for scaling chart
  const maxValue = React.useMemo(() => {
    if (!chartData.length) return 1000000;
    const max = Math.max(...chartData.map((d) => d.grossRevenue), 0);
    return max > 0 ? max * 1.15 : 1000000;
  }, [chartData]);

  return (
    <section className="bg-card rounded-2xl border border-border/60 shadow-xs p-5 space-y-4">
      {/* Header & Independent Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            Phân tích doanh thu & phân chia hoa hồng
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Đơn vị tiền tệ: Việt Nam Đồng (VNĐ) — Tổng hợp từ giao dịch thanh toán thành công hợp lệ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Group By Switcher */}
          <div className="inline-flex bg-muted/60 p-0.5 rounded-xl border border-border/60">
            {(['day', 'month', 'year'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroupBy(g)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  groupBy === g
                    ? 'bg-card text-foreground shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
              >
                {g === 'day' ? 'Ngày' : g === 'month' ? 'Tháng' : 'Năm'}
              </button>
            ))}
          </div>

          {/* Chart Type Switcher */}
          <div className="inline-flex bg-muted/60 p-0.5 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                chartType === 'line'
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              }`}
            >
              <Icon icon="lucide:trending-up" className="size-3.5" />
              <span>Line</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              }`}
            >
              <Icon icon="lucide:bar-chart-2" className="size-3.5" />
              <span>Bar</span>
            </button>
          </div>

          {/* Independent Period Select */}
          <select
            value={periodOverride}
            onChange={(e) => setPeriodOverride(e.target.value)}
            className="text-xs px-3 py-1.5 bg-muted/40 border border-border/80 rounded-xl font-medium text-foreground outline-none cursor-pointer"
          >
            <option value="default">Thời gian: Theo Dashboard</option>
            <option value="today">Hôm nay</option>
            <option value="7d">7 ngày gần nhất</option>
            <option value="30d">30 ngày gần nhất</option>
            <option value="this_month">Tháng này</option>
            <option value="this_year">Năm nay</option>
          </select>

          {/* Reset Filters Button */}
          {isFilterModified && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition cursor-pointer"
            >
              <Icon icon="lucide:rotate-ccw" className="size-3" />
              <span>Khôi phục mặc định</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Series Toggles & Inline Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Series 0: Gross Revenue */}
          <button
            type="button"
            onClick={() =>
              setVisibleSeries(([s0, s1, s2]) => [!s0, s1, s2])
            }
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              visibleSeries[0]
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-muted/40 text-muted-foreground border-border/60 opacity-60'
            }`}
          >
            <span className="size-2 rounded-full bg-primary" />
            <span>Tổng doanh thu</span>
          </button>

          {/* Toggle Series 1: Platform Revenue */}
          <button
            type="button"
            onClick={() =>
              setVisibleSeries(([s0, s1, s2]) => [s0, !s1, s2])
            }
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              visibleSeries[1]
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-muted/40 text-muted-foreground border-border/60 opacity-60'
            }`}
          >
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>Doanh thu nền tảng</span>
          </button>

          {/* Toggle Series 2: Instructor Revenue */}
          <button
            type="button"
            onClick={() =>
              setVisibleSeries(([s0, s1, s2]) => [s0, s1, !s2])
            }
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              visibleSeries[2]
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                : 'bg-muted/40 text-muted-foreground border-border/60 opacity-60'
            }`}
          >
            <span className="size-2 rounded-full bg-amber-500" />
            <span>Doanh thu giảng viên</span>
          </button>
        </div>

        <div className="text-xs text-muted-foreground font-medium">
          Tổng giá trị kỳ biểu đồ:{' '}
          <strong className="text-foreground font-bold tabular-nums">
            {formatVnd(totalGross)}
          </strong>
        </div>
      </div>

      {/* SVG Interactive Chart Canvas */}
      <div className="relative">
        {/* Tooltip Card when hovering point */}
        <div className="min-h-10 mb-2 px-3 py-1.5 bg-muted/30 border border-border/60 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
          {hoveredPoint ? (
            <>
              <span className="font-bold text-foreground">
                Mốc: {hoveredPoint.label} ({hoveredPoint.orderCount} đơn)
              </span>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                {visibleSeries[0] && (
                  <span className="text-primary tabular-nums">
                    Tổng: {formatVnd(hoveredPoint.grossRevenue)}
                  </span>
                )}
                {visibleSeries[1] && (
                  <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                    Nền tảng: {formatVnd(hoveredPoint.platformRevenue)}
                  </span>
                )}
                {visibleSeries[2] && (
                  <span className="text-amber-600 dark:text-amber-400 tabular-nums">
                    Giảng viên: {formatVnd(hoveredPoint.instructorRevenue)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground italic text-[11px]">
              Rê chuột vào các cột hoặc điểm mốc để xem chi tiết doanh thu từng giai đoạn
            </span>
          )}
        </div>

        {/* Chart Viewport */}
        <div className="h-64 sm:h-72 w-full overflow-x-auto overflow-y-hidden">
          <div
            className="h-full flex items-end gap-2 pb-6 min-w-[340px]"
            style={{ width: `${Math.max(100, chartData.length * 48)}px` }}
          >
            {chartData.map((item) => {
              const grossHeightPct = Math.min(
                100,
                Math.max(item.grossRevenue > 0 ? 6 : 2, (item.grossRevenue / maxValue) * 100),
              );
              const platformHeightPct = Math.min(
                100,
                Math.max(item.platformRevenue > 0 ? 4 : 1, (item.platformRevenue / maxValue) * 100),
              );
              const instructorHeightPct = Math.min(
                100,
                Math.max(item.instructorRevenue > 0 ? 4 : 1, (item.instructorRevenue / maxValue) * 100),
              );

              const isHovered = hoveredPoint?.date === item.date;

              return (
                <div
                  key={item.date}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(item)}
                  onClick={() => setHoveredPoint(item)}
                >
                  {/* Bars/Columns Column */}
                  <div className="w-full flex justify-center items-end h-48 relative">
                    {chartType === 'bar' ? (
                      <div className="w-full flex items-end justify-center gap-0.5 h-full">
                        {visibleSeries[0] && (
                          <div
                            className={`w-3.5 rounded-t-sm transition-all duration-150 ${
                              isHovered
                                ? 'bg-primary ring-2 ring-primary/40'
                                : 'bg-primary/80 hover:bg-primary'
                            }`}
                            style={{ height: `${grossHeightPct}%` }}
                          />
                        )}
                        {visibleSeries[1] && (
                          <div
                            className="w-2.5 rounded-t-sm bg-emerald-500/80 hover:bg-emerald-500 transition-all duration-150"
                            style={{ height: `${platformHeightPct}%` }}
                          />
                        )}
                        {visibleSeries[2] && (
                          <div
                            className="w-2.5 rounded-t-sm bg-amber-500/80 hover:bg-amber-500 transition-all duration-150"
                            style={{ height: `${instructorHeightPct}%` }}
                          />
                        )}
                      </div>
                    ) : (
                      /* Line Mode Column representation */
                      <div className="w-full flex flex-col justify-end items-center h-full relative">
                        {/* Background subtle column */}
                        <div
                          className={`w-full max-w-[28px] rounded-t-md transition-all duration-150 flex flex-col justify-end ${
                            isHovered ? 'bg-primary/20 ring-1 ring-primary/40' : 'bg-muted/30 hover:bg-muted/60'
                          }`}
                          style={{ height: `${grossHeightPct}%` }}
                        >
                          {/* Marker Dot on top */}
                          <div className="size-2 rounded-full bg-primary mx-auto -mt-1 ring-2 ring-background" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* X-axis label */}
                  <div className="text-[10px] font-semibold text-muted-foreground text-center mt-2 truncate w-full select-none">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Historical Commission Rule Footnote */}
      <div className="pt-3 border-t border-border/60 flex items-start sm:items-center gap-2 text-[11px] text-muted-foreground bg-muted/30 px-3.5 py-2.5 rounded-xl">
        <Icon icon="lucide:shield-check" className="size-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
        <span>
          <strong>Nguyên tắc ghi nhận lịch sử hoa hồng:</strong> Số liệu doanh thu nền tảng và doanh thu giảng viên trong quá khứ được tính cố định theo tỷ lệ hoa hồng đã lưu tại thời điểm phát sinh từng giao dịch, đảm bảo không bị sai lệch khi Admin điều chỉnh tỷ lệ hoa hồng hiện tại.
        </span>
      </div>
    </section>
  );
}
