'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { type InstructorStats } from '../constants/mock-instructor-data';

interface InstructorStatsOverviewProps {
  stats: InstructorStats;
}

export function InstructorStatsOverview({ stats }: InstructorStatsOverviewProps): React.JSX.Element {
  // Format tiền tệ VNĐ
  const formattedRevenue = React.useMemo(() => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(stats.totalRevenue);
  }, [stats.totalRevenue]);

  const formattedNetRevenue = React.useMemo(() => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(stats.netRevenue);
  }, [stats.netRevenue]);

  const formattedStudents = React.useMemo(() => {
    return new Intl.NumberFormat('vi-VN').format(stats.totalStudents);
  }, [stats.totalStudents]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Thẻ 1: Tổng số khóa học */}
      <div className="rounded-xl border border-border/70 bg-card p-4.5 shadow-xs hover:border-sky-500/40 transition-all flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Tổng số khóa học</span>
          <div className="size-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center ring-1 ring-sky-500/20">
            <Icon icon="lucide:book-open" className="size-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {stats.totalCourses} <span className="text-sm font-normal text-muted-foreground">khóa</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            Đánh giá mức độ đóng góp nội dung của giảng viên cho sàn.
          </p>
        </div>
      </div>

      {/* Thẻ 2: Tổng học viên */}
      <div className="rounded-xl border border-border/70 bg-card p-4.5 shadow-xs hover:border-teal-500/40 transition-all flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Tổng học viên</span>
          <div className="size-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center ring-1 ring-teal-500/20">
            <Icon icon="lucide:users" className="size-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {formattedStudents} <span className="text-sm font-normal text-muted-foreground">học viên</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            Đo lường mức độ ảnh hưởng và quy mô học sinh đang theo học.
          </p>
        </div>
      </div>

      {/* Thẻ 3: Tổng doanh thu tạo ra */}
      <div className="rounded-xl border border-border/70 bg-card p-4.5 shadow-xs hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Tổng doanh thu tạo ra</span>
          <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20">
            <Icon icon="lucide:coins" className="size-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {formattedRevenue}
          </div>
          <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <span>Hoa hồng thực nhận: {formattedNetRevenue}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
            Tổng giá trị giao dịch mà giảng viên đã đem về cho nền tảng.
          </p>
        </div>
      </div>

      {/* Thẻ 4: Đánh giá trung bình */}
      <div className="rounded-xl border border-border/70 bg-card p-4.5 shadow-xs hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Đánh giá trung bình</span>
          <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center ring-1 ring-amber-500/20">
            <Icon icon="lucide:star" className="size-4" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-2xl font-bold tracking-tight text-foreground">
            <span>{stats.averageRating.toFixed(1)}</span>
            <span className="text-sm font-normal text-muted-foreground">/ 5.0</span>
            <Icon icon="lucide:star" className="size-4 text-amber-500 fill-amber-500 inline" />
          </div>
          <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1">
            từ {stats.totalReviews} lượt đánh giá
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            Đo lường uy tín và chất lượng chuyên môn.
          </p>
        </div>
      </div>
    </div>
  );
}
