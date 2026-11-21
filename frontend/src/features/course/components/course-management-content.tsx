'use client';

import React, { useMemo, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { CourseStatusEnum } from 'share-lib';
import { useMyCoursesQuery } from '../api/course.api';
import { CourseHeader } from './course-header';
import { CourseEmptyState } from './course-empty-state';
import { CourseCard } from './course-card';
import { CourseListSkeleton } from './course-card-skeleton';

type StatusFilter = 'ALL' | CourseStatusEnum;
type SortOption = 'created-desc' | 'created-asc' | 'students-desc' | 'title-asc';

export function CourseManagementContent(): React.JSX.Element {
  const { data: courses, isLoading, isError, refetch } = useMyCoursesQuery();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('created-desc');

  // Stats calculation
  const stats = useMemo(() => {
    if (!courses) {
      return { total: 0, published: 0, pending: 0, draft: 0, archived: 0, students: 0 };
    }
    return {
      total: courses.length,
      published: courses.filter((c) => c.status === CourseStatusEnum.PUBLISHED).length,
      pending: courses.filter((c) => c.status === CourseStatusEnum.PENDING_APPROVAL).length,
      draft: courses.filter((c) => c.status === CourseStatusEnum.DRAFT).length,
      archived: courses.filter((c) => c.status === CourseStatusEnum.ARCHIVED).length,
      students: courses.reduce((sum, c) => sum + (c.studentsCount ?? 0), 0),
    };
  }, [courses]);

  // Filtering and sorting
  const filteredCourses = useMemo(() => {
    if (!courses) return [];

    return courses
      .filter((course) => {
        // Status filter
        if (selectedStatus !== 'ALL' && course.status !== selectedStatus) {
          return false;
        }

        // Search text
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = course.title.toLowerCase().includes(q);
          const matchCategory = course.category?.name.toLowerCase().includes(q) ?? false;
          const matchSlug = course.slug.toLowerCase().includes(q);

          if (!matchTitle && !matchCategory && !matchSlug) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'created-asc') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'students-desc') {
          return (b.studentsCount ?? 0) - (a.studentsCount ?? 0);
        }
        if (sortBy === 'title-asc') {
          return a.title.localeCompare(b.title);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [courses, selectedStatus, searchQuery, sortBy]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedStatus !== 'ALL' || sortBy !== 'created-desc';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setSortBy('created-desc');
  };

  return (
    <div className="w-full max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <CourseHeader />

      {isLoading ? (
        <CourseListSkeleton />
      ) : isError ? (
        <Card className="border-destructive/30 bg-destructive/5 p-6 rounded-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Icon icon="lucide:alert-circle" className="size-5 shrink-0 text-destructive" />
              <div>
                <h4 className="font-semibold text-sm text-foreground">
                  Không thể tải danh sách khóa học
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Đã xảy ra lỗi khi tải dữ liệu từ máy chủ. Vui lòng thử lại sau.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <Icon icon="lucide:refresh-cw" className="size-3.5 mr-1.5" />
              Thử lại
            </button>
          </div>
        </Card>
      ) : !courses || courses.length === 0 ? (
        <CourseEmptyState />
      ) : (
        <>
          {/* 1. Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Total Courses */}
            <div
              role="button"
              tabIndex={0}
              aria-label={`Lọc tất cả khóa học, hiện có ${stats.total} khóa học`}
              aria-pressed={selectedStatus === 'ALL'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedStatus('ALL');
                }
              }}
              onClick={() => setSelectedStatus('ALL')}
              className={`cursor-pointer p-4 rounded-xl border transition-all select-none bg-white dark:bg-card flex flex-col justify-between ${selectedStatus === 'ALL'
                  ? 'border-neutral-900 dark:border-white ring-1 ring-neutral-900/10'
                  : 'border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Tổng khóa học</span>
                <div className="size-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400">
                  <Icon icon="lucide:book-open" className="size-3.5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.total}</div>
            </div>

            {/* Published */}
            <div
              role="button"
              tabIndex={0}
              aria-label={`Lọc khóa học đang xuất bản, hiện có ${stats.published} khóa học`}
              aria-pressed={selectedStatus === CourseStatusEnum.PUBLISHED}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedStatus(CourseStatusEnum.PUBLISHED);
                }
              }}
              onClick={() => setSelectedStatus(CourseStatusEnum.PUBLISHED)}
              className={`cursor-pointer p-4 rounded-xl border transition-all select-none bg-white dark:bg-card flex flex-col justify-between ${selectedStatus === CourseStatusEnum.PUBLISHED
                  ? 'border-emerald-500 ring-1 ring-emerald-500/20'
                  : 'border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Đang xuất bản</span>
                <div className="size-6 rounded-md bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Icon icon="lucide:check-circle-2" className="size-3.5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.published}
              </div>
            </div>

            {/* Pending Approval */}
            <div
              role="button"
              tabIndex={0}
              aria-label={`Lọc khóa học chờ duyệt, hiện có ${stats.pending} khóa học`}
              aria-pressed={selectedStatus === CourseStatusEnum.PENDING_APPROVAL}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedStatus(CourseStatusEnum.PENDING_APPROVAL);
                }
              }}
              onClick={() => setSelectedStatus(CourseStatusEnum.PENDING_APPROVAL)}
              className={`cursor-pointer p-4 rounded-xl border transition-all select-none bg-white dark:bg-card flex flex-col justify-between ${selectedStatus === CourseStatusEnum.PENDING_APPROVAL
                  ? 'border-sky-500 ring-1 ring-sky-500/20'
                  : 'border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Chờ duyệt</span>
                <div className="size-6 rounded-md bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <Icon icon="lucide:clock" className="size-3.5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-sky-600 dark:text-sky-400">
                {stats.pending}
              </div>
            </div>

            {/* Draft */}
            <div
              role="button"
              tabIndex={0}
              aria-label={`Lọc khóa học bản nháp, hiện có ${stats.draft} khóa học`}
              aria-pressed={selectedStatus === CourseStatusEnum.DRAFT}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedStatus(CourseStatusEnum.DRAFT);
                }
              }}
              onClick={() => setSelectedStatus(CourseStatusEnum.DRAFT)}
              className={`cursor-pointer p-4 rounded-xl border transition-all select-none bg-white dark:bg-card flex flex-col justify-between ${selectedStatus === CourseStatusEnum.DRAFT
                  ? 'border-amber-500 ring-1 ring-amber-500/20'
                  : 'border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Bản nháp</span>
                <div className="size-6 rounded-md bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Icon icon="lucide:file-edit" className="size-3.5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.draft}
              </div>
            </div>

            {/* Archived / Ngừng bán */}
            <div
              role="button"
              tabIndex={0}
              aria-label={`Lọc khóa học ngừng bán, hiện có ${stats.archived} khóa học`}
              aria-pressed={selectedStatus === CourseStatusEnum.ARCHIVED}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedStatus(CourseStatusEnum.ARCHIVED);
                }
              }}
              onClick={() => setSelectedStatus(CourseStatusEnum.ARCHIVED)}
              className={`cursor-pointer p-4 rounded-xl border transition-all select-none bg-white dark:bg-card flex flex-col justify-between ${selectedStatus === CourseStatusEnum.ARCHIVED
                  ? 'border-neutral-600 ring-1 ring-neutral-600/20'
                  : 'border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Ngừng bán</span>
                <div className="size-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400">
                  <Icon icon="lucide:pause-circle" className="size-3.5" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-neutral-700 dark:text-neutral-300">
                {stats.archived}
              </div>
            </div>
          </div>

          {/* 2. Filter & Search Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Icon
                icon="lucide:search"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-400"
              />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm khóa học theo tên, slug hoặc danh mục..."
                aria-label="Tìm kiếm khóa học theo tên, slug hoặc danh mục"
                className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-white dark:bg-neutral-900 border-neutral-200/90 dark:border-neutral-800 rounded-lg shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Xóa nội dung tìm kiếm"
                  title="Xóa tìm kiếm"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <Icon icon="lucide:x" className="size-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Tabs & Sort Dropdown */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter Tabs */}
              <div
                role="tablist"
                aria-label="Bộ lọc trạng thái khóa học"
                className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-xs"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedStatus === 'ALL'}
                  onClick={() => setSelectedStatus('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${selectedStatus === 'ALL'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                    }`}
                >
                  Tất cả ({stats.total})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedStatus === CourseStatusEnum.PUBLISHED}
                  onClick={() => setSelectedStatus(CourseStatusEnum.PUBLISHED)}
                  className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${selectedStatus === CourseStatusEnum.PUBLISHED
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                    }`}
                >
                  Đã xuất bản ({stats.published})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedStatus === CourseStatusEnum.PENDING_APPROVAL}
                  onClick={() => setSelectedStatus(CourseStatusEnum.PENDING_APPROVAL)}
                  className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${selectedStatus === CourseStatusEnum.PENDING_APPROVAL
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                    }`}
                >
                  Chờ duyệt ({stats.pending})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedStatus === CourseStatusEnum.DRAFT}
                  onClick={() => setSelectedStatus(CourseStatusEnum.DRAFT)}
                  className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${selectedStatus === CourseStatusEnum.DRAFT
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                    }`}
                >
                  Bản nháp ({stats.draft})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedStatus === CourseStatusEnum.ARCHIVED}
                  onClick={() => setSelectedStatus(CourseStatusEnum.ARCHIVED)}
                  className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${selectedStatus === CourseStatusEnum.ARCHIVED
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                    }`}
                >
                  Ngừng bán ({stats.archived})
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="w-44 shrink-0">
                <Select<SortOption>
                  value={sortBy}
                  onValueChange={(val) => {
                    if (val) setSortBy(val);
                  }}
                >
                  <SelectTrigger aria-label="Sắp xếp danh sách khóa học" className="h-8 text-xs px-2.5">
                    <span className="truncate">
                      {sortBy === 'created-asc'
                        ? 'Cũ nhất trước'
                        : sortBy === 'students-desc'
                          ? 'Nhiều học viên nhất'
                          : sortBy === 'title-asc'
                            ? 'Tên A-Z'
                            : 'Mới nhất trước'}
                    </span>
                  </SelectTrigger>
                  <SelectContent align="end" className="min-w-44">
                    <SelectItem value="created-desc" className="text-xs">Mới nhất trước</SelectItem>
                    <SelectItem value="created-asc" className="text-xs">Cũ nhất trước</SelectItem>
                    <SelectItem value="students-desc" className="text-xs">Nhiều học viên nhất</SelectItem>
                    <SelectItem value="title-asc" className="text-xs">Tên A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Filter Button (if active) */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  aria-label="Đặt lại tất cả bộ lọc về mặc định"
                  className="h-8 px-2.5 text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="Đặt lại tất cả bộ lọc"
                >
                  <Icon icon="lucide:rotate-ccw" className="size-3" />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Courses List or Empty Filter State */}
          {filteredCourses.length === 0 ? (
            <Card className="p-12 text-center border-dashed rounded-xl bg-white dark:bg-card">
              <div className="size-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-500">
                <Icon icon="lucide:search-x" className="size-6" />
              </div>
              <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Không tìm thấy khóa học nào phù hợp
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                Không có khóa học nào khớp với từ khóa tìm kiếm hoặc bộ lọc trạng thái hiện tại.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={resetFilters}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <Icon icon="lucide:rotate-ccw" className="size-3.5 mr-1.5" />
                  Xóa bộ lọc
                </button>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
