'use client';

import React from 'react';
import { CourseLevelEnum } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { usePublicCategoriesQuery } from '../../api/course-category.api';
import type { PublicPriceRange } from '../../services/public-courses.service';

export interface CourseCatalogActiveChipsProps {
  searchQuery: string;
  onClearSearch: () => void;
  selectedCategories: string[];
  onRemoveCategory: (slug: string) => void;
  selectedPrices: PublicPriceRange[];
  onRemovePrice: (price: PublicPriceRange) => void;
  selectedLevels: CourseLevelEnum[];
  onRemoveLevel: (level: CourseLevelEnum) => void;
  onClearAll: () => void;
}

const PRICE_LABELS: Record<PublicPriceRange, string> = {
  free: 'Miễn phí',
  'under-200': '< 200.000đ',
  '200-500': '200k – 500k',
  'above-500': '≥ 500.000đ',
  discount: 'Đang giảm giá',
};

const LEVEL_LABELS: Record<CourseLevelEnum, string> = {
  [CourseLevelEnum.BEGINNER]: 'Cơ bản',
  [CourseLevelEnum.INTERMEDIATE]: 'Trung cấp',
  [CourseLevelEnum.ADVANCED]: 'Nâng cao',
  [CourseLevelEnum.ALL_LEVELS]: 'Mọi trình độ',
};

export function CourseCatalogActiveChips({
  searchQuery,
  onClearSearch,
  selectedCategories,
  onRemoveCategory,
  selectedPrices,
  onRemovePrice,
  selectedLevels,
  onRemoveLevel,
  onClearAll,
}: CourseCatalogActiveChipsProps): React.JSX.Element | null {
  const { data: categories = [] } = usePublicCategoriesQuery();

  const hasChips =
    Boolean(searchQuery.trim()) ||
    selectedCategories.length > 0 ||
    selectedPrices.length > 0 ||
    selectedLevels.length > 0;

  if (!hasChips) {
    return null;
  }

  const getCategoryName = (slug: string): string => {
    const found = categories.find((c) => c.slug === slug);
    return found ? found.name : slug;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <span className="text-xs font-semibold text-neutral-500">Đang lọc theo:</span>

      {/* Query Chip */}
      {searchQuery.trim() && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 border border-neutral-200 text-xs font-medium text-neutral-800">
          <Icon icon="lucide:search" className="size-3 text-neutral-500" />
          <span>&ldquo;{searchQuery.trim()}&rdquo;</span>
          <button
            type="button"
            onClick={onClearSearch}
            className="hover:text-red-600 transition-colors cursor-pointer"
            aria-label="Xóa từ khóa tìm kiếm"
          >
            <Icon icon="lucide:x" className="size-3" />
          </button>
        </span>
      )}

      {/* Category Chips */}
      {selectedCategories.map((slug) => (
        <span
          key={`cat-${slug}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#eefafb] border border-[#b2e5ea] text-xs font-medium text-[#02666F]"
        >
          <span className="text-neutral-500">Danh mục:</span>
          <span>{getCategoryName(slug)}</span>
          <button
            type="button"
            onClick={() => onRemoveCategory(slug)}
            className="hover:text-red-600 transition-colors cursor-pointer"
            aria-label={`Bỏ chọn danh mục ${getCategoryName(slug)}`}
          >
            <Icon icon="lucide:x" className="size-3" />
          </button>
        </span>
      ))}

      {/* Price Chips */}
      {selectedPrices.map((range) => (
        <span
          key={`price-${range}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900"
        >
          <span className="text-amber-700/80">Giá:</span>
          <span>{PRICE_LABELS[range] || range}</span>
          <button
            type="button"
            onClick={() => onRemovePrice(range)}
            className="hover:text-red-600 transition-colors cursor-pointer"
            aria-label={`Bỏ chọn khoảng giá ${PRICE_LABELS[range]}`}
          >
            <Icon icon="lucide:x" className="size-3" />
          </button>
        </span>
      ))}

      {/* Level Chips */}
      {selectedLevels.map((lvl) => (
        <span
          key={`level-${lvl}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 border border-neutral-200 text-xs font-medium text-neutral-800"
        >
          <span className="text-neutral-500">Trình độ:</span>
          <span>{LEVEL_LABELS[lvl] || lvl}</span>
          <button
            type="button"
            onClick={() => onRemoveLevel(lvl)}
            className="hover:text-red-600 transition-colors cursor-pointer"
            aria-label={`Bỏ chọn trình độ ${LEVEL_LABELS[lvl]}`}
          >
            <Icon icon="lucide:x" className="size-3" />
          </button>
        </span>
      ))}

      {/* Clear All button */}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline px-1 py-1 cursor-pointer transition-colors"
      >
        Xóa tất cả
      </button>
    </div>
  );
}

