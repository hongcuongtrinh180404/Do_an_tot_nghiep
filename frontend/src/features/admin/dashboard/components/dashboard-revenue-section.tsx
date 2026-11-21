'use client';

import * as React from 'react';
import Chart from 'chart.js/auto';
import { Icon } from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import type {
  DashboardPeriodType,
  IDashboardCustomDates,
  IDashboardRevenueChartPoint,
  RevenueGroupBy,
  RevenueChartType,
} from '../types';
import { useAdminDashboardChartQuery } from '../api/admin-dashboard.api';
import { REVENUE_CHART_SERIES } from '../constants/mock-dashboard-data';

interface DashboardRevenueSectionProps {
  globalPeriod: DashboardPeriodType;
  initialChartData?: IDashboardRevenueChartPoint[];
  customDates?: IDashboardCustomDates;
}

export function DashboardRevenueSection({
  globalPeriod,
  initialChartData,
  customDates,
}: DashboardRevenueSectionProps): React.JSX.Element {
  const [groupBy, setGroupBy] = React.useState<RevenueGroupBy>('day');
  const [chartType, setChartType] = React.useState<RevenueChartType>('line');
  const [periodOverride, setPeriodOverride] = React.useState<string>('default');
  const [visibleSeries, setVisibleSeries] = React.useState<[boolean, boolean, boolean]>([
    true,
    true,
    true,
  ]);

  const { data: remoteChartData } = useAdminDashboardChartQuery(
    globalPeriod,
    groupBy === 'year' ? 'month' : groupBy,
    globalPeriod === 'custom' ? customDates : undefined,
  );

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = React.useRef<Chart | null>(null);

  const isFilterModified =
    groupBy !== 'day' ||
    chartType !== 'line' ||
    periodOverride !== 'default' ||
    !visibleSeries[0] ||
    !visibleSeries[1] ||
    !visibleSeries[2];

  const handleResetFilters = () => {
    setGroupBy('day');
    setChartType('line');
    setPeriodOverride('default');
    setVisibleSeries([true, true, true]);
    const chart = chartInstanceRef.current;
    if (chart) {
      chart.setDatasetVisibility(0, true);
      chart.setDatasetVisibility(1, true);
      chart.setDatasetVisibility(2, true);
      chart.update();
    }
  };

  const chartData: IDashboardRevenueChartPoint[] = React.useMemo(() => {
    if (groupBy === 'day' && periodOverride === 'default' && initialChartData?.length) {
      return initialChartData;
    }
    const base = REVENUE_CHART_SERIES[groupBy];
    const effectivePeriod = periodOverride === 'default' ? globalPeriod : periodOverride;

    const scaleMap: Record<string, number> = {
      today: 0.08,
      yesterday: 0.07,
      '7d': 0.38,
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

  const formatVndNumber = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
  };

  // Initialize or re-create chart when chartType changes
  React.useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const isBar = chartType === 'bar';
    const labels = chartData.map((d) => d.label);
    const gross = chartData.map((d) => d.grossRevenue);
    const platform = chartData.map((d) => d.platformRevenue);
    const instructor = chartData.map((d) => d.instructorRevenue);

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: chartType,
      data: {
        labels,
        datasets: [
          {
            label: 'Tổng doanh thu',
            data: gross,
            borderColor: '#4f46e5',
            backgroundColor: isBar ? 'rgba(79, 70, 229, 0.85)' : 'rgba(79, 70, 229, 0.08)',
            borderWidth: isBar ? 0 : 2.5,
            borderRadius: isBar ? 6 : 0,
            tension: 0.35,
            fill: !isBar,
            pointRadius: 3,
            pointHoverRadius: 5,
            hidden: !visibleSeries[0],
          },
          {
            label: 'Doanh thu nền tảng (Mindly)',
            data: platform,
            borderColor: '#10b981',
            backgroundColor: isBar ? 'rgba(16, 185, 129, 0.85)' : 'rgba(16, 185, 129, 0.08)',
            borderWidth: isBar ? 0 : 2.5,
            borderRadius: isBar ? 6 : 0,
            tension: 0.35,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 5,
            hidden: !visibleSeries[1],
          },
          {
            label: 'Doanh thu giảng viên',
            data: instructor,
            borderColor: '#f59e0b',
            backgroundColor: isBar ? 'rgba(245, 158, 11, 0.85)' : 'rgba(245, 158, 11, 0.08)',
            borderWidth: isBar ? 0 : 2.5,
            borderRadius: isBar ? 6 : 0,
            tension: 0.35,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 5,
            hidden: !visibleSeries[2],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#ffffff',
            bodyColor: '#f8fafc',
            borderColor: '#334155',
            borderWidth: 1,
            titleFont: { family: 'Inter', size: 12, weight: 'bold' },
            bodyFont: { family: 'Inter', size: 12 },
            padding: 12,
            cornerRadius: 12,
            callbacks: {
              label: (context) =>
                ` ${context.dataset.label}: ${formatVndNumber(Number(context.parsed.y || 0))}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.12)' },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#64748b',
              callback: (val) => {
                const num = typeof val === 'number' ? val : Number(val);
                if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + ' tỷ';
                if (num >= 1_000_000) return (num / 1_000_000).toFixed(0) + ' tr';
                return new Intl.NumberFormat('vi-VN').format(num);
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType]);

  // In-place smooth update when chartData changes (labels & data)
  React.useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;

    chart.data.labels = chartData.map((d) => d.label);
    if (chart.data.datasets[0]) {
      chart.data.datasets[0].data = chartData.map((d) => d.grossRevenue);
    }
    if (chart.data.datasets[1]) {
      chart.data.datasets[1].data = chartData.map((d) => d.platformRevenue);
    }
    if (chart.data.datasets[2]) {
      chart.data.datasets[2].data = chartData.map((d) => d.instructorRevenue);
    }

    chart.update('default');
  }, [chartData]);

  // Dynamic series visibility toggles
  const handleToggleSeries = (index: 0 | 1 | 2) => {
    setVisibleSeries((prev) => {
      const next: [boolean, boolean, boolean] = [...prev];
      next[index] = !next[index];

      const chart = chartInstanceRef.current;
      if (chart) {
        chart.setDatasetVisibility(index, next[index]);
        chart.update();
      }

      return next;
    });
  };

  const allSeriesHidden = !visibleSeries[0] && !visibleSeries[1] && !visibleSeries[2];

  return (
    <section
      id="revenue-section"
      className="bg-card rounded-2xl border border-border/60 shadow-xs p-5 space-y-4 h-full flex flex-col justify-between"
    >
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
          {/* Group By Switcher: Ngày / Tháng / Năm */}
          <div className="inline-flex bg-muted/60 p-0.5 rounded-xl border border-border/60">
            {(['day', 'month', 'year'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroupBy(g)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${groupBy === g
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground font-medium'
                  }`}
              >
                {g === 'day' ? 'Ngày' : g === 'month' ? 'Tháng' : 'Năm'}
              </button>
            ))}
          </div>

          {/* Chart Type Switcher: Line / Bar */}
          <div className="inline-flex bg-muted/60 p-0.5 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${chartType === 'line'
                ? 'bg-card text-foreground shadow-2xs font-bold'
                : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
              title="Biểu đồ đường"
            >
              <Icon icon="lucide:trending-up" className="size-3.5" />
              <span>Line</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${chartType === 'bar'
                ? 'bg-card text-foreground shadow-2xs font-bold'
                : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
              title="Biểu đồ cột"
            >
              <Icon icon="lucide:bar-chart-2" className="size-3.5" />
              <span>Bar</span>
            </button>
          </div>

          {/* Independent Period Filter */}
          <div className="w-52 shrink-0">
            <Select<string>
              value={periodOverride}
              onValueChange={(val) => {
                if (val) setPeriodOverride(val);
              }}
            >
              <SelectTrigger className="h-9 text-xs px-3 font-medium bg-background">
                <span className="truncate">
                  {periodOverride === 'today'
                    ? 'Hôm nay'
                    : periodOverride === '7d'
                      ? '7 ngày gần nhất'
                      : periodOverride === '30d'
                        ? '30 ngày gần nhất'
                        : periodOverride === 'this_month'
                          ? 'Tháng này'
                          : periodOverride === 'this_year'
                            ? 'Năm nay'
                            : 'Thời gian: Theo Dashboard'}
                </span>
              </SelectTrigger>
              <SelectContent align="start" className="min-w-52">
                <SelectItem value="default" className="text-xs">Thời gian: Theo Dashboard</SelectItem>
                <SelectItem value="today" className="text-xs">Hôm nay</SelectItem>
                <SelectItem value="7d" className="text-xs">7 ngày gần nhất</SelectItem>
                <SelectItem value="30d" className="text-xs">30 ngày gần nhất</SelectItem>
                <SelectItem value="this_month" className="text-xs">Tháng này</SelectItem>
                <SelectItem value="this_year" className="text-xs">Năm nay</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
            onClick={() => handleToggleSeries(0)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${visibleSeries[0]
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
              : 'bg-muted/40 text-muted-foreground border-border/60 opacity-60'
              }`}
          >
            <span className="size-2 rounded-full bg-indigo-600" />
            <span>Tổng doanh thu</span>
          </button>

          {/* Toggle Series 1: Platform Revenue */}
          <button
            type="button"
            onClick={() => handleToggleSeries(1)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${visibleSeries[1]
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-muted/40 text-muted-foreground border-border/60 opacity-60'
              }`}
          >
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>Doanh thu nền tảng (Mindly)</span>
          </button>

          {/* Toggle Series 2: Instructor Revenue */}
          <button
            type="button"
            onClick={() => handleToggleSeries(2)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${visibleSeries[2]
              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
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
            {formatVndNumber(totalGross)}
          </strong>
        </div>
      </div>

      {/* Chart Canvas Viewport */}
      <div className="relative h-72 sm:h-80 w-full">
        {allSeriesHidden && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-2xs rounded-xl z-10 pointer-events-none">
            <div className="px-4 py-2 rounded-xl bg-card border border-border/80 shadow-xs text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Icon icon="lucide:info" className="size-4 text-primary" />
              <span>Tất cả chuỗi dữ liệu đang bị ẩn. Nhấn vào các nút bên trên để hiển thị lại.</span>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} id="revenueChart" />
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
