'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import type { IDashboardKpiData } from '../types';
import { formatVnd } from '../../revenue/utils/revenue-format.util';
import {
  formatNumber,
  calculateGrowth,
} from '../constants/mock-dashboard-data';

interface DashboardKpiCardsProps {
  kpis: IDashboardKpiData;
  onOpenPendingDrawer: () => void;
  isLoading?: boolean;
}

export function DashboardKpiCards({
  kpis,
  onOpenPendingDrawer,
  isLoading = false,
}: DashboardKpiCardsProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-card p-5 rounded-2xl border border-border/60 space-y-3 animate-pulse"
          >
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-8 w-44 rounded bg-muted/80" />
            <div className="h-3.5 w-36 rounded bg-muted/50" />
          </div>
        ))}
      </div>
    );
  }

  const grossGrowth = calculateGrowth(kpis.grossRevenue.cur, kpis.grossRevenue.prev, true);
  const platformGrowth = calculateGrowth(kpis.platformRevenue.cur, kpis.platformRevenue.prev, true);
  const instructorGrowth = calculateGrowth(kpis.instructorRevenue.cur, kpis.instructorRevenue.prev, true);
  const studentsGrowth = calculateGrowth(kpis.newStudents.cur, kpis.newStudents.prev, false);
  const enrollmentsGrowth = calculateGrowth(kpis.enrollments.cur, kpis.enrollments.prev, false);

  const cards = [
    {
      id: 'gross',
      title: 'Tổng doanh thu khóa học',
      value: formatVnd(kpis.grossRevenue.cur),
      icon: 'lucide:wallet',
      growth: grossGrowth,
    },
    {
      id: 'platform',
      title: 'Doanh thu nền tảng (Mindly)',
      value: formatVnd(kpis.platformRevenue.cur),
      icon: 'lucide:landmark',
      growth: platformGrowth,
    },
    {
      id: 'instructor',
      title: 'Doanh thu giảng viên',
      value: formatVnd(kpis.instructorRevenue.cur),
      icon: 'lucide:hand-coins',
      growth: instructorGrowth,
    },
    {
      id: 'students',
      title: 'Học viên mới',
      value: `${formatNumber(kpis.newStudents.cur)} học viên`,
      icon: 'lucide:user-plus',
      growth: studentsGrowth,
    },
    {
      id: 'enrollments',
      title: 'Lượt đăng ký khóa học',
      value: `${formatNumber(kpis.enrollments.cur)} lượt`,
      icon: 'lucide:graduation-cap',
      extraTag: `${formatNumber(kpis.enrollments.paid)} trả phí • ${formatNumber(kpis.enrollments.free)} miễn phí`,
      growth: enrollmentsGrowth,
    },
    {
      id: 'pending',
      title: 'Công việc chờ xử lý',
      value: `${formatNumber(kpis.pendingTasks.cur)} yêu cầu`,
      icon: 'lucide:bell-ring',
      isActionable: true,
      extraTag: `${kpis.pendingTasks.courses} khóa học • ${kpis.pendingTasks.instructors} giảng viên • ${kpis.pendingTasks.reviews} đánh giá`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => {
        if (card.isActionable) {
          return (
            <div
              key={card.id}
              onClick={onOpenPendingDrawer}
              className="group bg-card p-5 rounded-2xl border border-rose-500/30 hover:border-rose-500/60 shadow-xs transition-all flex flex-col justify-between cursor-pointer ring-1 ring-rose-500/10 hover:ring-rose-500/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-muted-foreground truncate block">
                    {card.title}
                  </span>
                  <p className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-1 tabular-nums">
                    {card.value}
                  </p>
                  <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-1">
                    {card.extraTag}
                  </p>
                </div>
                <div className="size-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <Icon icon={card.icon} className="size-4" />
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  Cần Admin phê duyệt & xử lý
                </span>
                <span className="text-[11px] font-bold text-primary group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                  Mở danh sách →
                </span>
              </div>
            </div>
          );
        }

        const g = card.growth!;
        return (
          <div
            key={card.id}
            className="group bg-card p-5 rounded-2xl border border-border/60 hover:border-border shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-muted-foreground truncate block">
                  {card.title}
                </span>
                <p className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-1 tabular-nums">
                  {card.value}
                </p>
                {card.extraTag && (
                  <p className="text-[11px] font-medium text-muted-foreground mt-1">
                    {card.extraTag}
                  </p>
                )}
              </div>
              <div className="size-9 rounded-xl bg-muted/60 text-muted-foreground border border-border/60 flex items-center justify-center shrink-0">
                <Icon icon={card.icon} className="size-4" />
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-border/60">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {g.isNeutral ? (
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Kỳ trước: 0
                  </span>
                ) : g.isUp ? (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                    <Icon icon="lucide:arrow-up-right" className="size-3" />
                    {g.formattedPercent}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full">
                    <Icon icon="lucide:arrow-down-right" className="size-3" />
                    {g.formattedPercent}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">
                  Kỳ trước: {g.formattedPrevious}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
