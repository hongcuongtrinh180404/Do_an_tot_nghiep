'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

export interface TeachingTimeFilterValue {
  timeRange: string;
  startDate?: string;
  endDate?: string;
}

interface TeachingRevenueTimeFilterProps {
  value: TeachingTimeFilterValue;
  onChange: (value: TeachingTimeFilterValue) => void;
  className?: string;
}

const PRESET_OPTIONS = [
  { value: 'all', label: 'Tất cả thời gian' },
  { value: 'today', label: 'Hôm nay' },
  { value: '7days', label: '7 ngày gần nhất' },
  { value: '30days', label: '30 ngày gần nhất' },
  { value: 'thismonth', label: 'Tháng này' },
  { value: 'thisyear', label: 'Năm nay' },
  { value: 'custom', label: 'Tùy chỉnh khoảng ngày' },
];

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const end = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const startObj = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const start = `${startObj.getFullYear()}-${pad(startObj.getMonth() + 1)}-${pad(startObj.getDate())}`;
  return { startDate: start, endDate: end };
}

export function TeachingRevenueTimeFilter({
  value,
  onChange,
  className = '',
}: TeachingRevenueTimeFilterProps): React.JSX.Element {
  const currentRange = value.timeRange || 'today';

  const defaultDates = React.useMemo(() => getDefaultDateRange(), []);
  const [localDates, setLocalDates] = React.useState<{ startDate: string; endDate: string }>({
    startDate: value.startDate || defaultDates.startDate,
    endDate: value.endDate || defaultDates.endDate,
  });

  React.useEffect(() => {
    if (value.startDate && value.endDate) {
      setLocalDates({
        startDate: value.startDate,
        endDate: value.endDate,
      });
    }
  }, [value.startDate, value.endDate]);

  const handleSelectChange = (newRange: string | null) => {
    if (!newRange) return;
    if (newRange === 'custom') {
      onChange({
        timeRange: 'custom',
        startDate: localDates.startDate,
        endDate: localDates.endDate,
      });
    } else {
      onChange({ timeRange: newRange });
    }
  };

  const handleApplyCustom = () => {
    if (!localDates.startDate || !localDates.endDate) {
      toast.error('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc');
      return;
    }
    if (localDates.startDate > localDates.endDate) {
      toast.error('Ngày bắt đầu không được lớn hơn ngày kết thúc');
      return;
    }
    onChange({
      timeRange: 'custom',
      startDate: localDates.startDate,
      endDate: localDates.endDate,
    });
  };

  const formattedDateRange = React.useMemo(() => {
    if (currentRange === 'custom') {
      return `Tùy chỉnh: ${localDates.startDate} – ${localDates.endDate}`;
    }
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;

    if (currentRange === 'today') return todayStr;
    if (currentRange === '7days') {
      const d7 = new Date(today.getTime() - 7 * 86400000);
      return `${pad(d7.getDate())}/${pad(d7.getMonth() + 1)} – ${todayStr}`;
    }
    if (currentRange === '30days') {
      const d30 = new Date(today.getTime() - 30 * 86400000);
      return `${pad(d30.getDate())}/${pad(d30.getMonth() + 1)} – ${todayStr}`;
    }
    if (currentRange === 'thismonth') {
      return `01/${pad(today.getMonth() + 1)}/${today.getFullYear()} – ${todayStr}`;
    }
    if (currentRange === 'thisyear') {
      return `01/01/${today.getFullYear()} – ${todayStr}`;
    }
    if (currentRange === 'all') {
      return 'Toàn bộ thời gian';
    }
    return PRESET_OPTIONS.find((opt) => opt.value === currentRange)?.label || currentRange;
  }, [currentRange, localDates]);

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
          <Icon icon="lucide:calendar" className="size-4 text-primary shrink-0" />
          <span>Kỳ báo cáo:</span>
        </div>
        <div className="w-56 shrink-0">
          <Select<string>
            value={currentRange}
            onValueChange={handleSelectChange}
          >
            <SelectTrigger className="h-9 text-xs px-3 font-medium bg-background border-border/80">
              <span className="truncate">
                {PRESET_OPTIONS.find((opt) => opt.value === currentRange)?.label || 'Hôm nay'}
              </span>
            </SelectTrigger>
            <SelectContent align="end" className="min-w-56">
              {PRESET_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom date range pickers */}
      {currentRange === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-1.5 animate-in fade-in">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-primary">Từ:</span>
            <input
              type="date"
              aria-label="Từ ngày"
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
              aria-label="Đến ngày"
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
    </div>
  );
}
