'use client';

import React from 'react';
import { CourseLevelEnum } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { usePublicCategoriesQuery } from '../../api/course-category.api';
import type { PublicPriceRange } from '../../services/public-courses.service';

export interface CourseCatalogFiltersProps {
  selectedCategories: string[];
  onToggleCategory: (slug: string) => void;
  selectedPrices: PublicPriceRange[];
  onTogglePrice: (price: PublicPriceRange) => void;
  selectedLevels: CourseLevelEnum[];
  onToggleLevel: (level: CourseLevelEnum) => void;
  onResetAll: () => void;
  hasActiveFilters: boolean;
  totalResults?: number;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

const PRICE_OPTIONS: { id: PublicPriceRange; label: string; hint?: string }[] = [
  { id: 'free', label: 'Miễn phí', hint: '0đ' },
  { id: 'under-200', label: 'Dưới 200.000đ', hint: '< 200k' },
  { id: '200-500', label: '200.000đ – 500.000đ', hint: '200k – 500k' },
  { id: 'above-500', label: 'Từ 500.000đ trở lên', hint: '>= 500k' },
  { id: 'discount', label: 'Đang giảm giá', hint: 'Ưu đãi' },
];

const LEVEL_OPTIONS: { id: CourseLevelEnum; label: string; dots: number }[] = [
  { id: CourseLevelEnum.BEGINNER, label: 'Cơ bản', dots: 1 },
  { id: CourseLevelEnum.INTERMEDIATE, label: 'Trung cấp', dots: 2 },
  { id: CourseLevelEnum.ADVANCED, label: 'Nâng cao', dots: 3 },
  { id: CourseLevelEnum.ALL_LEVELS, label: 'Mọi trình độ', dots: 1 },
];

export function CourseCatalogFilters({
  selectedCategories,
  onToggleCategory,
  selectedPrices,
  onTogglePrice,
  selectedLevels,
  onToggleLevel,
  onResetAll,
  hasActiveFilters,
  totalResults,
  isMobileDrawer = false,
  onCloseMobileDrawer,
}: CourseCatalogFiltersProps): React.JSX.Element {
  const { data: categories = [], isLoading: isLoadingCategories } = usePublicCategoriesQuery();

  const content = (
    <div className="space-y-6">
      {/* Header bar on mobile or top of sidebar */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:sliders-horizontal" className="size-4 text-[#027D88]" />
          <h3 className="text-base font-bold text-[#161616]">
            Bộ lọc tìm kiếm
          </h3>
          {hasActiveFilters && (
            <span className="flex items-center justify-center size-5 rounded-full bg-[#027D88] text-[11px] font-bold text-white">
              {selectedCategories.length + selectedPrices.length + selectedLevels.length}
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetAll}
            className="text-xs font-semibold text-[#027D88] hover:text-[#02666F] hover:underline cursor-pointer"
          >
            Đặt lại
          </button>
        )}
      </div>

      {/* 1. Nhóm Giá */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-bold uppercase tracking-wider text-neutral-800">
          Khoảng giá
        </legend>
        <div className="space-y-2">
          {PRICE_OPTIONS.map((opt) => {
            const checked = selectedPrices.includes(opt.id);
            return (
              <label
                key={opt.id}
                className="group flex items-center justify-between gap-2.5 py-1 text-sm text-neutral-700 hover:text-neutral-900 cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onTogglePrice(opt.id)}
                    className="size-4 rounded border-neutral-300 text-[#027D88] focus:ring-2 focus:ring-[#027D88]/30 accent-[#027D88] cursor-pointer"
                  />
                  <span className={checked ? 'font-semibold text-[#161616]' : 'text-neutral-700'}>
                    {opt.label}
                  </span>
                </div>
                {opt.hint && (
                  <span className="text-xs text-neutral-400 group-hover:text-neutral-600">
                    {opt.hint}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* 2. Nhóm Danh mục */}
      <fieldset className="space-y-3 pt-4 border-t border-neutral-200">
        <legend className="text-xs font-bold uppercase tracking-wider text-neutral-800">
          Lĩnh vực & Danh mục
        </legend>
        <div className="space-y-2">
          {isLoadingCategories ? (
            <div className="space-y-2 py-1">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div key={idx} className="h-5 w-full bg-neutral-100 rounded animate-pulse" />
              ))}
            </div>
          ) : categories.length > 0 ? (
            categories.map((cat) => {
              const checked = selectedCategories.includes(cat.slug);
              return (
                <label
                  key={cat.id || cat.slug}
                  className="group flex items-center justify-between gap-2.5 py-1 text-sm text-neutral-700 hover:text-neutral-900 cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleCategory(cat.slug)}
                      className="size-4 shrink-0 rounded border-neutral-300 text-[#027D88] focus:ring-2 focus:ring-[#027D88]/30 accent-[#027D88] cursor-pointer"
                    />
                    <span
                      className={`truncate ${
                        checked ? 'font-semibold text-[#161616]' : 'text-neutral-700'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </div>
                  {typeof cat.courseCount === 'number' && cat.courseCount > 0 && (
                    <span className="text-xs text-neutral-400 shrink-0">
                      ({cat.courseCount})
                    </span>
                  )}
                </label>
              );
            })
          ) : (
            <p className="text-xs text-neutral-500 py-1">Đang cập nhật danh mục</p>
          )}
        </div>
      </fieldset>

      {/* 3. Nhóm Trình độ */}
      <fieldset className="space-y-3 pt-4 border-t border-neutral-200">
        <legend className="text-xs font-bold uppercase tracking-wider text-neutral-800">
          Trình độ học vấn
        </legend>
        <div className="space-y-2">
          {LEVEL_OPTIONS.map((lvl) => {
            const checked = selectedLevels.includes(lvl.id);
            return (
              <label
                key={lvl.id}
                className="group flex items-center justify-between gap-2.5 py-1 text-sm text-neutral-700 hover:text-neutral-900 cursor-pointer select-none transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleLevel(lvl.id)}
                    className="size-4 rounded border-neutral-300 text-[#027D88] focus:ring-2 focus:ring-[#027D88]/30 accent-[#027D88] cursor-pointer"
                  />
                  <span className={checked ? 'font-semibold text-[#161616]' : 'text-neutral-700'}>
                    {lvl.label}
                  </span>
                </div>

                {/* Visual Level Dots */}
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3].map((dot) => (
                    <span
                      key={dot}
                      className={`size-1.5 rounded-full ${
                        dot <= lvl.dots ? 'bg-neutral-800' : 'bg-neutral-300'
                      }`}
                    />
                  ))}
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );

  if (isMobileDrawer) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:sliders-horizontal" className="size-5 text-[#027D88]" />
            <h2 className="text-lg font-bold text-[#161616]">Bộ lọc khóa học</h2>
          </div>
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="p-1 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            aria-label="Đóng bộ lọc"
          >
            <Icon icon="lucide:x" className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {content}
        </div>

        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center gap-3">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetAll}
              className="flex-1 py-2.5 px-4 rounded-lg border border-neutral-300 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              Xóa tất cả
            </button>
          )}
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="flex-1 py-2.5 px-4 rounded-lg bg-[#027D88] hover:bg-[#02666F] text-white text-sm font-bold shadow-sm transition-colors text-center"
          >
            {totalResults !== undefined ? `Xem ${totalResults} khóa học` : 'Áp dụng bộ lọc'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <aside
      aria-label="Bộ lọc tìm kiếm khóa học"
      className="w-full rounded-xl border border-neutral-200/90 bg-white p-5 shadow-xs"
    >
      {content}
    </aside>
  );
}

