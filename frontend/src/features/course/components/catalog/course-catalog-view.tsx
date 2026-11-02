'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CourseLevelEnum } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { CourseCard } from '../public-discovery/course-card';
import { usePublicCoursesCatalogQuery } from '../../api/public-courses.api';
import type {
  PublicPriceRange,
  PublicSortOption,
  IPublicCoursesFilterParams,
} from '../../services/public-courses.service';
import { CourseCatalogFilters } from './course-catalog-filters';
import { CourseCatalogSort } from './course-catalog-sort';
import { CourseCatalogActiveChips } from './course-catalog-active-chips';
import { CourseCatalogPagination } from './course-catalog-pagination';
import { CourseCatalogEmpty } from './course-catalog-empty';

export function CourseCatalogView(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Read filter state from URL search params (single source of truth)
  const qParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';
  const priceParam = searchParams.get('price') || '';
  const levelParam = searchParams.get('level') || '';
  const sortParam = (searchParams.get('sort') as PublicSortOption) || 'newest';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [localSearchInput, setLocalSearchInput] = useState(qParam);
  const [prevQParam, setPrevQParam] = useState(qParam);

  // Sync local search when URL param changes externally without triggering cascading render in useEffect
  if (prevQParam !== qParam) {
    setPrevQParam(qParam);
    setLocalSearchInput(qParam);
  }

  // Prevent background scroll when mobile filter drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileDrawerOpen]);

  // Parse multi-select arrays
  const selectedCategories = useMemo(
    () => (categoryParam ? categoryParam.split(',').filter(Boolean) : []),
    [categoryParam],
  );

  const selectedPrices = useMemo(
    () => (priceParam ? (priceParam.split(',').filter(Boolean) as PublicPriceRange[]) : []),
    [priceParam],
  );

  const selectedLevels = useMemo(
    () => (levelParam ? (levelParam.split(',').filter(Boolean) as CourseLevelEnum[]) : []),
    [levelParam],
  );

  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  // 2. Build Query Params object for service/API
  const queryParams: IPublicCoursesFilterParams = useMemo(
    () => ({
      q: qParam,
      categories: selectedCategories,
      priceRanges: selectedPrices,
      levels: selectedLevels,
      sort: sortParam,
      page: currentPage,
      limit: 9,
    }),
    [qParam, selectedCategories, selectedPrices, selectedLevels, sortParam, currentPage],
  );

  const { data, isLoading } = usePublicCoursesCatalogQuery(queryParams);

  // Helper to commit new URL state
  const updateUrlParams = useCallback(
    (updater: (params: URLSearchParams) => void, mode: 'push' | 'replace' = 'replace') => {
      const nextParams = new URLSearchParams(searchParams.toString());
      updater(nextParams);
      const qs = nextParams.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      if (mode === 'push') {
        router.push(nextUrl, { scroll: false });
      } else {
        router.replace(nextUrl, { scroll: false });
      }
    },
    [router, pathname, searchParams],
  );

  // 3. Handlers for Filter Mutations
  const handleToggleCategory = useCallback(
    (slug: string) => {
      updateUrlParams((params) => {
        let current = params.get('category') ? params.get('category')!.split(',').filter(Boolean) : [];
        if (current.includes(slug)) {
          current = current.filter((s) => s !== slug);
        } else {
          current.push(slug);
        }

        if (current.length > 0) {
          params.set('category', current.join(','));
        } else {
          params.delete('category');
        }
        params.delete('page'); // Reset to page 1 on filter change
      }, 'replace');
    },
    [updateUrlParams],
  );

  const handleTogglePrice = useCallback(
    (priceRange: PublicPriceRange) => {
      updateUrlParams((params) => {
        let current = params.get('price') ? params.get('price')!.split(',').filter(Boolean) : [];
        if (current.includes(priceRange)) {
          current = current.filter((p) => p !== priceRange);
        } else {
          current.push(priceRange);
        }

        if (current.length > 0) {
          params.set('price', current.join(','));
        } else {
          params.delete('price');
        }
        params.delete('page');
      }, 'replace');
    },
    [updateUrlParams],
  );

  const handleToggleLevel = useCallback(
    (level: CourseLevelEnum) => {
      updateUrlParams((params) => {
        let current = params.get('level') ? params.get('level')!.split(',').filter(Boolean) : [];
        if (current.includes(level)) {
          current = current.filter((l) => l !== level);
        } else {
          current.push(level);
        }

        if (current.length > 0) {
          params.set('level', current.join(','));
        } else {
          params.delete('level');
        }
        params.delete('page');
      }, 'replace');
    },
    [updateUrlParams],
  );

  const handleSortChange = useCallback(
    (newSort: PublicSortOption) => {
      updateUrlParams((params) => {
        if (newSort === 'newest') {
          params.delete('sort');
        } else {
          params.set('sort', newSort);
        }
        params.delete('page');
      }, 'replace');
    },
    [updateUrlParams],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateUrlParams((params) => {
        if (newPage <= 1) {
          params.delete('page');
        } else {
          params.set('page', String(newPage));
        }
      }, 'push');

      // Scroll smoothly to top of catalog section
      const catalogEl = document.getElementById('catalog-content-header');
      if (catalogEl) {
        catalogEl.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [updateUrlParams],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParams((params) => {
      const trimmed = localSearchInput.trim();
      if (trimmed) {
        params.set('q', trimmed);
      } else {
        params.delete('q');
      }
      params.delete('page');
    }, 'push');
  };

  const handleClearSearch = useCallback(() => {
    setLocalSearchInput('');
    updateUrlParams((params) => {
      params.delete('q');
      params.delete('page');
    }, 'replace');
  }, [updateUrlParams]);

  const handleResetAll = useCallback(() => {
    setLocalSearchInput('');
    updateUrlParams((params) => {
      params.delete('q');
      params.delete('category');
      params.delete('price');
      params.delete('level');
      params.delete('page');
    }, 'push');
    setMobileDrawerOpen(false);
  }, [updateUrlParams]);

  const hasActiveFilters =
    Boolean(qParam.trim()) ||
    selectedCategories.length > 0 ||
    selectedPrices.length > 0 ||
    selectedLevels.length > 0;

  const totalResults = data?.total ?? 0;
  const startItem = totalResults === 0 ? 0 : (currentPage - 1) * 9 + 1;
  const endItem = Math.min(currentPage * 9, totalResults);

  return (
    <div className="w-full bg-[#fbfbfb] min-h-[calc(100vh-4rem)] text-[#161616]">
      {/* 1. Breadcrumbs & Page Header */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Breadcrumb nav */}
          <nav aria-label="Đường dẫn trang" className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
            <Link href="/" className="hover:text-neutral-900 transition-colors">
              Trang chủ
            </Link>
            <Icon icon="lucide:chevron-right" className="size-3 text-neutral-400" />
            <span className="font-semibold text-neutral-800">Tất cả khóa học</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#161616]">
                Tất cả khóa học
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-neutral-600 max-w-2xl">
                Khám phá kho khóa học video chất lượng cao tích hợp bộ công cụ trợ lý AI thông minh: tóm tắt Mindmap trực quan và bài tập In-video Quiz.
              </p>
            </div>

            {/* In-catalog Quick Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80 shrink-0">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400">
                <Icon icon="lucide:search" className="size-4" />
              </div>
              <input
                type="text"
                value={localSearchInput}
                onChange={(e) => setLocalSearchInput(e.target.value)}
                placeholder="Tìm khóa học, kỹ năng..."
                className="w-full h-10 rounded-lg border border-neutral-300 bg-neutral-50/70 pl-9 pr-9 text-sm text-[#161616] placeholder:text-neutral-400 focus:bg-white focus:border-[#027D88] focus:ring-2 focus:ring-[#027D88]/20 focus:outline-none transition-all"
              />
              {localSearchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-700"
                  aria-label="Xóa nội dung tìm kiếm"
                >
                  <Icon icon="lucide:x" className="size-4" />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* 2. Main 2-column Catalog Layout */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row items-start gap-8">
          
          {/* Left Column: Desktop Filter Sidebar */}
          <div className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-20">
            <CourseCatalogFilters
              selectedCategories={selectedCategories}
              onToggleCategory={handleToggleCategory}
              selectedPrices={selectedPrices}
              onTogglePrice={handleTogglePrice}
              selectedLevels={selectedLevels}
              onToggleLevel={handleToggleLevel}
              onResetAll={handleResetAll}
              hasActiveFilters={hasActiveFilters}
              totalResults={totalResults}
            />
          </div>

          {/* Right Column: Catalog Grid & Controls */}
          <div className="flex-1 min-w-0 w-full" id="catalog-content-header">
            {/* Top Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200">
              {/* Results Count & Mobile Filter Trigger */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(true)}
                  className="lg:hidden inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-neutral-300 bg-white text-xs sm:text-sm font-bold text-[#161616] hover:bg-neutral-50 shadow-xs cursor-pointer"
                >
                  <Icon icon="lucide:sliders-horizontal" className="size-4 text-[#027D88]" />
                  <span>Bộ lọc</span>
                  {hasActiveFilters && (
                    <span className="flex items-center justify-center size-5 rounded-full bg-[#027D88] text-[10px] font-bold text-white">
                      {selectedCategories.length + selectedPrices.length + selectedLevels.length}
                    </span>
                  )}
                </button>

                <p className="text-xs sm:text-sm text-neutral-600">
                  {isLoading ? (
                    'Đang tìm kiếm...'
                  ) : totalResults > 0 ? (
                    <>
                      Hiển thị <span className="font-bold text-[#161616]">{startItem}</span> -{' '}
                      <span className="font-bold text-[#161616]">{endItem}</span> trên{' '}
                      <span className="font-bold text-[#161616]">{totalResults}</span> khóa học
                    </>
                  ) : (
                    '0 khóa học'
                  )}
                </p>
              </div>

              {/* Sorting Component */}
              <CourseCatalogSort
                currentSort={sortParam}
                onSortChange={handleSortChange}
              />
            </div>

            {/* Active Filter Chips */}
            <CourseCatalogActiveChips
              searchQuery={qParam}
              onClearSearch={handleClearSearch}
              selectedCategories={selectedCategories}
              onRemoveCategory={handleToggleCategory}
              selectedPrices={selectedPrices}
              onRemovePrice={handleTogglePrice}
              selectedLevels={selectedLevels}
              onRemoveLevel={handleToggleLevel}
              onClearAll={handleResetAll}
            />

            {/* Course Cards Grid */}
            <div className="mt-6">
              {isLoading ? (
                /* Skeleton Loading Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-neutral-200 bg-white p-4 space-y-4 animate-pulse"
                    >
                      <div className="aspect-video w-full rounded-md bg-neutral-200" />
                      <div className="h-4 w-3/4 bg-neutral-200 rounded" />
                      <div className="h-3 w-1/2 bg-neutral-200 rounded" />
                      <div className="h-8 w-full bg-neutral-200 rounded mt-4" />
                    </div>
                  ))}
                </div>
              ) : data && data.items.length > 0 ? (
                /* Verified Results Grid */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {data.items.map((course) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>

                  {/* Pagination Component */}
                  <CourseCatalogPagination
                    currentPage={data.page}
                    totalPages={data.totalPages}
                    onPageChange={handlePageChange}
                  />
                </>
              ) : (
                /* Empty Results State */
                <CourseCatalogEmpty onResetFilters={handleResetAll} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Mobile Filter Drawer / Sheet (Slide-over) */}
      {mobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Bộ lọc tìm kiếm khóa học"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative ml-auto w-full max-w-xs sm:max-w-sm h-full shadow-2xl z-10">
            <CourseCatalogFilters
              selectedCategories={selectedCategories}
              onToggleCategory={handleToggleCategory}
              selectedPrices={selectedPrices}
              onTogglePrice={handleTogglePrice}
              selectedLevels={selectedLevels}
              onToggleLevel={handleToggleLevel}
              onResetAll={handleResetAll}
              hasActiveFilters={hasActiveFilters}
              totalResults={totalResults}
              isMobileDrawer={true}
              onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

