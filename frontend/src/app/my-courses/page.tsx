'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import type { ICourse, ICourseInstructorSummary } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { PublicHeader, PublicFooter } from '@/features/course/components/public-discovery';
import { CourseCard } from '@/features/course/components/public-discovery/course-card';
import { mapCourseToPublicCard } from '@/features/course/services/public-courses.service';
import { InstructorProfileDialog } from '@/features/course/components/instructor/instructor-profile-dialog';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import { useMyPurchasedCoursesQuery } from '@/features/course/api/enrollment.api';
import { useMyLearningProgressQuery } from '@/features/course/api/learning-progress.api';

function MyPurchasedCoursesContent(): React.JSX.Element {
  const { data: user, isLoading: isAuthLoading } = useCurrentUserQuery();
  const { data: courses, isLoading: isCoursesLoading } = useMyPurchasedCoursesQuery(
    Boolean(user),
  );
  const [selectedInstructor, setSelectedInstructor] = useState<ICourseInstructorSummary | null>(null);
  const [isInstructorDialogOpen, setIsInstructorDialogOpen] = useState(false);
  const learning = useMyLearningProgressQuery(user?.id);

  if (isAuthLoading) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[#666666]">
          <Icon icon="lucide:loader-2" className="size-5 animate-spin text-[#027D88]" />
          <span>Đang tải thông tin tài khoản...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Prompt login
  if (!user) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full text-center border border-neutral-200 rounded-2xl bg-white p-8 shadow-xs">
          <div className="size-14 rounded-full bg-neutral-100 text-[#161616] flex items-center justify-center mx-auto mb-4">
            <Icon icon="lucide:lock" className="size-6 text-[#027D88]" />
          </div>
          <h3 className="text-xl font-bold text-[#161616]">Yêu cầu đăng nhập</h3>
          <p className="text-xs sm:text-sm text-[#666666] mt-2 leading-relaxed">
            Vui lòng đăng nhập vào tài khoản học viên để xem danh sách các khóa học bạn đã mua và bắt đầu học tập.
          </p>
          <div className="mt-6">
            <Link
              href="/login?redirect=/my-courses"
              className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-3 px-4 text-sm transition-colors shadow-xs"
            >
              <Icon icon="lucide:log-in" className="size-4" />
              <span>Đăng nhập ngay</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      {/* Page Title & Breadcrumb */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-[#666666] mb-3">
          <Link href="/" className="hover:text-[#161616] transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-[#161616] font-medium">Khóa học đã mua</span>
        </div>

        <div data-ui="page-header" className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-neutral-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#161616] tracking-tight">
              Khóa học đã mua của tôi
            </h1>
            <p className="text-xs sm:text-sm text-[#666666] mt-1">
              Toàn bộ các khóa học bạn đã đăng ký và sở hữu trên nền tảng Mindly
            </p>
          </div>

          <Link
            href="/courses?view=catalog"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#027D88] hover:underline shrink-0"
          >
            <span>Khám phá thêm khóa học</span>
            <Icon icon="lucide:arrow-right" className="size-4" />
          </Link>
        </div>
      </div>

      {/* Courses Grid / Empty State */}
      {isCoursesLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-84 w-full animate-pulse rounded-xl border border-[#e5e7eb] bg-white shadow-xs overflow-hidden"
            >
              <div className="aspect-video w-full bg-neutral-100" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 bg-neutral-100 rounded" />
                <div className="h-3 w-1/2 bg-neutral-100 rounded" />
                <div className="h-2 w-full bg-neutral-100 rounded mt-4" />
                <div className="h-9 w-full bg-neutral-100 rounded-lg mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map((course: ICourse) => {
            const progress = learning.data?.find((item) => item.courseId === course.id);
            const publicCardCourse = mapCourseToPublicCard(course, progress?.totalDurationMs);

            const rawInst = course.instructorId as unknown;
            const instructorSummary: ICourseInstructorSummary | null =
              course.instructor ||
              (rawInst !== null && typeof rawInst === 'object'
                ? {
                  id: (rawInst as { _id?: string })._id ?? '',
                  fullName:
                    (rawInst as { fullName?: string }).fullName ??
                    'Giảng viên Mindly',
                  email: (rawInst as { email?: string }).email ?? '',
                  avatarUrl:
                    (rawInst as { avatarUrl?: string | null })
                      .avatarUrl ?? null,
                }
                : null);

            return (
              <CourseCard
                key={course.id}
                course={publicCardCourse}
                isEnrolled={true}
                progress={progress}
                resumeLessonId={progress?.lastLessonId}
                onInstructorClick={
                  instructorSummary
                    ? () => {
                      setSelectedInstructor(instructorSummary);
                      setIsInstructorDialogOpen(true);
                    }
                    : undefined
                }
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center max-w-lg mx-auto my-8">
          <div className="size-16 rounded-full bg-[#f3fcfc] text-[#027D88] flex items-center justify-center mx-auto mb-4 border border-[#027D88]/20">
            <Icon icon="lucide:shopping-bag" className="size-7" />
          </div>
          <h3 className="text-lg font-bold text-[#161616]">Chưa có khóa học nào</h3>
          <p className="text-xs sm:text-sm text-[#666666] mt-2 leading-relaxed">
            Bạn chưa sở hữu khóa học nào. Hãy khám phá thư viện khóa học phong phú với video tương tác và mindmap thông minh của Mindly.
          </p>
          <div className="mt-6">
            <Link
              href="/courses?view=catalog"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-2.5 px-5 text-sm transition-colors shadow-xs"
            >
              <Icon icon="lucide:compass" className="size-4" />
              <span>Khám phá khóa học ngay</span>
            </Link>
          </div>
        </div>
      )}

      {/* Instructor Profile & Public Courses Dialog */}
      <InstructorProfileDialog
        isOpen={isInstructorDialogOpen}
        onClose={() => setIsInstructorDialogOpen(false)}
        instructor={selectedInstructor}
      />
    </div>
  );
}

export default function MyCoursesPage(): React.JSX.Element {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-[#fbfbfb] text-foreground">
      <Suspense fallback={<div className="h-16 w-full bg-neutral-900" />}>
        <PublicHeader />
      </Suspense>

      <main className="flex-1">
        <MyPurchasedCoursesContent />
      </main>

      <PublicFooter />
    </div>
  );
}
