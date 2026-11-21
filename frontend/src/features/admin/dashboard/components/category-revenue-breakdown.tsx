import React, { useMemo } from 'react';
import type { CategoryRevenueItem } from '../types';

export interface CategoryRevenueBreakdownProps {
  /** Dữ liệu doanh thu toàn bộ danh mục đã được lọc theo khoảng thời gian của Trung tâm điều hành */
  categories: CategoryRevenueItem[];
  /** Nhãn khoảng thời gian đang chọn ở Trung tâm điều hành (VD: "Tháng này", "7 ngày qua") */
  timeframeLabel: string;
  isLoading?: boolean;
}

const SLICE_COLORS = [
  '#4f46e5', // Top 1 - Indigo
  '#0ea5e9', // Top 2 - Sky
  '#10b981', // Top 3 - Emerald
  '#f59e0b', // Top 4 - Amber
  '#ec4899', // Top 5 - Pink
  '#94a3b8', // Khác - Slate
];

const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCompactVND = (amount: number): string => {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} Tỷ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} Tr`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)} K`;
  return `${amount} đ`;
};

export const CategoryRevenueBreakdown: React.FC<CategoryRevenueBreakdownProps> = ({
  categories,
  timeframeLabel,
  isLoading = false,
}) => {
  const { items, totalRevenue } = useMemo(() => {
    const validCategories = [...categories]
      .filter((c) => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);

    const total = validCategories.reduce((sum, item) => sum + item.revenue, 0);

    if (total === 0) {
      return { items: [], totalRevenue: 0 };
    }

    // Lấy 5 danh mục có doanh thu cao nhất
    const top5 = validCategories.slice(0, 5);
    // Gom tất cả danh mục còn lại vào "Khác"
    const remaining = validCategories.slice(5);
    const otherRevenue = remaining.reduce((sum, item) => sum + item.revenue, 0);

    const combined = [...top5];
    if (otherRevenue > 0) {
      combined.push({
        id: 'other-categories',
        name: `Khác (${remaining.length} danh mục)`,
        revenue: otherRevenue,
      });
    }

    const withPercentage = combined.map((item, index) => ({
      ...item,
      percentage: Number(((item.revenue / total) * 100).toFixed(1)),
      color: SLICE_COLORS[index] || SLICE_COLORS[SLICE_COLORS.length - 1],
    }));

    return { items: withPercentage, totalRevenue: total };
  }, [categories]);

  // Tính toán thông số vẽ Donut SVG
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-xs animate-pulse h-full flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-muted rounded" />
          <div className="h-3 w-32 bg-muted/60 rounded" />
        </div>
        <div className="w-40 h-40 rounded-full border-[14px] border-muted/40 mx-auto my-6" />
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-4 bg-muted/50 rounded w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-xs h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            Cơ cấu Doanh thu theo Danh mục
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Top 5 danh mục cao nhất • Kỳ: <span className="font-semibold text-foreground/90">{timeframeLabel}</span>
          </p>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
          Tỷ trọng (%)
        </span>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">Chưa có dữ liệu doanh thu</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">Không phát sinh giao dịch trong kỳ đã chọn.</p>
        </div>
      ) : (
        <>
          {/* Donut Chart */}
          <div className="relative w-44 h-44 mx-auto my-2 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {items.map((item) => {
                const fraction = item.revenue / totalRevenue;
                const strokeDasharray = `${fraction * circumference} ${circumference}`;
                const strokeDashoffset = -(cumulativePercent * circumference);
                cumulativePercent += fraction;

                return (
                  <circle
                    key={item.id}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth="13"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 hover:opacity-85"
                  >
                    <title>{`${item.name}: ${formatVND(item.revenue)} (${item.percentage}%)`}</title>
                  </circle>
                );
              })}
            </svg>

            {/* Tổng doanh thu ở tâm Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Tổng kỳ
              </span>
              <span className="text-sm font-black text-foreground mt-0.5">
                {formatCompactVND(totalRevenue)}
              </span>
            </div>
          </div>

          {/* Danh sách chú giải Top 5 + Khác */}
          <div className="mt-4 space-y-2.5 divide-y divide-border/60">
            {items.map((item) => (
              <div
                key={item.id}
                className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-foreground/90 truncate" title={item.name}>
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {formatCompactVND(item.revenue)}
                  </span>
                  <span className="w-12 text-right font-bold text-foreground bg-muted/60 px-1.5 py-0.5 rounded-md text-[11px]">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
