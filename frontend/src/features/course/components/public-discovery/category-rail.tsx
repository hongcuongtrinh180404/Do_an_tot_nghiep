'use client';

import React from 'react';
import { Icon } from '@/components/ui/icon';
import type { ICourseCategory } from 'share-lib';
import { usePublicCategoriesQuery } from '../../api/course-category.api';

interface CategoryRailProps {
  selectedCategorySlug: string;
  onSelectCategory: (slug: string) => void;
}

export function CategoryRail({
  selectedCategorySlug,
  onSelectCategory,
}: CategoryRailProps): React.JSX.Element {
  const { data: categories, isLoading, isError, refetch } = usePublicCategoriesQuery();

  const totalCourses = React.useMemo(
    () => (categories ?? []).reduce((sum, category) => sum + (category.courseCount ?? 0), 0),
    [categories],
  );

  const railCategories = React.useMemo<ICourseCategory[]>(
    () => [
      {
        id: 'cat-all',
        name: 'Tất cả lĩnh vực',
        slug: 'all',
        imageUrl: null,
        order: -1,
        isActive: true,
        courseCount: totalCourses,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
      ...(categories ?? []),
    ],
    [categories, totalCourses],
  );

  return (
    <section id="categories" className="w-full bg-background py-10">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col mb-5 gap-1.5 taste-enter">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#161616]">
              Khám phá theo lĩnh vực chuyên môn
            </h2>
            <span className="rounded-full bg-[#f2f2f2] px-2.5 py-0.5 text-xs text-[#161616] font-semibold border border-[#e8e8e8]">
              {isLoading ? 'Đang tải...' : `${totalCourses} khóa học sẵn có`}
            </span>
          </div>
          <p className="text-base text-[#161616]">
            Tuyển tập các khóa học video chất lượng cao tích hợp bộ công cụ trợ lý AI
          </p>
        </div>

        {/* Categories Rail List */}
        <div
          data-ui="category-rail"
          role="tablist"
          aria-label="Danh mục khóa học"
          className="flex w-full max-w-full items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none"
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <span
                  key={index}
                  className="h-10 w-36 shrink-0 animate-pulse rounded-lg bg-[#f2f2f2] border border-[#e8e8e8]"
                />
              ))
            : null}

          {!isLoading
            ? railCategories.map((category) => {
                const isSelected = selectedCategorySlug === category.slug;
                return (
                  <button
                    key={category.id}
                    role="tab"
                    aria-selected={isSelected}
                    type="button"
                    onClick={() => onSelectCategory(category.slug)}
                    className={`group flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-[#313131] text-white font-bold'
                        : 'bg-[#f2f2f2] text-[#161616] hover:bg-[#e8e8e8] border border-[#e8e8e8]'
                    }`}
                  >
                    {category.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={category.imageUrl}
                        alt=""
                        className={`size-5 rounded object-contain bg-white/80 ${
                          isSelected ? 'ring-1 ring-white/30' : ''
                        }`}
                      />
                    ) : (
                      <Icon
                        icon={category.slug === 'all' ? 'lucide:sparkles' : 'lucide:shapes'}
                        className={`size-4 ${
                          isSelected
                            ? 'text-white'
                            : 'text-[#666666] group-hover:text-[#161616]'
                        }`}
                      />
                    )}
                    <span>{category.name}</span>
                    <span
                      className={`ml-1 text-xs rounded px-1.5 py-0.5 ${
                        isSelected
                          ? 'bg-white/20 text-white font-semibold'
                          : 'bg-white text-[#666666]'
                      }`}
                    >
                      {category.courseCount ?? 0}
                    </span>
                  </button>
                );
              })
            : null}

          {isError ? (
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              className="group flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-colors shrink-0 bg-[#f2f2f2] text-[#161616] hover:bg-[#e8e8e8] border border-[#e8e8e8]"
            >
              <Icon icon="lucide:refresh-cw" className="size-4 text-[#666666]" />
              <span>Không tải được danh mục. Thử lại</span>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
