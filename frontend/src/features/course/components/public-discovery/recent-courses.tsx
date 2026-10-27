'use client';

import React, { useMemo, useState } from 'react';
import { CourseLevelEnum } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { CourseCard } from './course-card';
import { MOCK_PUBLIC_COURSES, type IPublicCourseCard } from './mock-discovery-data';

interface RecentCoursesProps {
  selectedCategorySlug: string;
  searchQuery?: string;
  onClearFilters: () => void;
}

type SortOption = 'newest' | 'rating' | 'students';

export function RecentCourses({
  selectedCategorySlug,
  searchQuery = '',
  onClearFilters,
}: RecentCoursesProps): React.JSX.Element {
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Filter & Sort Logic
  const filteredCourses = useMemo(() => {
    return MOCK_PUBLIC_COURSES.filter((course: IPublicCourseCard) => {
      // Category filter
      if (selectedCategorySlug !== 'all' && course.categorySlug !== selectedCategorySlug) {
        return false;
      }
      // Level filter
      if (selectedLevel !== 'all' && course.level !== selectedLevel) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = course.title.toLowerCase().includes(query);
        const matchInstructor = course.instructorName.toLowerCase().includes(query);
        const matchDesc = (course.shortDescription ?? '').toLowerCase().includes(query);
        if (!matchTitle && !matchInstructor && !matchDesc) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      if (sortBy === 'students') {
        return b.studentCount - a.studentCount;
      }
      // newest default
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [selectedCategorySlug, selectedLevel, searchQuery, sortBy]);

  return (
    <section id="recent" className="w-full bg-background py-14">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-4 taste-enter">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#161616]">
              Khóa học mới nhất trên Mindly
            </h2>
            <p className="text-base text-[#161616] mt-1">
              Cập nhật liên tục các bài học chuyên môn mới nhất theo xu hướng công nghệ
            </p>
          </div>

          {/* Controls: Level filter & Sort dropdown */}
          <div data-ui="filters" className="flex flex-wrap items-center gap-3">
            {/* Level Selector */}
            <div className="flex items-center gap-1 rounded-lg bg-muted/70 p-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedLevel('all')}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  selectedLevel === 'all'
                    ? 'bg-[#161616] text-white font-semibold'
                    : 'text-[#666666] hover:text-[#161616]'
                }`}
              >
                Mọi trình độ
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevel(CourseLevelEnum.BEGINNER)}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  selectedLevel === CourseLevelEnum.BEGINNER
                    ? 'bg-[#161616] text-white font-semibold'
                    : 'text-[#666666] hover:text-[#161616]'
                }`}
              >
                Cơ bản
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevel(CourseLevelEnum.INTERMEDIATE)}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  selectedLevel === CourseLevelEnum.INTERMEDIATE
                    ? 'bg-[#161616] text-white font-semibold'
                    : 'text-[#666666] hover:text-[#161616]'
                }`}
              >
                Trung cấp
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevel(CourseLevelEnum.ADVANCED)}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  selectedLevel === CourseLevelEnum.ADVANCED
                    ? 'bg-[#161616] text-white font-semibold'
                    : 'text-[#666666] hover:text-[#161616]'
                }`}
              >
                Nâng cao
              </button>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#666666] hidden sm:inline">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-[#161616] focus:outline-none focus:ring-1 focus:ring-[#F02D01]"
              >
                <option value="newest">Mới nhất</option>
                <option value="rating">Đánh giá cao nhất</option>
                <option value="students">Nhiều học viên nhất</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Indicator Tag */}
        {(selectedCategorySlug !== 'all' || selectedLevel !== 'all' || searchQuery.trim()) && (
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#666666]">Đang lọc theo:</span>
            {selectedCategorySlug !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded bg-[#f2f2f2] px-2 py-0.5 text-[#161616] font-medium">
                Lĩnh vực: {selectedCategorySlug}
              </span>
            )}
            {selectedLevel !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded bg-[#f2f2f2] px-2 py-0.5 text-[#161616] font-medium">
                Cấp độ: {selectedLevel}
              </span>
            )}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 rounded bg-[#f2f2f2] px-2 py-0.5 text-[#161616] font-medium">
                Từ khóa: &quot;{searchQuery}&quot;
              </span>
            )}
            <button
              type="button"
              onClick={onClearFilters}
              className="text-[#F02D01] hover:underline font-semibold ml-2"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        )}

        {/* Course Grid: 3 columns on desktop, 2 on tablet, 1 on mobile */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-12 text-center my-6">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#f2f2f2] text-[#666666] mb-3">
              <Icon icon="lucide:search-x" className="size-6" />
            </div>
            <h3 className="text-base font-semibold text-[#161616]">Không tìm thấy khóa học phù hợp</h3>
            <p className="text-xs sm:text-sm text-[#666666] mt-1 max-w-sm mx-auto">
              Không có khóa học nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại của bạn.
            </p>
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-4 rounded-lg bg-[#F02D01] px-4 py-2 text-xs font-semibold text-white hover:bg-[#de2900] transition-colors"
            >
              Xem tất cả khóa học
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
