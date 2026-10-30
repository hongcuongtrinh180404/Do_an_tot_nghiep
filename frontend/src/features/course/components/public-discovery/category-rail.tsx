'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import type { ICourseCategory } from 'share-lib';
import { usePublicCategoriesQuery } from '../../api/course-category.api';

interface CategoryRailProps {
  selectedCategorySlug: string;
  onSelectCategory: (slug: string) => void;
}

/**
 * Editorial curated fallback photography (1:1 ratio, anti-slop)
 * Mapped to actual database category slugs when imageUrl is null
 */
const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  // Programming & Technology
  'lap-trinh': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&h=600&q=80',
  'cong-nghe-thong-tin': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&h=600&q=80',
  'lap-trinh-ky-thuat': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&h=600&q=80',

  // AI & Data Science
  'ai-data': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&h=600&q=80',
  'ai': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&h=600&q=80',
  'tri-tue-nhan-tao': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&h=600&q=80',

  // UI/UX & Graphic Design
  'thiet-ke': 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&h=600&q=80',
  'thiet-ke-do-hoa': 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&h=600&q=80',
  'thiet-ke-ui-ux': 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&h=600&q=80',

  // Video Editing & Multimedia
  'dung-video': 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&h=600&q=80',
  'video': 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&h=600&q=80',
  'da-phuong-tien': 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&h=600&q=80',

  // Business & Marketing
  'kinh-doanh': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&h=600&q=80',
  'marketing': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&h=600&q=80',
  'kinh-doanh-marketing': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&h=600&q=80',

  // Finance & Investment
  'tai-chinh': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&h=600&q=80',
  'tai-chinh-dau-tu': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&h=600&q=80',

  // Languages & Soft Skills
  'ngoai-ngu': 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&h=600&q=80',
  'ngoai-ngu-ky-nang': 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&h=600&q=80',
  'ky-nang-mem': 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&h=600&q=80',
};

const DEFAULT_CATEGORY_FALLBACK =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&h=600&q=80';

function resolveCategoryImage(category: ICourseCategory): string {
  if (category.imageUrl && category.imageUrl.trim() !== '') {
    return category.imageUrl;
  }
  const slug = (category.slug || '').toLowerCase();
  if (CATEGORY_FALLBACK_IMAGES[slug]) {
    return CATEGORY_FALLBACK_IMAGES[slug];
  }
  for (const [key, url] of Object.entries(CATEGORY_FALLBACK_IMAGES)) {
    if (slug.includes(key) || key.includes(slug)) {
      return url;
    }
  }
  return DEFAULT_CATEGORY_FALLBACK;
}

export function CategoryRail({
  selectedCategorySlug,
  onSelectCategory,
}: CategoryRailProps): React.JSX.Element {
  const { data: categories = [], isLoading, isError, refetch } = usePublicCategoriesQuery();

  const totalCourses = React.useMemo(
    () => categories.reduce((sum, category) => sum + (category.courseCount ?? 0), 0),
    [categories],
  );

  return (
    <section id="categories" className="w-full bg-background py-10 md:py-14">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#161616]">
                Khám phá theo lĩnh vực chuyên môn
              </h2>
              <span className="text-xs sm:text-sm text-neutral-500 font-medium">
                {isLoading ? 'Đang tải...' : `${totalCourses} khóa học sẵn có`}
              </span>
            </div>
            <p className="mt-1 text-sm sm:text-base text-neutral-600">
              Tuyển tập các khóa học video chất lượng cao tích hợp bộ công cụ trợ lý AI
            </p>
          </div>

          {selectedCategorySlug !== 'all' ? (
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="self-start md:self-auto inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-800 hover:text-black underline underline-offset-4 transition-colors"
            >
              <Icon icon="lucide:rotate-ccw" className="size-3.5" />
              <span>Xem tất cả lĩnh vực</span>
            </button>
          ) : null}
        </div>

        {/* 6-column Responsive Grid (Domestika 1:1 Aspect Ratio Style) */}
        <div
          data-ui="category-grid"
          role="region"
          aria-label="Danh sách lĩnh vực chuyên môn"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5 p-1"
        >
          {/* Skeleton Loaders (6 cards) */}
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="w-full aspect-square rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 animate-pulse shadow-[0_8px_20px_rgba(0,0,0,0.06)]"
              />
            ))
            : null}

          {/* Actual Database Category Cards */}
          {!isLoading && categories.length > 0
            ? categories.map((category) => {
              const isSelected = selectedCategorySlug === category.slug;
              const imageUrl = resolveCategoryImage(category);

              return (
                <Link
                  key={category.id}
                  href={`/?category=${category.slug}#recent`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectCategory(category.slug);
                  }}
                  aria-label={`Khám phá danh mục ${category.name}`}
                  aria-selected={isSelected}
                  className={`group relative w-full aspect-square rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2 ${isSelected
                      ? 'shadow-[0_16px_36px_rgba(0,0,0,0.18),0_4px_16px_rgba(0,0,0,0.08)] -translate-y-1'
                      : 'shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_32px_rgba(0,0,0,0.14),0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-1'
                    }`}
                >
                  {/* Background Artwork */}
                  <Image
                    src={imageUrl}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-cover size-full transform transition-transform duration-500 ease-out group-hover:scale-105"
                  />

                  {/* Gentle bottom scrim overlay for text contrast (reduced >50%, bright inside) */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 via-black/15 to-transparent transition-opacity"
                  />

                  {/* Active Selected Check Indicator */}
                  {isSelected ? (
                    <div className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center size-6 rounded-full bg-white text-[#161616] shadow-sm">
                      <Icon icon="lucide:check" className="size-3.5 stroke-[2.5]" />
                    </div>
                  ) : null}

                  {/* Category Name at Bottom-Left */}
                  <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 z-10 flex flex-col justify-end">
                    <h3 className="text-white text-xs sm:text-sm md:text-base font-semibold leading-snug tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] line-clamp-2">
                      {category.name}
                    </h3>
                  </div>
                </Link>
              );
            })
            : null}

          {/* Empty State */}
          {!isLoading && categories.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-neutral-500 rounded-2xl border border-dashed border-neutral-300">
              <Icon icon="lucide:folder-open" className="size-10 mb-2 text-neutral-400" />
              <p className="text-sm">Chưa có danh mục nào được kích hoạt.</p>
            </div>
          ) : null}

          {/* Error State */}
          {isError ? (
            <div className="col-span-full py-8 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-neutral-600 mb-3">Không thể tải danh sách lĩnh vực chuyên môn.</p>
              <button
                type="button"
                onClick={() => {
                  void refetch();
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition-colors"
              >
                <Icon icon="lucide:refresh-cw" className="size-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
