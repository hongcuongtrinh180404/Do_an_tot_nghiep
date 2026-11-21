'use client';

import * as React from 'react';
import Chart from 'chart.js/auto';
import { Icon } from '@/components/ui/icon';
import type { IRevenueChartItem } from 'share-lib';
import { formatVnd } from '../utils/revenue-format.util';

export type RevenueChartMode = 'line' | 'bar';

export interface RevenueChartProps {
  data?: IRevenueChartItem[];
  isLoading?: boolean;
  className?: string;
  title?: string;
  description?: string;
}

export function RevenueChart({
  data = [],
  isLoading = false,
  className = '',
  title = 'Biểu Đồ Doanh Thu & Hoa Hồng',
  description = 'Phân tích chi tiết biến động doanh thu toàn sàn, tỷ trọng hoa hồng Mindly và thu nhập giảng viên',
}: RevenueChartProps): React.JSX.Element {
  const [chartType, setChartType] = React.useState<RevenueChartMode>('line');
  const [visibleSeries, setVisibleSeries] = React.useState<[boolean, boolean, boolean]>([
    true,
    true,
    true,
  ]);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = React.useRef<Chart | null>(null);

  const safeData = React.useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  const isFilterModified =
    chartType !== 'line' ||
    !visibleSeries[0] ||
    !visibleSeries[1] ||
    !visibleSeries[2];

  const handleResetFilters = () => {
    setChartType('line');
    setVisibleSeries([true, true, true]);
    const chart = chartInstanceRef.current;
    if (chart) {
      chart.setDatasetVisibility(0, true);
      chart.setDatasetVisibility(1, true);
      chart.setDatasetVisibility(2, true);
      chart.update();
    }
  };

  const totalGross = React.useMemo(() => {
    return safeData.reduce((acc, curr) => acc + (curr.totalRevenue || 0), 0);
  }, [safeData]);

  const totalOrders = React.useMemo(() => {
    return safeData.reduce((acc, curr) => acc + (curr.orderCount || 0), 0);
  }, [safeData]);

  const formatVndNumber = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
  };

  const hasData = safeData.length > 0;

  // Initialize or re-create chart whenever chartType or safeData changes
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Destroy any existing Chart instance registered with Chart.js on this canvas
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const isBar = chartType === 'bar';
    const labels = hasData
      ? safeData.map((d) => d.label || d.date)
      : ['Không có dữ liệu'];
    const gross = hasData ? safeData.map((d) => d.totalRevenue || 0) : [0];
    const platform = hasData ? safeData.map((d) => d.platformCommission || 0) : [0];
    const instructor = hasData ? safeData.map((d) => d.instructorEarnings || 0) : [0];

    const ctx = canvas.getContext('2d');
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
            pointRadius: hasData ? 3 : 0,
            pointHoverRadius: hasData ? 5 : 0,
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
            pointRadius: hasData ? 3 : 0,
            pointHoverRadius: hasData ? 5 : 0,
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
            pointRadius: hasData ? 3 : 0,
            pointHoverRadius: hasData ? 5 : 0,
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
            enabled: hasData,
            backgroundColor: '#0f172a',
            titleColor: '#ffffff',
            bodyColor: '#f8fafc',
            borderColor: '#334155',
            borderWidth: 1,
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 12,
            callbacks: {
              title: (items) => {
                if (!items.length) return '';
                const idx = items[0].dataIndex;
                const item = safeData[idx];
                const headerLabel = item?.label || items[0].label || '';
                if (item && typeof item.orderCount === 'number') {
                  return `${headerLabel} • ${item.orderCount} đơn hàng`;
                }
                return headerLabel;
              },
              label: (context) =>
                ` ${context.dataset.label}: ${formatVndNumber(Number(context.parsed.y || 0))}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#64748b' },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.12)' },
            ticks: {
              font: { size: 11 },
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
  }, [chartType, safeData]);

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
      id="revenue-chart-section"
      aria-label={title}
      className={`relative flex h-auto min-w-0 flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-xs sm:p-5 ${className}`}
    >
      {/* Loading Overlay keeps frame and dimensions perfectly stable */}
      {isLoading && (
        <div className="absolute inset-0 z-30 bg-card/75 backdrop-blur-2xs rounded-2xl flex flex-col items-center justify-center gap-2.5 animate-in fade-in duration-200">
          <Icon icon="lucide:loader-2" className="size-6 animate-spin text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Đang cập nhật số liệu biểu đồ...</span>
        </div>
      )}

      {/* Header & Independent Controls */}
      <div className="flex shrink-0 flex-col justify-between gap-3 border-b border-border/60 pb-3 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {description}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Chart Type Switcher: Line / Bar */}
          <div className="inline-flex bg-muted/60 p-0.5 rounded-xl border border-border/60" role="group" aria-label="Kiểu biểu đồ">
            <button
              type="button"
              aria-pressed={chartType === 'line'}
              onClick={() => setChartType('line')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden ${chartType === 'line'
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
              aria-pressed={chartType === 'bar'}
              onClick={() => setChartType('bar')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden ${chartType === 'bar'
                ? 'bg-card text-foreground shadow-2xs font-bold'
                : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
              title="Biểu đồ cột"
            >
              <Icon icon="lucide:bar-chart-2" className="size-3.5" />
              <span>Bar</span>
            </button>
          </div>

          {/* Reset Filters Button */}
          {isFilterModified && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
            >
              <Icon icon="lucide:rotate-ccw" className="size-3" />
              <span>Khôi phục mặc định</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Series Toggles & Inline Summary */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Bộ lọc chuỗi dữ liệu">
          {/* Toggle Series 0: Gross Revenue */}
          <button
            type="button"
            aria-pressed={visibleSeries[0]}
            onClick={() => handleToggleSeries(0)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden ${visibleSeries[0]
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
            aria-pressed={visibleSeries[1]}
            onClick={() => handleToggleSeries(1)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden ${visibleSeries[1]
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
            aria-pressed={visibleSeries[2]}
            onClick={() => handleToggleSeries(2)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden ${visibleSeries[2]
              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
              : 'bg-muted/40 text-muted-foreground border-border/60 opacity-60'
              }`}
          >
            <span className="size-2 rounded-full bg-amber-500" />
            <span>Doanh thu giảng viên</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
          {totalOrders > 0 && (
            <span>
              Tổng đơn:{' '}
              <strong className="text-foreground font-bold tabular-nums">
                {totalOrders.toLocaleString('vi-VN')}
              </strong>
            </span>
          )}
          <span>
            Tổng giá trị kỳ biểu đồ:{' '}
            <strong className="text-foreground font-bold tabular-nums">
              {formatVnd(totalGross)}
            </strong>
          </span>
        </div>
      </div>

      {/* Chart Canvas Viewport */}
      <div className="relative h-56 w-full min-w-0 shrink-0 sm:h-64">
        {/* Notice when all series are toggled off */}
        {allSeriesHidden && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-2xs rounded-xl z-10 pointer-events-none">
            <div className="px-4 py-2 rounded-xl bg-card border border-border/80 shadow-xs text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Icon icon="lucide:info" className="size-4 text-primary" />
              <span>Tất cả chuỗi dữ liệu đang bị ẩn. Nhấn vào các nút bên trên để hiển thị lại.</span>
            </div>
          </div>
        )}

        {/* Calm Honest Empty State Badge if no data points at all */}
        {!hasData && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="px-4 py-2 rounded-xl bg-card/90 border border-border/70 shadow-2xs text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Icon icon="lucide:bar-chart-2" className="size-4 text-muted-foreground/80" />
              <span>Chưa có dữ liệu giao dịch phát sinh trong khoảng thời gian này</span>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} id="revenueChartCanvas" className="block" />
      </div>

      {/* Historical Commission Rule Footnote */}
      <div className="flex shrink-0 items-start gap-2 rounded-xl bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        <Icon icon="lucide:shield-check" className="size-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
        <span>
          <strong>Nguyên tắc ghi nhận lịch sử hoa hồng:</strong> Số liệu doanh thu nền tảng và doanh thu giảng viên trong quá khứ được tính cố định theo tỷ lệ hoa hồng đã lưu tại thời điểm phát sinh từng giao dịch, đảm bảo không bị sai lệch khi Admin điều chỉnh tỷ lệ hoa hồng hiện tại.
        </span>
      </div>
    </section>
  );
}
