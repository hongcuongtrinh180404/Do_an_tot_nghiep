'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

export interface TeachingTimeFilterValue {
  timeRange: string;
}

interface TeachingRevenueTimeFilterProps {
  value: TeachingTimeFilterValue;
  onChange: (value: TeachingTimeFilterValue) => void;
  className?: string;
}

const PRESET_OPTIONS = [
  { value: 'all', label: 'Tất cả thời gian (Mặc định)' },
  { value: '7days', label: '7 ngày gần nhất' },
  { value: '30days', label: '30 ngày gần nhất' },
  { value: 'thismonth', label: 'Tháng này' },
  { value: 'thisyear', label: 'Năm nay' },
];

export function TeachingRevenueTimeFilter({
  value,
  onChange,
  className = '',
}: TeachingRevenueTimeFilterProps): React.JSX.Element {
  const currentRange = value.timeRange || 'all';

  const handleSelectChange = (newRange: string | null) => {
    if (!newRange) return;
    onChange({ timeRange: newRange });
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
        <Icon icon="lucide:calendar" className="size-4 text-primary" />
        <span>Kỳ báo cáo:</span>
      </div>
      <div className="w-56 shrink-0">
        <Select<string>
          value={currentRange}
          onValueChange={handleSelectChange}
        >
          <SelectTrigger className="h-9 text-xs px-3 font-medium bg-background border-border/80">
            <span className="truncate">
              {PRESET_OPTIONS.find((opt) => opt.value === currentRange)?.label || 'Tất cả thời gian'}
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
  );
}
