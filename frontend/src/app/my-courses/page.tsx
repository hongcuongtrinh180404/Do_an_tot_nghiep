'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CourseLevelEnum, RoleEnum, type ICourse, type ICourseInstructorSummary } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { PublicHeader, PublicFooter } from '@/features/course/components/public-discovery';
import { InstructorProfileDialog } from '@/features/course/components/instructor/instructor-profile-dialog';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import { useMyPurchasedCoursesQuery } from '@/features/course/api/enrollment.api';

const levelMap: Record<CourseLevelEnum, string> = {
  [CourseLevelEnum.BEGINNER]: 'Cơ bản',
  [CourseLevelEnum.INTERMEDIATE]: 'Trung cấp',
  [CourseLevelEnum.ADVANCED]: 'Nâng cao',
  [CourseLevelEnum.ALL_LEVELS]: 'Mọi cấp độ',
};

function MyPurchasedCoursesContent(): React.JSX.Element {
  const { data: user, isLoading: isAuthLoading } = useCurrentUserQuery();
  const { data: courses, isLoading: isCoursesLoading } = useMyPurchasedCoursesQuery(
    Boolean(user),
  );
  const [selectedInstructor, setSelectedInstructor] = useState<ICourseInstructorSummary | null>(null);
  const [isInstructorDialogOpen, setIsInstructorDialogOpen] = useState(false);

  const handleOpenInstructorProfile = (
    e: React.MouseEvent,
    instructor: ICourseInstructorSummary | null,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!instructor) return;
    setSelectedInstructor(instructor);
    setIsInstructorDialogOpen(true);
  };

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-80 w-full animate-pulse rounded-xl border border-neutral-200 bg-white"
            />
          ))}
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: ICourse) => {
            const rawCat = course.categoryId as unknown;
            const categoryName =
              course.category?.name ||
              (rawCat !== null &&
                typeof rawCat === 'object' &&
                (rawCat as { name?: string }).name) ||
              'Khóa học';

            const rawInst = course.instructorId as unknown;
            const instructorId =
              typeof rawInst === 'object' && rawInst !== null
                ? (rawInst as { _id?: string; id?: string })._id ||
                (rawInst as { _id?: string; id?: string }).id
                : typeof rawInst === 'string'
                  ? rawInst
                  : '';
            const isCourseOwner = Boolean(
              user &&
              (user.role === RoleEnum.ADMIN ||
                (user.role === RoleEnum.INSTRUCTOR && instructorId === user.id)),
            );

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

            const instructorName =
              instructorSummary?.fullName || 'Giảng viên Mindly';
            const instructorAvatar = instructorSummary?.avatarUrl || null;

            return (
              <article
                key={course.id}
                className="group flex flex-col rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs hover:border-[#161616] transition-all"
              >
                {/* Thumbnail 16:9 */}
                <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
                  {course.thumbnailUrl ? (
                    <Image
                      src={course.thumbnailUrl}
                      alt={course.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-neutral-400">
                      <Icon icon="lucide:book-open" className="size-10" />
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 flex-wrap">
                    <span className="rounded bg-[#161616]/85 px-2 py-0.5 text-xs font-semibold text-white">
                      {categoryName}
                    </span>
                    {isCourseOwner && (
                      <span className="rounded bg-[#027D88] px-2 py-0.5 text-xs font-bold text-white shadow-2xs">
                        Khóa học của bạn
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex flex-1 flex-col">
                  <h3 className="line-clamp-2 text-base font-bold text-[#161616] leading-snug group-hover:text-[#027D88] transition-colors min-h-[2.5rem]">
                    <Link
                      href={isCourseOwner ? `/courses/${course.id}?mode=edit` : `/courses/${course.id}`}
                      title={isCourseOwner ? 'Quản lý khóa học' : course.title}
                    >
                      {course.title}
                    </Link>
                  </h3>

                  {/* Instructor */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) =>
                        handleOpenInstructorProfile(e, instructorSummary)
                      }
                      className="group/inst flex items-center gap-2 text-left hover:opacity-85 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#027D88] rounded-md py-0.5"
                      title="Xem hồ sơ & danh sách khóa học của giảng viên"
                    >
                      {/* Avatar with fallback to default avatar */}
                      <div className="relative size-5 rounded-full overflow-hidden shrink-0 border border-neutral-200 bg-[#f3fcfc]">
                        {instructorAvatar ? (
                          <Image
                            src={instructorAvatar}
                            alt={instructorName}
                            fill
                            sizes="20px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center text-[#027D88]">
                            <Icon icon="lucide:user" className="size-3.5" />
                          </div>
                        )}
                      </div>

                      <span className="truncate text-xs text-[#666666] font-medium group-hover/inst:text-[#027D88] group-hover/inst:underline transition-colors">
                        {instructorName}
                      </span>
                    </button>
                  </div>

                  {/* AI Features badge */}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-[#027d88] bg-[#f3fcfc] rounded p-1.5 font-medium">
                    <Icon
                      icon="lucide:sparkles"
                      className="size-3.5 text-[#027d88] shrink-0"
                    />
                    <span className="truncate">
                      Tích hợp Mindmap AI & Quiz dừng video
                    </span>
                  </div>

                  {/* Card Footer: Action button */}
                  <div data-ui="course-card-footer" className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs text-[#666666]">
                      {levelMap[course.level] || 'Mọi cấp độ'}
                    </span>

                    <div className="flex items-center gap-2">
                      {isCourseOwner ? (
                        <>
                          <Link
                            href={`/courses/${course.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-[#161616] font-semibold py-1.5 px-2.5 text-xs transition-colors"
                            title="Vào học bài giảng & chỉnh sửa Mindmap, Tóm tắt, Câu hỏi tương tác"
                          >
                            <Icon icon="lucide:play" className="size-3.5 text-[#027D88]" />
                            <span>Vào học</span>
                          </Link>
                          <Link
                            href={`/courses/${course.id}?mode=edit`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-1.5 px-3 text-xs transition-colors shadow-2xs"
                            title="Quản lý và biên tập nội dung khóa học (Thêm, sửa, xóa chương học và bài giảng)"
                          >
                            <Icon icon="lucide:settings" className="size-3.5" />
                            <span>Quản lý</span>
                          </Link>
                        </>
                      ) : (
                        <Link
                          href={`/courses/${course.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-2 px-3.5 text-xs transition-colors shadow-2xs"
                        >
                          <Icon
                            icon="lucide:play-circle"
                            className="size-4 shrink-0"
                          />
                          <span>Vào học</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </article>
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
