'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import type { DashboardPeriodType, IDashboardInstructor } from '../types';
import {
  INSTRUCTORS_DATA,
  formatVnd,
  formatNumber,
} from '../constants/mock-dashboard-data';

interface DashboardInstructorsSectionProps {
  globalPeriod: DashboardPeriodType;
  onSelectInstructor: (inst: IDashboardInstructor) => void;
}

export function DashboardInstructorsSection({
  globalPeriod,
  onSelectInstructor,
}: DashboardInstructorsSectionProps): React.JSX.Element {
  const [periodOverride, setPeriodOverride] = React.useState<string>('default');
  const [sortKey, setSortKey] = React.useState<'grossRevenue' | 'salesCount' | 'netRevenue'>('grossRevenue');
  const [limit, setLimit] = React.useState<number>(5);

  const isModified = periodOverride !== 'default' || sortKey !== 'grossRevenue' || limit !== 5;

  const handleReset = () => {
    setPeriodOverride('default');
    setSortKey('grossRevenue');
    setLimit(5);
  };

  const effectivePeriod = periodOverride === 'default' ? globalPeriod : periodOverride;

  const scaledInstructors = React.useMemo(() => {
    const scaleMap: Record<string, number> = {
      today: 0.05,
      yesterday: 0.045,
      '7d': 0.28,
      '30d': 1.18,
      this_month: 1.0,
      last_month: 1.26,
      this_year: 9.8,
      custom: 0.35,
    };
    const factor = scaleMap[effectivePeriod] || 1;

    return INSTRUCTORS_DATA.map((inst) => {
      const salesCount = Math.max(1, Math.round(inst.salesCount * factor));
      const grossRevenue = Math.round(inst.grossRevenue * factor);
      const netRevenue = Math.round(grossRevenue * (inst.commissionRate / 100));
      return {
        ...inst,
        salesCount,
        grossRevenue,
        netRevenue,
      };
    }).sort((a, b) => b[sortKey] - a[sortKey]);
  }, [effectivePeriod, sortKey]);

  const displayedInstructors = scaledInstructors.slice(0, limit);

  return (
    <section className="bg-card rounded-2xl border border-border/60 shadow-xs overflow-hidden">
      {/* Header and Filters */}
      <div className="p-5 border-b border-border/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            Bảng xếp hạng Giảng viên tiêu biểu
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Nhấn vào từng giảng viên để mở hồ sơ chi tiết khóa học đang giảng dạy, doanh thu từng khóa và đánh giá trung bình
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter */}
          <select
            value={periodOverride}
            onChange={(e) => setPeriodOverride(e.target.value)}
            className="text-xs px-3 py-1.5 bg-muted/40 border border-border/80 rounded-xl font-medium text-foreground outline-none cursor-pointer"
          >
            <option value="default">Thời gian: Theo bộ lọc chung</option>
            <option value="today">Hôm nay</option>
            <option value="7d">7 ngày gần nhất</option>
            <option value="this_month">Tháng này</option>
            <option value="this_year">Năm nay</option>
          </select>

          {/* Sort Key Select */}
          <select
            value={sortKey}
            onChange={(e) =>
              setSortKey(e.target.value as 'grossRevenue' | 'salesCount' | 'netRevenue')
            }
            className="text-xs px-3 py-1.5 bg-muted/40 border border-border/80 rounded-xl font-medium text-foreground outline-none cursor-pointer"
          >
            <option value="grossRevenue">Xếp hạng: Tổng doanh thu</option>
            <option value="salesCount">Xếp hạng: Lượt bán thành công</option>
            <option value="netRevenue">Xếp hạng: Doanh thu thực nhận</option>
          </select>

          {/* Limit Select */}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="text-xs px-3 py-1.5 bg-muted/40 border border-border/80 rounded-xl font-medium text-foreground outline-none cursor-pointer"
          >
            <option value="5">Hiển thị: Top 5</option>
            <option value="10">Hiển thị: Top 10</option>
          </select>

          {/* Reset */}
          {isModified && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition cursor-pointer"
            >
              <Icon icon="lucide:rotate-ccw" className="size-3" />
              <span>Khôi phục mặc định</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/30 border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="py-3 px-5 w-20 text-center">Thứ hạng</th>
              <th className="py-3 px-4">Giảng viên</th>
              <th className="py-3 px-4 text-center">Số khóa học công khai</th>
              <th className="py-3 px-4 text-right">Số lượt bán thành công</th>
              <th className="py-3 px-4 text-right">Tổng doanh thu (VNĐ)</th>
              <th className="py-3 px-5 text-right">Doanh thu thực nhận (VNĐ)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-xs">
            {displayedInstructors.map((inst, idx) => {
              const rank = idx + 1;
              let rankBadge = (
                <span className="inline-flex items-center justify-center size-6 rounded-full bg-muted text-muted-foreground font-bold text-[11px]">
                  {rank}
                </span>
              );
              if (rank === 1) {
                rankBadge = (
                  <span className="inline-flex items-center justify-center size-7 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-extrabold text-xs shadow-2xs">
                    1
                  </span>
                );
              } else if (rank === 2) {
                rankBadge = (
                  <span className="inline-flex items-center justify-center size-7 rounded-full bg-slate-300/30 text-slate-800 dark:text-slate-200 border border-slate-400/40 font-extrabold text-xs">
                    2
                  </span>
                );
              } else if (rank === 3) {
                rankBadge = (
                  <span className="inline-flex items-center justify-center size-7 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/40 font-extrabold text-xs">
                    3
                  </span>
                );
              }

              return (
                <tr
                  key={inst.id}
                  onClick={() => onSelectInstructor(inst)}
                  className="hover:bg-muted/40 cursor-pointer transition group"
                >
                  <td className="py-3.5 px-5 text-center">{rankBadge}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-9 rounded-xl ${inst.avatarBg} font-bold text-xs flex items-center justify-center shrink-0 border border-border/60`}
                      >
                        {inst.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground group-hover:text-primary transition truncate">
                          {inst.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {inst.specialty}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border/40">
                      {inst.coursesCount} khóa
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-foreground tabular-nums">
                    {formatNumber(inst.salesCount)} lượt
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-foreground tabular-nums">
                    {formatVnd(inst.grossRevenue)}
                  </td>
                  <td className="py-3.5 px-5 text-right tabular-nums">
                    <span className="font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                      {formatVnd(inst.netRevenue)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
