'use client';

import React, { useMemo, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
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
          const matchDesc = course.shortDescription?.toLowerCase().includes(q) ?? false;
          const matchCategory = course.category?.name.toLowerCase().includes(q) ?? false;
          const matchSlug = course.slug.toLowerCase().includes(q);

          if (!matchTitle && !matchDesc && !matchCategory && !matchSlug) {
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Courses */}
            <Card
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
              className={`cursor-pointer p-3.5 rounded-xl border transition-all select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${selectedStatus === 'ALL'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border/40 bg-card/60 hover:border-border'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground font-medium">Tổng khóa học</span>
                <div className="size-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                  <Icon icon="lucide:book-open" className="size-3.5" />
                </div>
              </div>
              <div className="mt-2 text-xl font-bold text-foreground">{stats.total}</div>
            </Card>

            {/* Published */}
            <Card
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
              className={`cursor-pointer p-3.5 rounded-xl border transition-all select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 ${selectedStatus === CourseStatusEnum.PUBLISHED
                  ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                  : 'border-border/40 bg-card/60 hover:border-border'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground font-medium">Đang xuất bản</span>
                <div className="size-6 rounded-md bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Icon icon="lucide:check-circle-2" className="size-3.5" />
                </div>
              </div>
              <div className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.published}
              </div>
            </Card>

            {/* Pending Approval */}
            <Card
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
              className={`cursor-pointer p-3.5 rounded-xl border transition-all select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 ${selectedStatus === CourseStatusEnum.PENDING_APPROVAL
                  ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/20'
                  : 'border-border/40 bg-card/60 hover:border-border'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground font-medium">Chờ duyệt</span>
                <div className="size-6 rounded-md bg-sky-500/15 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <Icon icon="lucide:clock" className="size-3.5" />
                </div>
              </div>
              <div className="mt-2 text-xl font-bold text-sky-600 dark:text-sky-400">
                {stats.pending}
              </div>
            </Card>

            {/* Draft */}
            <Card
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
              className={`cursor-pointer p-3.5 rounded-xl border transition-all select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 ${selectedStatus === CourseStatusEnum.DRAFT
                  ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/20'
                  : 'border-border/40 bg-card/60 hover:border-border'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground font-medium">Bản nháp</span>
                <div className="size-6 rounded-md bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Icon icon="lucide:file-edit" className="size-3.5" />
                </div>
              </div>
              <div className="mt-2 text-xl font-bold text-amber-600 dark:text-amber-400">
                {stats.draft}
              </div>
            </Card>

            {/* Archived / Ngừng bán */}
            <Card
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
              className={`cursor-pointer p-3.5 rounded-xl border transition-all select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-500 ${selectedStatus === CourseStatusEnum.ARCHIVED
                  ? 'border-zinc-500 bg-zinc-500/10 ring-1 ring-zinc-500/20'
                  : 'border-border/40 bg-card/60 hover:border-border'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground font-medium">Ngừng bán</span>
                <div className="size-6 rounded-md bg-zinc-500/15 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                  <Icon icon="lucide:pause-circle" className="size-3.5" />
                </div>
              </div>
              <div className="mt-2 text-xl font-bold text-zinc-600 dark:text-zinc-400">
                {stats.archived}
              </div>
            </Card>

            {/* Total Students */}
            <Card
              className="p-3.5 rounded-xl border border-border/40 bg-card/60"
              aria-label={`Tổng số học viên đã ghi danh: ${stats.students}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground font-medium">Tổng học viên</span>
                <div className="size-6 rounded-md bg-primary/15 flex items-center justify-center text-primary">
                  <Icon icon="lucide:users" className="size-3.5" />
                </div>
              </div>
              <div className="mt-2 text-xl font-bold text-primary">{stats.students}</div>
            </Card>
          </div>

          {/* 2. Filter & Search Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-xl bg-card/60 border border-border/40">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Icon
                icon="lucide:search"
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70"
              />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm khóa học theo tên, mô tả hoặc danh mục..."
                aria-label="Tìm kiếm khóa học theo tên, mô tả hoặc danh mục"
                className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-background/80"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Xóa nội dung tìm kiếm"
                  title="Xóa tìm kiếm"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring rounded-xs"
                >
                  <Icon icon="lucide:x" className="size-3.5" />
                </button>
              )}
            </div>

            {/* Status Pills & Sort Dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter Tabs */}
              <div
                role="tablist"
                aria-label="Bộ lọc trạng thái khóa học"
                className="inline-flex max-w-full overflow-x-auto no-scrollbar items-center rounded-lg bg-muted/60 p-1 border border-border/40 text-xs"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedStatus === 'ALL'}
                  onClick={() => setSelectedStatus('ALL')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring ${selectedStatus === 'ALL'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Tất cả ({stats.total})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedStatus === CourseStatusEnum.PUBLISHED}
                  onClick={() => setSelectedStatus(CourseStatusEnum.PUBLISHED)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring ${selectedStatus === CourseStatusEnum.PUBLISHED
                      ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Đã xuất bản ({stats.published})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedStatus === CourseStatusEnum.PENDING_APPROVAL}
                  onClick={() => setSelectedStatus(CourseStatusEnum.PENDING_APPROVAL)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring ${selectedStatus === CourseStatusEnum.PENDING_APPROVAL
                      ? 'bg-background text-sky-600 dark:text-sky-400 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Chờ duyệt ({stats.pending})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedStatus === CourseStatusEnum.DRAFT}
                  onClick={() => setSelectedStatus(CourseStatusEnum.DRAFT)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring ${selectedStatus === CourseStatusEnum.DRAFT
                      ? 'bg-background text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Bản nháp ({stats.draft})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedStatus === CourseStatusEnum.ARCHIVED}
                  onClick={() => setSelectedStatus(CourseStatusEnum.ARCHIVED)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring ${selectedStatus === CourseStatusEnum.ARCHIVED
                      ? 'bg-background text-zinc-600 dark:text-zinc-400 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Ngừng bán ({stats.archived})
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-label="Sắp xếp danh sách khóa học"
                  className="h-9 px-3 pr-8 rounded-lg border border-border/40 bg-background/80 text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary cursor-pointer appearance-none"
                >
                  <option value="created-desc">Mới nhất trước</option>
                  <option value="created-asc">Cũ nhất trước</option>
                  <option value="students-desc">Nhiều học viên nhất</option>
                  <option value="title-asc">Tên A-Z</option>
                </select>
                <Icon
                  icon="lucide:chevron-down"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
                />
              </div>

              {/* Reset Filter Button (if active) */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  aria-label="Đặt lại tất cả bộ lọc về mặc định"
                  className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/60 hover:border-border rounded-lg transition-colors flex items-center gap-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  title="Đặt lại tất cả bộ lọc"
                >
                  <Icon icon="lucide:rotate-ccw" className="size-3" />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Courses Grid or Empty Filter State */}
          {filteredCourses.length === 0 ? (
            <Card className="p-12 text-center border-dashed rounded-xl bg-muted/10">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                <Icon icon="lucide:search-x" className="size-6" />
              </div>
              <h4 className="text-base font-semibold text-foreground">
                Không tìm thấy khóa học nào phù hợp
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
