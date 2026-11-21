'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { formatNumber } from '../constants/mock-dashboard-data';

interface DashboardPendingSectionProps {
  pendingTasks?: {
    cur: number;
    courses: number;
    instructors: number;
    reviews: number;
  };
  isLoading?: boolean;
}

export function DashboardPendingSection({
  pendingTasks = { cur: 16, courses: 5, instructors: 3, reviews: 8 },
  isLoading = false,
}: DashboardPendingSectionProps): React.JSX.Element {
  if (isLoading) {
    return (
      <section className="w-full space-y-3.5">
        <div className="h-5 w-56 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-card p-5 rounded-2xl border border-border/60 space-y-3 animate-pulse"
            >
              <div className="h-4 w-36 bg-muted rounded" />
              <div className="h-7 w-20 bg-muted/80 rounded" />
              <div className="h-3.5 w-48 bg-muted/50 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const items = [
    {
      id: 'pending-courses',
      title: 'Khóa học cần phê duyệt',
      count: pendingTasks.courses,
      unit: 'khóa học',
      description: 'Số lượng khóa học đang ở trạng thái chờ duyệt',
      statusBadge: 'Chờ kiểm duyệt',
      icon: 'lucide:book-open',
      bgColor: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'pending-instructors',
      title: 'Phê duyệt giảng viên',
      count: pendingTasks.instructors,
      unit: 'hồ sơ',
      description: 'Số lượng hồ sơ đăng ký giảng viên đang chờ duyệt',
      statusBadge: 'Chờ xác thực',
      icon: 'lucide:user-check',
      bgColor: 'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400',
    },
    {
      id: 'pending-reviews',
      title: 'Báo cáo đánh giá',
      count: pendingTasks.reviews,
      unit: 'báo cáo',
      description: 'Số lượng đánh giá bị báo cáo vi phạm chưa xử lý',
      statusBadge: 'Cần kiểm tra',
      icon: 'lucide:flag',
      bgColor: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <section className="w-full space-y-3.5 select-none cursor-default">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-rose-500 shrink-0" />
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            Trung tâm Công việc Chờ Xử Lý
          </h2>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/60">
          Chỉ xem • Tự động tổng hợp
        </span>
      </div>

      {/* 3 Static Informational Cards (Strict Read-Only) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-card p-5 rounded-2xl border border-border/60 shadow-xs flex flex-col justify-between"
          >
            {/* Card Header & Static Badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground block">
                  {item.title}
                </span>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight tabular-nums">
                    {formatNumber(item.count)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.unit}
                  </span>
                </div>
              </div>

              <div
                className={`size-9 rounded-xl border flex items-center justify-center shrink-0 ${item.bgColor}`}
              >
                <Icon icon={item.icon} className="size-4" />
              </div>
            </div>

            {/* Description & Status */}
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
              <span className="text-[11px] text-muted-foreground line-clamp-1">
                {item.description}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${item.bgColor}`}
              >
                {item.statusBadge}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
