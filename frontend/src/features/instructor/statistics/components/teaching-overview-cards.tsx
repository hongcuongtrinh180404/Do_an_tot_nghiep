'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import type { ITeachingStatsOverview } from 'share-lib';
import { formatVnd } from '@/features/admin/revenue/utils/revenue-format.util';

interface TeachingOverviewCardsProps {
  overview?: ITeachingStatsOverview | null;
  isLoading?: boolean;
}

export function TeachingOverviewCards({
  overview,
  isLoading = false,
}: TeachingOverviewCardsProps): React.JSX.Element {
  const totalRevenue = overview?.totalRevenue ?? 0;
  const instructorEarnings = overview?.instructorEarnings ?? 0;
  const successfulSales = overview?.successfulSales ?? 0;
  const averageRating = overview?.averageRating ?? 0;
  const totalReviews = overview?.totalReviews ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Tổng doanh thu */}
      <div className="bg-card rounded-xl border border-border/70 p-5 shadow-2xs hover:border-border transition-colors">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Tổng doanh thu
          </span>
          <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0">
            <Icon icon="lucide:coins" className="size-4" />
          </div>
        </div>
        <div>
          {isLoading ? (
            <div className="h-8 w-32 bg-muted/60 animate-pulse rounded-md" />
          ) : (
            <p className="text-2xl sm:text-[26px] font-extrabold text-foreground tracking-tight tabular-nums">
              {formatVnd(totalRevenue)}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <Icon icon="lucide:info" className="size-3 text-muted-foreground/80 shrink-0" />
            <span>Doanh thu trước hoa hồng nền tảng</span>
          </p>
        </div>
      </div>

      {/* Card 2: Thu nhập sau hoa hồng */}
      <div className="bg-card rounded-xl border border-border/70 p-5 shadow-2xs hover:border-border transition-colors">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Thu nhập sau hoa hồng
          </span>
          <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Icon icon="lucide:wallet" className="size-4" />
          </div>
        </div>
        <div>
          {isLoading ? (
            <div className="h-8 w-32 bg-muted/60 animate-pulse rounded-md" />
          ) : (
            <p className="text-2xl sm:text-[26px] font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
              {formatVnd(instructorEarnings)}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <Icon icon="lucide:check-circle-2" className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Ghi nhận theo tỷ lệ từng giao dịch</span>
          </p>
        </div>
      </div>

      {/* Card 3: Lượt mua khóa học */}
      <div className="bg-card rounded-xl border border-border/70 p-5 shadow-2xs hover:border-border transition-colors">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Lượt mua khóa học
          </span>
          <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Icon icon="lucide:shopping-bag" className="size-4" />
          </div>
        </div>
        <div>
          {isLoading ? (
            <div className="h-8 w-24 bg-muted/60 animate-pulse rounded-md" />
          ) : (
            <p className="text-2xl sm:text-[26px] font-extrabold text-foreground tracking-tight tabular-nums">
              {successfulSales.toLocaleString('vi-VN')} <span className="text-sm font-semibold text-muted-foreground">lượt</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <Icon icon="lucide:badge-check" className="size-3 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Đơn hàng thanh toán thành công</span>
          </p>
        </div>
      </div>

      {/* Card 4: Đánh giá trung bình */}
      <div className="bg-card rounded-xl border border-border/70 p-5 shadow-2xs hover:border-border transition-colors">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Đánh giá trung bình
          </span>
          <div className="size-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Icon icon="lucide:star" className="size-4 fill-amber-500 text-amber-500" />
          </div>
        </div>
        <div>
          {isLoading ? (
            <div className="h-8 w-28 bg-muted/60 animate-pulse rounded-md" />
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-[26px] font-extrabold text-foreground tracking-tight tabular-nums">
                {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">/ 5.0</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <Icon icon="lucide:message-square" className="size-3 text-amber-500 shrink-0" />
            <span>
              {totalReviews > 0 ? `Dựa trên ${totalReviews.toLocaleString('vi-VN')} đánh giá hợp lệ` : 'Chưa có đánh giá hợp lệ'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

