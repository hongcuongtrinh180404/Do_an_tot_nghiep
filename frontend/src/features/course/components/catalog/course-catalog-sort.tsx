'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import type { PublicSortOption } from '../../services/public-courses.service';

export interface CourseCatalogSortProps {
  currentSort: PublicSortOption;
  onSortChange: (sort: PublicSortOption) => void;
}

const SORT_OPTIONS: { id: PublicSortOption; label: string }[] = [
  { id: 'newest', label: 'Mới nhất' },
  { id: 'rating', label: 'Đánh giá cao nhất' },
  { id: 'popular', label: 'Phổ biến nhất' },
  { id: 'price-asc', label: 'Giá: Thấp đến Cao' },
  { id: 'price-desc', label: 'Giá: Cao đến Thấp' },
];

export function CourseCatalogSort({
  currentSort,
  onSortChange,
}: CourseCatalogSortProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">
        Sắp xếp theo:
      </span>
      <div className="w-48 shrink-0">
        <Select<PublicSortOption>
          value={currentSort}
          onValueChange={(val) => {
            if (val) onSortChange(val);
          }}
        >
          <SelectTrigger aria-label="Sắp xếp danh sách khóa học" className="h-9 text-xs sm:text-sm px-3 bg-background">
            <span className="truncate">
              {SORT_OPTIONS.find((opt) => opt.id === currentSort)?.label || 'Mới nhất'}
            </span>
          </SelectTrigger>
          <SelectContent align="end" className="min-w-48">
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id} className="text-xs sm:text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

