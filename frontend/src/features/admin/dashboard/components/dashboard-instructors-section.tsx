'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import type { DashboardPeriodType, IDashboardCustomDates } from '../types';
import { formatVnd } from '../../revenue/utils/revenue-format.util';
import { formatNumber } from '../constants/mock-dashboard-data';
import { useAdminDashboardInstructorsRankingQuery } from '../api/admin-dashboard.api';

interface DashboardInstructorsSectionProps {
  globalPeriod?: DashboardPeriodType | string;
  customDates?: IDashboardCustomDates;
}

export function DashboardInstructorsSection({
  globalPeriod = '30d',
  customDates,
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

  const normalizedGlobalPeriod = React.useMemo(() => {
    switch (globalPeriod) {
      case 'today':
        return 'today';
      case 'yesterday':
        return 'yesterday';
      case '7days':
      case '7d':
        return '7d';
      case '30days':
      case '30d':
        return '30d';
      case 'thismonth':
      case 'this_month':
        return 'this_month';
      case 'lastmonth':
      case 'last_month':
        return 'last_month';
      case 'thisyear':
      case 'this_year':
        return 'this_year';
      case 'custom':
        return 'custom';
      default:
        return '30d';
    }
  }, [globalPeriod]);

  const effectivePeriod = periodOverride === 'default' ? normalizedGlobalPeriod : periodOverride;

  const queryParams = React.useMemo(
    () => ({
      period: effectivePeriod,
      startDate: effectivePeriod === 'custom' ? customDates?.startDate : undefined,
      endDate: effectivePeriod === 'custom' ? customDates?.endDate : undefined,
      sortBy: sortKey,
      limit,
    }),
    [effectivePeriod, customDates, sortKey, limit],
  );

  const {
    data: instructors = [],
    isLoading,
    isError,
    refetch,
  } = useAdminDashboardInstructorsRankingQuery(queryParams);

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
                        : periodOverride === 'this_month'
                          ? 'Tháng này'
                          : periodOverride === 'this_year'
                            ? 'Năm nay'
                            : 'Thời gian: Theo bộ lọc chung'}
                  </span>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-52">
                  <SelectItem value="default" className="text-xs">Thời gian: Theo bộ lọc chung</SelectItem>
                  <SelectItem value="today" className="text-xs">Hôm nay</SelectItem>
                  <SelectItem value="7d" className="text-xs">7 ngày gần nhất</SelectItem>
                  <SelectItem value="this_month" className="text-xs">Tháng này</SelectItem>
                  <SelectItem value="this_year" className="text-xs">Năm nay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dropdown 2: Xếp hạng */}
            <div className="w-56 shrink-0">
              <Select<'grossRevenue' | 'salesCount' | 'netRevenue'>
                value={sortKey}
                onValueChange={(val) => {
                  if (val) setSortKey(val);
                }}
              >
                <SelectTrigger className="h-9 text-xs px-3 font-medium bg-background">
                  <span className="truncate">
                    {sortKey === 'salesCount'
                      ? 'Xếp hạng: Lượt bán thành công'
                      : sortKey === 'netRevenue'
                        ? 'Xếp hạng: Doanh thu thực nhận'
                        : 'Xếp hạng: Tổng doanh thu'}
                  </span>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-56">
                  <SelectItem value="grossRevenue" className="text-xs">Xếp hạng: Tổng doanh thu</SelectItem>
                  <SelectItem value="salesCount" className="text-xs">Xếp hạng: Lượt bán thành công</SelectItem>
                  <SelectItem value="netRevenue" className="text-xs">Xếp hạng: Doanh thu thực nhận</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="w-36 shrink-0">
              <Select<string>
                value={String(limit)}
                onValueChange={(val) => {
                  if (val) setLimit(Number(val));
                }}
              >
                <SelectTrigger className="h-9 text-xs px-3 font-medium bg-background">
                  <span className="truncate">
                    {`Hiển thị: Top ${limit}`}
                  </span>
                </SelectTrigger>
                <SelectContent align="end" className="min-w-36">
                  <SelectItem value="5" className="text-xs">Hiển thị: Top 5</SelectItem>
                  <SelectItem value="10" className="text-xs">Hiển thị: Top 10</SelectItem>
                </SelectContent>
              </Select>
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
            {isLoading ? (
              Array.from({ length: limit }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse">
                  <td className="py-4 px-6 text-center">
                    <div className="size-7 rounded-full bg-muted/60 mx-auto" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-muted/60 shrink-0" />
                      <div className="space-y-1.5 w-32">
                        <div className="h-3.5 bg-muted/60 rounded w-28" />
                        <div className="h-2.5 bg-muted/50 rounded w-20" />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="h-6 w-16 bg-muted/60 rounded-full mx-auto" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="h-4 w-14 bg-muted/60 rounded ml-auto" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="h-4 w-24 bg-muted/60 rounded ml-auto" />
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="h-7 w-28 bg-muted/60 rounded-xl ml-auto" />
                  </td>
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Icon icon="lucide:alert-circle" className="size-6 text-rose-500" />
                    <p className="text-xs font-semibold text-foreground">Không thể tải dữ liệu xếp hạng giảng viên</p>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="mt-1 px-3 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition cursor-pointer"
                    >
                      Thử lại
                    </button>
                  </div>
                </td>
              </tr>
            ) : instructors.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="size-10 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground">
                      <Icon icon="lucide:user-x" className="size-5" />
                    </div>
                    <p className="text-xs font-medium">Chưa có dữ liệu xếp hạng giảng viên trong kỳ lọc này</p>
                  </div>
                </td>
              </tr>
            ) : (
              instructors.map((inst, idx) => {
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
                        {inst.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={inst.avatarUrl}
                            alt={inst.name}
                            className="size-9 rounded-xl object-cover shrink-0 shadow-2xs border border-border/60"
                          />
                        ) : (
                          <div
                            className={`size-9 rounded-xl ${inst.avatarBg || 'bg-primary/10 text-primary'} font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                          >
                            {inst.initials}
                          </div>
                        )}
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
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
