'use client';

import * as React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useMyCoursesQuery } from '@/features/course/api/course.api';
import {
  useTeachingOverviewQuery,
  useCoursesRevenueQuery,
  useInstructorReviewStatsQuery,
  useInstructorReviewsQuery,
} from '../api/teaching-stats.api';
import {
  TeachingRevenueTimeFilter,
  type TeachingTimeFilterValue,
} from './teaching-revenue-time-filter';
import { TeachingOverviewCards } from './teaching-overview-cards';
import { CourseRevenueTable } from './course-revenue-table';
import { TeachingReviewStatsSection } from './teaching-review-stats-section';
import { TeachingRecentReviewsSection } from './teaching-recent-reviews-section';

export function TeachingStatsView(): React.JSX.Element {
  // 1. Time Filter State (Defaults to 'all' as requested)
  const [timeFilter, setTimeFilter] = React.useState<TeachingTimeFilterValue>({
    timeRange: 'all',
  });

  // 2. Course Revenue Table State
  const [courseSearch, setCourseSearch] = React.useState('');
  const [courseSort, setCourseSort] = React.useState<
    'revenue_desc' | 'earnings_desc' | 'sales_desc'
  >('revenue_desc');
  const [coursePage, setCoursePage] = React.useState(1);

  // 3. Review Stats & Recent Reviews State
  const [selectedReviewCourseId, setSelectedReviewCourseId] = React.useState('all');
  const [recentReviewsCourseId, setRecentReviewsCourseId] = React.useState('all');
  const [recentReviewsRating, setRecentReviewsRating] = React.useState<number | undefined>(undefined);
  const [recentReviewsSort, setRecentReviewsSort] = React.useState<
    'created_desc' | 'created_asc'
  >('created_desc');
  const [recentReviewsPage, setRecentReviewsPage] = React.useState(1);

  // Queries
  const { data: myCourses = [], isLoading: isCoursesLoading } = useMyCoursesQuery();

  // Section 1: Overview Query
  const overviewQuery = useTeachingOverviewQuery({
    timeRange: timeFilter.timeRange,
  });

  // Section 2: Courses Revenue Query
  const coursesRevenueQuery = useCoursesRevenueQuery({
    timeRange: timeFilter.timeRange,
    search: courseSearch,
    sort: courseSort,
    page: coursePage,
    limit: 10,
  });

  // Section 3: Review Stats Query
  const reviewStatsQuery = useInstructorReviewStatsQuery(
    selectedReviewCourseId === 'all' ? undefined : selectedReviewCourseId,
  );

  // Section 4: Recent Reviews Query
  const recentReviewsQuery = useInstructorReviewsQuery({
    courseId: recentReviewsCourseId === 'all' ? undefined : recentReviewsCourseId,
    rating: recentReviewsRating,
    sort: recentReviewsSort,
    page: recentReviewsPage,
    limit: 10,
  });

  // Handle time filter change: reset course page to 1
  const handleTimeFilterChange = (newVal: TeachingTimeFilterValue) => {
    setTimeFilter(newVal);
    setCoursePage(1);
  };

  return (
    <div className="w-full max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* ========================================================================= */}
      {/* TOP HEADER: Breadcrumbs, Title & Time Filter                               */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <Link
              href="/"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Icon icon="lucide:home" className="size-3.5" />
              <span>Trang chủ</span>
            </Link>
            <span>/</span>
            <Link
              href="/courses"
              className="hover:text-foreground transition-colors"
            >
              Khóa học của tôi
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Thống kê giảng dạy</span>
          </div>

          {/* Title & Subtitle */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Thống kê giảng dạy
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-2xl">
            Theo dõi doanh thu, thu nhập thực nhận sau hoa hồng, số lượt mua và chất lượng đào tạo qua phản hồi học viên.
          </p>
        </div>

        {/* Action Buttons & Time Range Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <Link href="/courses">
            <Button variant="outline" size="sm" className="h-9 text-xs">
              <Icon icon="lucide:arrow-left" className="size-3.5 mr-1.5" />
              Quản lý khóa học
            </Button>
          </Link>
          <TeachingRevenueTimeFilter
            value={timeFilter}
            onChange={handleTimeFilterChange}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KHU VỰC 1: TỔNG QUAN (4 KPI Cards)                                        */}
      {/* ========================================================================= */}
      <section aria-labelledby="section-overview-title" className="space-y-3">
        <h2 id="section-overview-title" className="sr-only">
          Tổng quan số liệu giảng dạy
        </h2>
        <TeachingOverviewCards
          overview={overviewQuery.data}
          isLoading={overviewQuery.isLoading}
        />
      </section>

      {/* ========================================================================= */}
      {/* KHU VỰC 2: DOANH THU THEO KHÓA HỌC                                        */}
      {/* ========================================================================= */}
      <section aria-labelledby="section-courses-revenue">
        <CourseRevenueTable
          data={coursesRevenueQuery.data}
          isLoading={coursesRevenueQuery.isLoading}
          search={courseSearch}
          onSearchChange={setCourseSearch}
          sort={courseSort}
          onSortChange={setCourseSort}
          page={coursePage}
          onPageChange={setCoursePage}
        />
      </section>

      {/* ========================================================================= */}
      {/* KHU VỰC 3: THỐNG KÊ ĐÁNH GIÁ                                              */}
      {/* ========================================================================= */}
      <section aria-labelledby="section-review-stats">
        <TeachingReviewStatsSection
          stats={reviewStatsQuery.data}
          isLoading={reviewStatsQuery.isLoading || isCoursesLoading}
          courses={myCourses}
          selectedCourseId={selectedReviewCourseId}
          onCourseChange={setSelectedReviewCourseId}
        />
      </section>

      {/* ========================================================================= */}
      {/* KHU VỰC 4: ĐÁNH GIÁ GẦN ĐÂY                                               */}
      {/* ========================================================================= */}
      <section aria-labelledby="section-recent-reviews">
        <TeachingRecentReviewsSection
          data={recentReviewsQuery.data}
          isLoading={recentReviewsQuery.isLoading || isCoursesLoading}
          courses={myCourses}
          selectedCourseId={recentReviewsCourseId}
          onCourseChange={setRecentReviewsCourseId}
          selectedRating={recentReviewsRating}
          onRatingChange={setRecentReviewsRating}
          sort={recentReviewsSort}
          onSortChange={setRecentReviewsSort}
          page={recentReviewsPage}
          onPageChange={setRecentReviewsPage}
        />
      </section>
    </div>
  );
}
