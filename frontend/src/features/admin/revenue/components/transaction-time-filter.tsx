'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import type { RevenueTimeFilterValue } from './revenue-time-filter';

export interface TransactionTimeFilterProps {
  value: RevenueTimeFilterValue;
  onChange: (value: RevenueTimeFilterValue) => void;
  className?: string;
  globalPeriodValue?: RevenueTimeFilterValue;
}

export const TRANSACTION_PERIOD_OPTIONS = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'yesterday', label: 'Hôm qua' },
  { value: '7days', label: '7 ngày gần nhất' },
  { value: '30days', label: '30 ngày gần nhất' },
  { value: 'thismonth', label: 'Tháng này' },
  { value: 'lastmonth', label: 'Tháng trước' },
  { value: 'thisyear', label: 'Năm nay' },
  { value: 'all', label: 'Tất cả thời gian' },
  { value: 'custom', label: 'Tùy chỉnh khoảng ngày' },
];

export function formatTransactionPeriodRange(
  period: string,
  startDate?: string,
  endDate?: string,
): string {
  if (period === 'custom') {
    return startDate && endDate
      ? `Tùy chỉnh: ${startDate} – ${endDate}`
      : 'Tùy chỉnh khoảng ngày';
  }

  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;

  if (period === 'today') return todayStr;
  if (period === 'yesterday') {
    const y = new Date(today.getTime() - 86400000);
    return `${pad(y.getDate())}/${pad(y.getMonth() + 1)}/${y.getFullYear()}`;
  }
  if (period === '7d' || period === '7days') {
    const d7 = new Date(today.getTime() - 7 * 86400000);
    return `${pad(d7.getDate())}/${pad(d7.getMonth() + 1)} – ${todayStr}`;
  }
  if (period === '30d' || period === '30days') {
    const d30 = new Date(today.getTime() - 30 * 86400000);
    return `${pad(d30.getDate())}/${pad(d30.getMonth() + 1)} – ${todayStr}`;
  }
  if (period === 'this_month' || period === 'thismonth') {
    return `01/${pad(today.getMonth() + 1)}/${today.getFullYear()} – ${todayStr}`;
  }
  if (period === 'last_month' || period === 'lastmonth') {
    const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth();
    const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
    return `01/${pad(prevMonth)}/${prevYear} – ${pad(lastDay)}/${pad(prevMonth)}/${prevYear}`;
  }
  if (period === 'this_year' || period === 'thisyear') {
    return `01/01/${today.getFullYear()} – ${todayStr}`;
  }
  if (period === 'all') {
    return 'Toàn bộ thời gian';
  }
  return '30 ngày gần nhất';
}

export function TransactionTimeFilter({
  value,
  onChange,
  className = '',
  globalPeriodValue,
}: TransactionTimeFilterProps): React.JSX.Element {
  const [localDates, setLocalDates] = React.useState<{ startDate: string; endDate: string }>({
    startDate: value.startDate || '',
    endDate: value.endDate || '',
  });
  const [dateError, setDateError] = React.useState<string | null>(null);

  // Sync internal custom dates when value updates externally
  React.useEffect(() => {
    if (value.startDate || value.endDate) {
      setLocalDates({
        startDate: value.startDate || '',
        endDate: value.endDate || '',
      });
    }
  }, [value.startDate, value.endDate]);

  const handlePeriodSelect = (selectedRange: string) => {
    setDateError(null);
    if (selectedRange === 'default') {
      if (globalPeriodValue) {
        onChange(globalPeriodValue);
      } else {
        onChange({ timeRange: '30days' });
      }
      return;
    }

    if (selectedRange === 'custom') {
      const today = new Date();
      const past = new Date(today.getTime() - 29 * 86400000);
      const toStr = today.toISOString().split('T')[0];
      const fromStr = past.toISOString().split('T')[0];

      const initialStart = localDates.startDate || fromStr;
      const initialEnd = localDates.endDate || toStr;
      setLocalDates({ startDate: initialStart, endDate: initialEnd });
      onChange({ timeRange: 'custom', startDate: initialStart, endDate: initialEnd });
      return;
    }

    onChange({ timeRange: selectedRange });
  };

  const handleApplyCustom = () => {
    if (!localDates.startDate || !localDates.endDate) {
      setDateError('Vui lòng chọn đủ từ ngày và đến ngày');
      return;
    }
    if (localDates.startDate > localDates.endDate) {
      setDateError('Ngày bắt đầu không được lớn hơn ngày kết thúc');
      return;
    }
    setDateError(null);
    onChange({
      timeRange: 'custom',
      startDate: localDates.startDate,
      endDate: localDates.endDate,
    });
  };

  const currentRange = value.timeRange || '30days';
  const formattedDateRange = React.useMemo(() => {
    return formatTransactionPeriodRange(currentRange, localDates.startDate, localDates.endDate);
  }, [currentRange, localDates.startDate, localDates.endDate]);

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {/* Dropdown Lọc Ngày / Tháng */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
          <Icon icon="lucide:calendar" className="size-4 text-primary shrink-0" />
          <span className="hidden sm:inline">Khoảng thời gian:</span>
        </div>
        <div className="w-56 shrink-0">
          <Select<string>
            value={currentRange}
            onValueChange={(val) => {
              if (val) handlePeriodSelect(val);
            }}
          >
            <SelectTrigger
              aria-label="Chọn khoảng thời gian lọc giao dịch"
              className="h-9 text-xs px-3 font-medium bg-background"
            >
              <span className="truncate">
                {currentRange === 'default'
                  ? 'Thời gian: Theo bộ lọc trang'
                  : TRANSACTION_PERIOD_OPTIONS.find((opt) => opt.value === currentRange)?.label ||
                    '30 ngày gần nhất'}
              </span>
            </SelectTrigger>
            <SelectContent align="start" className="min-w-56">
              {globalPeriodValue && (
                <SelectItem value="default" className="text-xs">
                  Thời gian: Theo bộ lọc trang
                </SelectItem>
              )}
              {TRANSACTION_PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bộ chọn khoảng ngày tùy chỉnh (khi chọn 'custom') */}
      {currentRange === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-1.5 animate-in fade-in">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-primary">Từ:</span>
            <input
              type="date"
              value={localDates.startDate}
              aria-label="Từ ngày"
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
              aria-label="Đến ngày"
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
          {dateError && (
            <span className="text-[11px] text-destructive font-medium w-full">
              {dateError}
            </span>
          )}
        </div>
      )}

      {/* Date badge hiển thị khoảng ngày thực tế */}
      <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-xl border border-border/40 select-none">
        {formattedDateRange}
      </span>
    </div>
  );
}
