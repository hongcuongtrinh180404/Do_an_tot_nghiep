'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import type { DashboardPeriodType, IDashboardCustomDates } from '../types';
import { PERIOD_LABELS } from '../constants/mock-dashboard-data';

interface DashboardHeaderProps {
  period: DashboardPeriodType;
  onPeriodChange: (p: DashboardPeriodType) => void;
  customDates: IDashboardCustomDates;
  onCustomDatesChange: (dates: IDashboardCustomDates) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function DashboardHeader({
  period,
  onPeriodChange,
  customDates,
  onCustomDatesChange,
  onRefresh,
  isRefreshing = false,
}: DashboardHeaderProps): React.JSX.Element {
  const [localDates, setLocalDates] = React.useState<IDashboardCustomDates>(customDates);

  const handleApplyCustom = () => {
    onCustomDatesChange(localDates);
  };

  const formattedDateRange = React.useMemo(() => {
    if (period === 'custom') {
      return `Tùy chỉnh: ${localDates.startDate} – ${localDates.endDate}`;
    }
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;

    if (period === 'today') return todayStr;
    if (period === 'yesterday') {
      const y = new Date(today.getTime() - 86400000);
      return `${pad(y.getDate())}/${pad(y.getMonth() + 1)}/${y.getFullYear()}`;
    }
    if (period === '7d') {
      const d7 = new Date(today.getTime() - 7 * 86400000);
      return `${pad(d7.getDate())}/${pad(d7.getMonth() + 1)} – ${todayStr}`;
    }
    if (period === '30d') {
      const d30 = new Date(today.getTime() - 30 * 86400000);
      return `${pad(d30.getDate())}/${pad(d30.getMonth() + 1)} – ${todayStr}`;
    }
    if (period === 'this_month') {
      return `01/${pad(today.getMonth() + 1)}/${today.getFullYear()} – ${todayStr}`;
    }
    if (period === 'last_month') {
      const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth();
      const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
      return `01/${pad(prevMonth)}/${prevYear} – 30/${pad(prevMonth)}/${prevYear}`;
    }
    if (period === 'this_year') {
      return `01/01/${today.getFullYear()} – ${todayStr}`;
    }
    return PERIOD_LABELS[period];
  }, [period, localDates]);

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border/60 shadow-xs">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
            Trung tâm điều hành & thống kê
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Cập nhật thời gian thực
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Giám sát doanh thu bán khóa học, phân chia hoa hồng giảng viên, chất lượng đào tạo và hoạt động vận hành hệ thống.
        </p>
      </div>

      {/* Global Filter Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2 bg-muted/40 border border-border/80 rounded-xl px-3 py-1.5">
          <Icon icon="lucide:calendar" className="size-4 text-primary shrink-0" />
          <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
            Khoảng thời gian:
          </span>
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as DashboardPeriodType)}
            className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer pr-1"
          >
            <option value="today">Hôm nay</option>
            <option value="yesterday">Hôm qua</option>
            <option value="7d">7 ngày gần nhất</option>
            <option value="30d">30 ngày gần nhất</option>
            <option value="this_month">Tháng này</option>
            <option value="last_month">Tháng trước</option>
            <option value="this_year">Năm nay</option>
            <option value="custom">Tùy chỉnh khoảng ngày</option>
          </select>
        </div>

        {/* Custom date range pickers */}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-primary">Từ:</span>
              <input
                type="date"
                value={localDates.startDate}
                onChange={(e) =>
                  setLocalDates((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="text-xs bg-card border border-border rounded-lg px-2 py-0.5 text-foreground outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-primary">Đến:</span>
              <input
                type="date"
                value={localDates.endDate}
                onChange={(e) =>
                  setLocalDates((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="text-xs bg-card border border-border rounded-lg px-2 py-0.5 text-foreground outline-none focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyCustom}
              className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition cursor-pointer"
            >
              Áp dụng
            </button>
          </div>
        )}

        {/* Date badge */}
        <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-xl border border-border/40 select-none">
          {formattedDateRange}
        </span>

        {/* Refresh button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Làm mới dữ liệu"
          className="p-2 rounded-xl border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer disabled:opacity-50"
        >
          <Icon
            icon="lucide:rotate-ccw"
            className={`size-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`}
          />
        </button>
      </div>
    </div>
  );
}
