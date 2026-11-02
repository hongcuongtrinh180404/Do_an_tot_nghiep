'use client';

import React from 'react';
import { Icon } from '@/components/ui/icon';
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
      <span className="text-xs sm:text-sm font-medium text-neutral-500 whitespace-nowrap hidden sm:inline">
        Sắp xếp theo:
      </span>
      <div className="relative">
        <select
          value={currentSort}
          onChange={(e) => onSortChange(e.target.value as PublicSortOption)}
          aria-label="Sắp xếp danh sách khóa học"
          className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-neutral-300 bg-white text-xs sm:text-sm font-medium text-neutral-800 hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#027D88]/30 focus:border-[#027D88] transition-colors cursor-pointer"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-neutral-500">
          <Icon icon="lucide:chevron-down" className="size-4" />
        </div>
      </div>
    </div>
  );
}

