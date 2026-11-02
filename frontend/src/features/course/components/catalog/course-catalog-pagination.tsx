'use client';

import React from 'react';
import { Icon } from '@/components/ui/icon';

export interface CourseCatalogPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function CourseCatalogPagination({
  currentPage,
  totalPages,
  onPageChange,
}: CourseCatalogPaginationProps): React.JSX.Element | null {
  if (totalPages <= 1) {
    return null;
  }

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, '...', totalPages];
    }

    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <nav
      aria-label="Điều hướng phân trang catalog"
      className="flex items-center justify-center gap-1.5 pt-8 pb-4"
    >
      {/* Prev Button */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-neutral-300 bg-white text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        aria-label="Trang trước"
      >
        <Icon icon="lucide:chevron-left" className="size-4 mr-1" />
        <span className="hidden sm:inline">Trước</span>
      </button>

      {/* Number Buttons */}
      <div className="flex items-center gap-1">
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="size-9 flex items-center justify-center text-xs text-neutral-400 select-none"
              >
                ...
              </span>
            );
          }

          const pageNum = Number(p);
          const isCurrent = pageNum === currentPage;

          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              onClick={() => onPageChange(pageNum)}
              aria-current={isCurrent ? 'page' : undefined}
              className={`size-9 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center justify-center ${
                isCurrent
                  ? 'bg-[#027D88] text-white shadow-xs'
                  : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-400'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-neutral-300 bg-white text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        aria-label="Trang tiếp theo"
      >
        <span className="hidden sm:inline">Sau</span>
        <Icon icon="lucide:chevron-right" className="size-4 ml-1" />
      </button>
    </nav>
  );
}

