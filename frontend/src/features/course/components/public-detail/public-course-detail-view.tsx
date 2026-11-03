'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CourseLevelEnum, RoleEnum } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { buttonVariants } from '@/components/ui/button';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import {
  usePublicCourseDetailQuery,
  useCheckEnrollmentQuery,
  useMockPurchaseMutation,
} from '../../api/enrollment.api';

interface PublicCourseDetailViewProps {
  courseId: string;
}

const levelMap: Record<CourseLevelEnum, string> = {
  [CourseLevelEnum.BEGINNER]: 'Cơ bản',
  [CourseLevelEnum.INTERMEDIATE]: 'Trung cấp',
  [CourseLevelEnum.ADVANCED]: 'Nâng cao',
  [CourseLevelEnum.ALL_LEVELS]: 'Tất cả cấp độ',
};

function formatVND(price: number): string {
  if (price === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function PublicCourseDetailView({
  courseId,
}: PublicCourseDetailViewProps): React.JSX.Element {
  const router = useRouter();
  const { data: user } = useCurrentUserQuery();
  const isLoggedIn = Boolean(user);

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

  // Compute first lesson to link directly for "Vào học"
  const firstLessonId = useMemo(() => {
    if (!course?.sections || course.sections.length === 0) return null;
    for (const section of course.sections) {
      if (section.lessons && section.lessons.length > 0) {
        return section.lessons[0].id;
      }
    }
    return null;
  }, [course]);

  const totalLessonsCount = useMemo(() => {
    if (!course?.sections) return 0;
    return course.sections.reduce((acc, s) => acc + (s.lessons?.length || 0), 0);
  }, [course]);

  // Loading skeleton
  if (isCourseLoading) {
    return (
      <div className="w-full min-h-screen bg-[#fbfbfb] py-10 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto animate-pulse">
        <div className="h-6 w-48 bg-neutral-200 rounded mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-10 w-3/4 bg-neutral-200 rounded" />
            <div className="h-20 w-full bg-neutral-200 rounded" />
            <div className="h-64 w-full bg-neutral-200 rounded" />
          </div>
          <div className="h-96 bg-neutral-200 rounded-xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (isCourseError || !course) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full text-center border border-neutral-200 rounded-2xl bg-white p-8 shadow-xs">
          <div className="size-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <Icon icon="lucide:alert-circle" className="size-6" />
          </div>
          <h3 className="text-lg font-bold text-[#161616]">Không tìm thấy khóa học</h3>
          <p className="text-xs sm:text-sm text-[#666666] mt-2">
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

  const discountPercent =
    course.originalPrice && course.originalPrice > course.price
      ? Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100)
      : null;

  const handlePurchase = (): void => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/courses/${course.id}`);
      return;
    }
    purchaseMutation.mutate();
  };

  const handleStartLearning = (): void => {
    if (firstLessonId) {
      router.push(`/courses/${course.id}/lessons/${firstLessonId}`);
    } else {
      router.push(`/courses/${course.id}/learn`);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#fbfbfb] text-[#161616]">
      {/* Top Banner for Instructor / Admin */}
      {isInstructorOwner && (
        <div className="w-full bg-[#f3fcfc] border-b border-[#027D88]/20 px-4 py-2.5">
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
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-[#666666] mb-6">
          <Link href="/" className="hover:text-[#161616] transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/courses" className="hover:text-[#161616] transition-colors">
            Khóa học
          </Link>
          <span>/</span>
          {course.category && (
            <>
              <Link
                href={`/courses?category=${course.category.slug}`}
                className="hover:text-[#161616] transition-colors"
              >
                {course.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-[#161616] font-medium truncate max-w-[240px]">
            {course.title}
          </span>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Left Column: Details & Curriculum */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header info */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {course.category && (
                  <span className="rounded-md bg-[#161616] text-white px-2.5 py-1 font-semibold">
                    {course.category.name}
                  </span>
                )}
                <span className="rounded-md bg-neutral-200/80 text-[#161616] px-2.5 py-1 font-medium">
                  {levelMap[course.level] || 'Mọi cấp độ'}
                </span>
                <span className="text-[#666666]">
                  {totalLessonsCount} bài giảng
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#161616] tracking-tight leading-tight">
                {course.title}
              </h1>

              {course.shortDescription && (
                <p className="text-base sm:text-lg text-[#666666] leading-relaxed">
                  {course.shortDescription}
                </p>
              )}
            </div>

            {/* Instructor Card */}
            <div className="flex items-center gap-4 p-4 rounded-xl border border-neutral-200 bg-white shadow-2xs">
              <div className="relative size-12 rounded-full overflow-hidden shrink-0 border border-neutral-200 bg-neutral-100">
                {course.instructor?.avatarUrl ? (
                  <Image
                    src={course.instructor.avatarUrl}
                    alt={course.instructor.fullName}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-neutral-500 font-bold text-base">
                    {course.instructor?.fullName?.charAt(0) || 'G'}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-[#666666] font-medium">Giảng viên hướng dẫn</p>
                <h4 className="text-sm sm:text-base font-bold text-[#161616]">
                  {course.instructor?.fullName || 'Giảng viên Mindly'}
                </h4>
                <p className="text-xs text-[#666666]">{course.instructor?.email}</p>
              </div>
            </div>

            {/* AI Experience Highlights */}
            <div className="p-5 rounded-xl border border-[#027D88]/20 bg-[#f3fcfc]/60 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#027D88]">
                <Icon icon="lucide:sparkles" className="size-4" />
                <span>Trải nghiệm học tập thông minh tích hợp AI</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="flex items-start gap-2.5 text-xs text-[#161616]">
                  <Icon icon="lucide:git-branch" className="size-4 text-[#027D88] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Mindmap AI</strong>
                    <span className="text-[#666666]">Sơ đồ tư duy dạng cây tương tác</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-[#161616]">
                  <Icon icon="lucide:help-circle" className="size-4 text-[#027D88] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">In-video Quiz</strong>
                    <span className="text-[#666666]">Điểm dừng câu hỏi ôn tập thông minh</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-[#161616]">
                  <Icon icon="lucide:file-text" className="size-4 text-[#027D88] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Tóm tắt bài giảng</strong>
                    <span className="text-[#666666]">Văn bản tóm tắt nội dung chính</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Curriculum Syllabus */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#161616]">Nội dung khóa học</h3>
                <span className="text-xs font-semibold text-[#666666]">
                  {course.sections?.length || 0} chương • {totalLessonsCount} bài học
                </span>
              </div>

              {course.sections && course.sections.length > 0 ? (
                <div className="space-y-3">
                  {course.sections.map((section, sIdx) => (
                    <div
                      key={section.id}
                      className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs"
                    >
                      <div className="px-4 py-3 bg-neutral-50/70 border-b border-neutral-200 flex items-center justify-between text-xs sm:text-sm font-semibold text-[#161616]">
                        <span>
                          Chương {sIdx + 1}: {section.title}
                        </span>
                        <span className="text-xs text-[#666666] font-normal">
                          {section.lessons?.length || 0} bài
                        </span>
                      </div>

                      <div className="divide-y divide-neutral-100">
                        {section.lessons && section.lessons.length > 0 ? (
                          section.lessons.map((lesson, lIdx) => {
                            const canAccess = isEnrolled || isInstructorOwner || lesson.isPreview;

                            return (
                              <div
                                key={lesson.id}
                                className="px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm hover:bg-neutral-50/50 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="shrink-0 size-6 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-mono text-[#666666]">
                                    {lIdx + 1}
                                  </div>

                                  <div className="min-w-0">
                                    {canAccess ? (
                                      <Link
                                        href={`/courses/${course.id}/lessons/${lesson.id}`}
                                        className="font-medium text-[#161616] hover:text-[#027D88] transition-colors truncate block"
                                      >
                                        {lesson.title}
                                      </Link>
                                    ) : (
                                      <span className="font-medium text-[#666666] truncate block cursor-not-allowed">
                                        {lesson.title}
                                      </span>
                                    )}
                                  </div>

                                  {lesson.isPreview && (
                                    <span className="shrink-0 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px] px-2 py-0.5">
                                      Học thử
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {lesson.duration > 0 && (
                                    <span className="text-xs font-mono text-[#666666]">
                                      {formatDuration(lesson.duration)}
                                    </span>
                                  )}

                                  {canAccess ? (
                                    <Link
                                      href={`/courses/${course.id}/lessons/${lesson.id}`}
                                      className="size-7 rounded-full bg-neutral-100 hover:bg-[#027D88] hover:text-white text-[#161616] flex items-center justify-center transition-colors"
                                      title="Xem bài học"
                                    >
                                      <Icon icon="lucide:play" className="size-3.5 fill-current" />
                                    </Link>
                                  ) : (
                                    <span
                                      className="size-7 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center"
                                      title="Bài học yêu cầu mua khóa học"
                                    >
                                      <Icon icon="lucide:lock" className="size-3.5" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-3 text-xs text-[#666666] italic">
                            Chưa có bài học trong chương này
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-xs text-[#666666]">
                  Giảng viên đang biên tập nội dung bài giảng.
                </div>
              )}
            </div>

            {/* Course Description */}
            {course.description && (
              <div className="space-y-3 pt-4 border-t border-neutral-200">
                <h3 className="text-xl font-bold text-[#161616]">Giới thiệu khóa học</h3>
                <div className="text-sm sm:text-base text-[#444444] leading-relaxed whitespace-pre-line">
                  {course.description}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Purchase Box */}
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm overflow-hidden">
              {/* Thumbnail / Trailer */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-neutral-100 mb-5 border border-neutral-200">
                {course.thumbnailUrl ? (
                  <Image
                    src={course.thumbnailUrl}
                    alt={course.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 400px"
                    className="object-cover"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-neutral-400">
                    <Icon icon="lucide:book-open" className="size-12" />
                  </div>
                )}
              </div>

              {/* Price section */}
              <div className="space-y-1 mb-5">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#161616]">
                    {formatVND(course.price)}
                  </span>
                  {discountPercent !== null && course.originalPrice && (
                    <span className="text-sm text-[#666666] line-through">
                      {formatVND(course.originalPrice)}
                    </span>
                  )}
                </div>

                {discountPercent !== null && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#dc2626]">
                    <span>Tiết kiệm {discountPercent}%</span>
                  </div>
                )}
              </div>

              {/* Status-Aware Action Button */}
              <div className="space-y-3">
                {isEnrolled || isInstructorOwner ? (
                  <button
                    type="button"
                    onClick={handleStartLearning}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-3.5 px-4 text-sm sm:text-base transition-colors shadow-sm"
                  >
                    <Icon icon="lucide:play-circle" className="size-5 shrink-0 fill-white text-[#027D88]" />
                    <span>Vào học ngay</span>
                  </button>
                ) : !isLoggedIn ? (
                  <Link
                    href={`/login?redirect=/courses/${course.id}`}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-3.5 px-4 text-sm sm:text-base transition-colors shadow-sm text-center"
                  >
                    <Icon icon="lucide:log-in" className="size-4 shrink-0" />
                    <span>Đăng nhập để mua khóa học</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handlePurchase}
                    disabled={purchaseMutation.isPending || isEnrollmentLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-3.5 px-4 text-sm sm:text-base transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {purchaseMutation.isPending ? (
                      <>
                        <Icon icon="lucide:loader-2" className="size-4 animate-spin shrink-0" />
                        <span>Đang xử lý mua khóa học...</span>
                      </>
                    ) : (
                      <>
                        <Icon icon="lucide:shopping-cart" className="size-4 shrink-0" />
                        <span>
                          {course.price === 0 ? 'Đăng ký học miễn phí' : 'Mua khóa học ngay'}
                        </span>
                      </>
                    )}
                  </button>
                )}

                <p className="text-[11px] text-[#666666] text-center pt-1">
                  Truy cập trọn đời • Hoàn tất tức thì • Học mọi lúc mọi nơi
                </p>
              </div>

              {/* Included Perks */}
              <div className="mt-6 pt-6 border-t border-neutral-100 space-y-2.5 text-xs text-[#444444]">
                <div className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="size-4 text-emerald-600 shrink-0" />
                  <span>Toàn bộ {totalLessonsCount} bài giảng chất lượng cao</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="size-4 text-emerald-600 shrink-0" />
                  <span>Sơ đồ tư duy Mindmap AI cho từng bài</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="size-4 text-emerald-600 shrink-0" />
                  <span>Bộ câu hỏi trắc nghiệm dừng video In-video Quiz</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Icon icon="lucide:check" className="size-4 text-emerald-600 shrink-0" />
                  <span>Tài liệu đính kèm và transcript chi tiết</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
