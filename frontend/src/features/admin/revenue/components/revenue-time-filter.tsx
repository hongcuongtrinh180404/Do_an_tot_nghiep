'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export interface RevenueTimeFilterValue {
  timeRange: string;
  startDate?: string;
  endDate?: string;
}

interface RevenueTimeFilterProps {
  value: RevenueTimeFilterValue;
  onChange: (value: RevenueTimeFilterValue) => void;
  className?: string;
}

const PRESET_OPTIONS = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'yesterday', label: 'Hôm qua' },
  { value: '7days', label: '7 ngày gần nhất' },
  { value: '30days', label: '30 ngày gần nhất (Mặc định)' },
  { value: 'thismonth', label: 'Tháng này' },
  { value: 'lastmonth', label: 'Tháng trước' },
  { value: 'thisyear', label: 'Năm nay' },
  { value: 'custom', label: 'Tùy chỉnh khoảng thời gian' },
];

export function RevenueTimeFilter({
  value,
  onChange,
  className = '',
}: RevenueTimeFilterProps): React.JSX.Element {
  const [isCustom, setIsCustom] = React.useState(value.timeRange === 'custom');
  const [customStart, setCustomStart] = React.useState(value.startDate || '');
  const [customEnd, setCustomEnd] = React.useState(value.endDate || '');
  const [dateError, setDateError] = React.useState<string | null>(null);

  const handleSelectChange = (newRange: string | null) => {
    if (!newRange) return;
    setDateError(null);
    if (newRange === 'custom') {
      setIsCustom(true);
      // Pre-fill default 30 days if empty
      if (!customStart || !customEnd) {
        const now = new Date();
        const past = new Date(now.getTime() - 29 * 86400000);
        const toStr = now.toISOString().split('T')[0];
        const fromStr = past.toISOString().split('T')[0];
        setCustomStart(fromStr);
        setCustomEnd(toStr);
        onChange({ timeRange: 'custom', startDate: fromStr, endDate: toStr });
      } else {
        onChange({ timeRange: 'custom', startDate: customStart, endDate: customEnd });
      }
    } else {
      setIsCustom(false);
      onChange({ timeRange: newRange });
    }
  };

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) {
      setDateError('Vui lòng chọn đầy đủ từ ngày và đến ngày');
      return;
    }
    if (customStart > customEnd) {
      setDateError('Ngày bắt đầu không được lớn hơn ngày kết thúc');
      return;
    }
    setDateError(null);
    onChange({ timeRange: 'custom', startDate: customStart, endDate: customEnd });
  };

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 ${className}`}>
      {/* Select Predefined Range */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
          <Icon icon="lucide:calendar" className="size-4 text-primary" />
          <span>Thời gian:</span>
        </div>
        <div className="w-56 shrink-0">
          <Select<string>
            value={value.timeRange || '30days'}
            onValueChange={handleSelectChange}
          >
            <SelectTrigger className="h-9 text-xs px-3 font-medium">
              <span className="truncate">
                {PRESET_OPTIONS.find((opt) => opt.value === (value.timeRange || '30days'))
                  ?.label || '30 ngày gần nhất'}
              </span>
            </SelectTrigger>
            <SelectContent align="start" className="min-w-56">
              {PRESET_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {isCustom && (
        <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-1.5 rounded-lg border border-border/60">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Từ:</span>
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 w-36 text-xs px-2 bg-card"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Đến:</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 w-36 text-xs px-2 bg-card"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleApplyCustom}
            className="h-8 text-xs px-3 font-medium"
          >
            Áp dụng
          </Button>
          {dateError && (
            <span className="w-full text-[11px] text-destructive font-medium mt-1">
              {dateError}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

