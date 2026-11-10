'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { CourseCard } from './course-card';
import { usePublicCoursesCatalogQuery } from '../../api/public-courses.api';

export function FeaturedCourses(): React.JSX.Element {
  const { data, isLoading } = usePublicCoursesCatalogQuery({
    limit: 8,
    sort: 'popular',
  });

  const featuredCourses = data?.items || [];

  return (
    <section id="featured" className="w-full bg-background py-14">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3 taste-enter">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#161616]">
              Khóa học nổi bật được cộng đồng đánh giá cao
            </h2>
            <p className="text-base text-[#161616] mt-1 max-w-2xl">
              Được giảng dạy bởi các chuyên gia đầu ngành với giáo trình thực chiến và tích hợp đầy đủ tính năng tóm tắt thông minh.
            </p>
          </div>

          <Link
            href="/courses?view=catalog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#161616] hover:text-[#027D88] hover:underline shrink-0 transition-colors"
          >
            <span>Xem tất cả khóa học</span>
            <Icon icon="lucide:arrow-right" className="size-4" />
          </Link>
        </div>

        {/* Featured Courses Grid: 4 columns on desktop */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="h-80 w-full animate-pulse rounded-lg border border-[#e5e7eb] bg-muted/40"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredCourses.map((course, idx) => (
              <div key={course.id} className={`taste-enter taste-enter-delay-${idx + 1}`}>
                <CourseCard course={course} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
