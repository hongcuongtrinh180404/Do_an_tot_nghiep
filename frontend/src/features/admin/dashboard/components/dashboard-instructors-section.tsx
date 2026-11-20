'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import type { DashboardPeriodType } from '../types';
import { formatVnd } from '../../revenue/utils/revenue-format.util';
import {
  INSTRUCTORS_DATA,
  formatNumber,
} from '../constants/mock-dashboard-data';

interface DashboardInstructorsSectionProps {
  globalPeriod: DashboardPeriodType;
}

export function DashboardInstructorsSection({
  globalPeriod,
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
      {/* Header and 2-Row Filter Bar matching the exact design */}
      <div className="p-5 sm:p-6 border-b border-border/60 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            Bảng xếp hạng Giảng viên tiêu biểu
          </h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Thống kê hiệu suất kinh doanh và doanh thu của các giảng viên hàng đầu theo chu kỳ thời gian
          </p>
        </div>

        {/* 2-Row Filter Controls matching sample image */}
        <div className="flex flex-col items-start lg:items-end gap-2.5 shrink-0 w-full lg:w-auto">
          {/* Row 1: Period + Sort Criteria */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Dropdown 1: Thời gian */}
            <div className="relative inline-flex items-center bg-card border border-border/80 hover:border-border rounded-xl px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs transition">
              <select
                value={periodOverride}
                onChange={(e) => setPeriodOverride(e.target.value)}
                className="bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer pr-5 appearance-none"
              >
                <option value="default">Thời gian: Theo bộ lọc chung</option>
                <option value="today">Hôm nay</option>
                <option value="7d">7 ngày gần nhất</option>
                <option value="this_month">Tháng này</option>
                <option value="this_year">Năm nay</option>
              </select>
              <Icon
                icon="lucide:chevron-down"
                className="size-3.5 text-muted-foreground absolute right-2.5 pointer-events-none"
              />
            </div>

            {/* Dropdown 2: Xếp hạng */}
            <div className="relative inline-flex items-center bg-card border border-border/80 hover:border-border rounded-xl px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs transition">
              <select
                value={sortKey}
                onChange={(e) =>
                  setSortKey(e.target.value as 'grossRevenue' | 'salesCount' | 'netRevenue')
                }
                className="bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer pr-5 appearance-none"
              >
                <option value="grossRevenue">Xếp hạng: Tổng doanh thu</option>
                <option value="salesCount">Xếp hạng: Lượt bán thành công</option>
                <option value="netRevenue">Xếp hạng: Doanh thu thực nhận</option>
              </select>
              <Icon
                icon="lucide:chevron-down"
                className="size-3.5 text-muted-foreground absolute right-2.5 pointer-events-none"
              />
            </div>
          </div>

          {/* Row 2: Limit Filter (Right aligned) + Reset Button */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            {isModified && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition cursor-pointer"
              >
                <Icon icon="lucide:rotate-ccw" className="size-3" />
                <span>Khôi phục</span>
              </button>
            )}

            {/* Dropdown 3: Hiển thị */}
            <div className="relative inline-flex items-center bg-card border border-border/80 hover:border-border rounded-xl px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs transition">
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer pr-5 appearance-none"
              >
                <option value="5">Hiển thị: Top 5</option>
                <option value="10">Hiển thị: Top 10</option>
              </select>
              <Icon
                icon="lucide:chevron-down"
                className="size-3.5 text-muted-foreground absolute right-2.5 pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table Section with exact columns and styling */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 bg-muted/10">
              <th className="py-3.5 px-6 w-20 text-center">THỨ HẠNG</th>
              <th className="py-3.5 px-4">GIẢNG VIÊN</th>
              <th className="py-3.5 px-4 text-center">SỐ KHÓA HỌC CÔNG KHAI</th>
              <th className="py-3.5 px-4 text-right">SỐ LƯỢT BÁN THÀNH CÔNG</th>
              <th className="py-3.5 px-4 text-right">TỔNG DOANH THU KHÓA HỌC (VNĐ)</th>
              <th className="py-3.5 px-6 text-right">DOANH THU GIẢNG VIÊN THỰC NHẬN (VNĐ)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-xs">
            {displayedInstructors.map((inst, idx) => {
              const rank = idx + 1;
              let rankBadge = (
                <span className="inline-flex items-center justify-center size-7 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 font-medium text-xs">
                  {rank}
                </span>
              );

              if (rank === 1) {
                rankBadge = (
                  <span className="inline-flex items-center justify-center size-7 rounded-full bg-amber-100/70 border border-amber-300 text-amber-700 dark:text-amber-400 font-extrabold text-xs shadow-2xs">
                    1
                  </span>
                );
              } else if (rank === 2) {
                rankBadge = (
                  <span className="inline-flex items-center justify-center size-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs">
                    2
                  </span>
                );
              } else if (rank === 3) {
                rankBadge = (
                  <span className="inline-flex items-center justify-center size-7 rounded-full bg-orange-100/70 border border-orange-300 text-orange-800 dark:text-orange-300 font-bold text-xs">
                    3
                  </span>
                );
              }

              return (
                <tr
                  key={inst.id}
                  className="hover:bg-muted/20 transition"
                >
                  {/* Cột 1: Thứ hạng */}
                  <td className="py-4 px-6 text-center">{rankBadge}</td>

                  {/* Cột 2: Giảng viên */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-9 rounded-xl ${inst.avatarBg} font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                      >
                        {inst.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground text-xs sm:text-sm truncate">
                          {inst.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {inst.specialty}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Cột 3: Số khóa học công khai */}
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full text-xs font-medium bg-muted/50 border border-border/70 text-muted-foreground">
                      {inst.coursesCount} khóa
                    </span>
                  </td>

                  {/* Cột 4: Số lượt bán thành công */}
                  <td className="py-4 px-4 text-right font-semibold text-foreground text-xs sm:text-sm tabular-nums">
                    {formatNumber(inst.salesCount)} lượt
                  </td>

                  {/* Cột 5: Tổng doanh thu khóa học (VNĐ) */}
                  <td className="py-4 px-4 text-right font-bold text-foreground text-xs sm:text-sm tabular-nums">
                    {formatVnd(inst.grossRevenue)}
                  </td>

                  {/* Cột 6: Doanh thu giảng viên thực nhận (VNĐ) */}
                  <td className="py-4 px-6 text-right tabular-nums">
                    <span className="inline-block px-3.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-bold text-xs sm:text-sm shadow-2xs">
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
