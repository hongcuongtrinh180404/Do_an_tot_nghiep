'use client';

import React from 'react';
import { Icon } from '@/components/ui/icon';

export interface CourseCatalogEmptyProps {
  onResetFilters: () => void;
}

export function CourseCatalogEmpty({
  onResetFilters,
}: CourseCatalogEmptyProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 my-6">
      <div className="size-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4 shadow-xs">
        <Icon icon="lucide:search-x" className="size-8 text-[#027D88]" />
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-[#161616]">
        Không tìm thấy khóa học phù hợp
      </h3>

      <p className="mt-2 text-sm text-neutral-600 max-w-md leading-relaxed">
        Không có kết quả nào thỏa mãn đồng thời các tiêu chí bộ lọc của bạn. Hãy thử nới lỏng điều kiện tìm kiếm hoặc đặt lại các bộ lọc.
      </p>

      <button
        type="button"
        onClick={onResetFilters}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-2.5 px-5 text-sm transition-colors shadow-xs cursor-pointer"
      >
        <Icon icon="lucide:rotate-ccw" className="size-4" />
        <span>Đặt lại toàn bộ bộ lọc</span>
      </button>
    </div>
  );
}

