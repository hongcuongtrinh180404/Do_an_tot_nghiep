'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RoleEnum } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { buttonVariants } from '@/components/ui/button';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import {
  usePublicCourseDetailQuery,
  useCheckEnrollmentQuery,
  useMockPurchaseMutation,
} from '../../api/enrollment.api';

import { CourseDetailHeader } from './course-detail-header';
import { CourseIntroMedia } from './course-intro-media';
import { CourseDetailTabs, type CourseDetailTabId } from './course-detail-tabs';
import { CourseCurriculumTab } from './course-curriculum-tab';
import { CourseMindmapTab } from './course-mindmap-tab';
import { CourseReviewsTab } from './course-reviews-tab';
import { CourseInstructorTab } from './course-instructor-tab';
import { CoursePurchaseCard } from './course-purchase-card';

interface PublicCourseDetailViewProps {
  courseId: string;
}

function formatTotalDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return 'Đang cập nhật';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} giờ ${minutes > 0 ? `${minutes} phút` : ''}`.trim();
  }
  return `${minutes} phút`;
}

export function PublicCourseDetailView({
  courseId,
}: PublicCourseDetailViewProps): React.JSX.Element {
  const router = useRouter();
  const { data: user } = useCurrentUserQuery();
  const isLoggedIn = Boolean(user);

  const [activeTab, setActiveTab] = useState<CourseDetailTabId>('curriculum');

  const {
    data: course,
    isLoading: isCourseLoading,
    isError: isCourseError,
    refetch,
  } = usePublicCourseDetailQuery(courseId);

  const { data: isEnrolled = false, isLoading: isEnrollmentLoading } = useCheckEnrollmentQuery(
    course?.id || courseId,
    isLoggedIn,
  );

  const purchaseMutation = useMockPurchaseMutation(course?.id || courseId);

  const isInstructorOwner = Boolean(
    user && course && (user.id === course.instructorId || user.role === RoleEnum.ADMIN),
  );

  const totalLessonsCount = useMemo(() => {
    if (!course?.sections) return 0;
    return course.sections.reduce((acc, s) => acc + (s.lessons?.length || 0), 0);
  }, [course]);

  const totalDurationFormatted = useMemo(() => {
    if (!course?.sections) return 'Đang cập nhật';
    const totalSeconds = course.sections.reduce((accSec, s) => {
      const secDuration = s.lessons?.reduce((accLes, l) => accLes + (l.duration || 0), 0) || 0;
      return accSec + secDuration;
    }, 0);
    return formatTotalDuration(totalSeconds);
  }, [course]);

  // Loading Skeleton State
  if (isCourseLoading) {
    return (
      <div className="w-full min-h-screen bg-[#fbfbfb] py-10 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto animate-pulse">
        <div className="h-6 w-48 bg-neutral-200 rounded mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-10 w-3/4 bg-neutral-200 rounded" />
            <div className="h-16 w-full bg-neutral-200 rounded" />
            <div className="aspect-video w-full bg-neutral-200 rounded-2xl" />
            <div className="h-64 w-full bg-neutral-200 rounded" />
          </div>
          <div className="h-96 bg-neutral-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error 404 / Failed State
  if (isCourseError || !course) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full text-center border border-[#e5e7eb] rounded-2xl bg-white p-8 shadow-xs">
          <div className="size-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <Icon icon="lucide:alert-circle" className="size-6" />
          </div>
          <h3 className="text-lg font-bold text-[#161616]">Không tìm thấy khóa học</h3>
          <p className="text-xs sm:text-sm text-[#666666] mt-2 leading-relaxed">
            Khóa học không tồn tại hoặc chưa được giảng viên công khai trên hệ thống.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/courses"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Về danh mục
            </Link>
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              className={buttonVariants({ size: 'sm' })}
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handlePurchase = (): void => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/courses/${course.id}`);
      return;
    }
    purchaseMutation.mutate();
  };

  return (
    <div className="w-full min-h-screen bg-[#fbfbfb] text-[#161616] pb-16 lg:pb-24">
      {/* Instructor / Admin Mode Alert Banner */}
      {isInstructorOwner && (
        <aside aria-label="Thông báo chế độ giảng viên" className="w-full bg-[#f3fcfc] border-b border-[#027D88]/20 px-4 py-2.5">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#027D88]">
              <Icon icon="lucide:eye" className="size-4 shrink-0" />
              <span>
                Bạn đang xem khóa học với góc nhìn của <strong>Học viên</strong>.
              </span>
            </div>
            <Link
              href={`/courses/${course.id}?mode=edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#027D88] hover:bg-[#02666F] text-white text-xs font-semibold transition-colors shrink-0 shadow-xs"
            >
              <Icon icon="lucide:edit-3" className="size-3.5" />
              <span>Chỉnh sửa khóa học</span>
            </Link>
          </div>
        </aside>
      )}

      {/* Main Responsive Grid Layout (2 columns on desktop) */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* ========================================================= */}
          {/* CỘT BÊN TRÁI – THÔNG TIN CHI TIẾT KHÓA HỌC                */}
          {/* ========================================================= */}
          <div className="lg:col-span-2 space-y-8">
            {/* 1. Course Header: Breadcrumb, Badges, Title, Instructor, Stats */}
            <CourseDetailHeader
              course={course}
              totalLessonsCount={totalLessonsCount}
              totalDurationFormatted={totalDurationFormatted}
            />

            {/* 2. Intro Media (Video Trailer / Cover with Play Trigger) */}
            <CourseIntroMedia
              thumbnailUrl={course.thumbnailUrl}
              trailerUrl={course.trailerUrl}
              title={course.title}
            />

            {/* 3. 4-Tab Content Navigation */}
            <CourseDetailTabs
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              reviewCount={583}
            />

            {/* 4. Active Tab Content Pane */}
            <div className="pt-2">
              {activeTab === 'curriculum' && (
                <CourseCurriculumTab
                  sections={course.sections}
                  courseId={course.id}
                  isEnrolled={isEnrolled}
                  isInstructorOwner={isInstructorOwner}
                  totalLessonsCount={totalLessonsCount}
                  totalDurationFormatted={totalDurationFormatted}
                />
              )}

              {activeTab === 'mindmap' && (
                <CourseMindmapTab
                  course={course}
                  isEnrolled={isEnrolled}
                  isInstructorOwner={isInstructorOwner}
                  totalLessonsCount={totalLessonsCount}
                />
              )}

              {activeTab === 'reviews' && (
                <CourseReviewsTab rating={4.9} reviewCount={583} />
              )}

              {activeTab === 'instructor' && (
                <CourseInstructorTab instructor={course.instructor} />
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* CỘT BÊN PHẢI – THẺ THÔNG TIN MUA KHÓA HỌC (STICKY CARD)   */}
          {/* ========================================================= */}
          <CoursePurchaseCard
            course={course}
            isEnrolled={isEnrolled}
            isInstructorOwner={isInstructorOwner}
            isLoggedIn={isLoggedIn}
            isPending={purchaseMutation.isPending || isEnrollmentLoading}
            totalLessonsCount={totalLessonsCount}
            onPurchase={handlePurchase}
          />
        </div>
      </div>
    </div>
  );
}
