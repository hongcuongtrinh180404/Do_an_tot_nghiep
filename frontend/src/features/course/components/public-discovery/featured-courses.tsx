'use client';

import React from 'react';
import { Icon } from '@/components/ui/icon';
import { CourseCard } from './course-card';
import { MOCK_PUBLIC_COURSES } from './mock-discovery-data';

export function FeaturedCourses(): React.JSX.Element {
  const featuredCourses = MOCK_PUBLIC_COURSES.filter((c) => c.isFeatured);

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
          
          <a
            href="#recent"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#161616] hover:underline shrink-0"
          >
            <span>Xem tất cả khóa học</span>
            <Icon icon="lucide:arrow-down" className="size-4" />
          </a>
        </div>

        {/* Featured Courses Grid: 3 columns on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredCourses.map((course, idx) => (
            <div key={course.id} className={`taste-enter taste-enter-delay-${idx + 1}`}>
              <CourseCard course={course} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
