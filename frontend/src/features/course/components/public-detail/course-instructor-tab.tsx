'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import type { ICourseInstructorSummary } from 'share-lib';
import {
  useInstructorPublicCoursesQuery,
  useRelatedCategoryCoursesQuery,
} from '../../api/public-courses.api';
import { TeacherCourseRow } from './teacher-course-row';
import { getPublicProfilePath } from '@/features/profile/utils/profile-url';
import { PublicCoursesQueryError } from '../public-courses-query-error';

const MAX_RELATED_COURSES = 5;

export interface CourseInstructorTabProps {
  currentCourseId?: string;
  instructor?: ICourseInstructorSummary | null;
  instructorId?: string;
  categorySlug?: string | null;
  categoryName?: string | null;
}

export function CourseInstructorTab({
  currentCourseId,
  instructor,
  instructorId,
  categorySlug,
  categoryName,
}: CourseInstructorTabProps): React.JSX.Element {
  const fullName = instructor?.fullName || 'Giảng viên Mindly';
  const instructorBio = instructor?.bio?.trim();
  const profilePath = instructor?.username ? getPublicProfilePath(instructor.username) : null;
  const targetInstructorId = instructorId || instructor?.id;

  const {
    data: coursesResult,
    isLoading: isCoursesLoading,
    isError: isCoursesError,
  } = useInstructorPublicCoursesQuery(targetInstructorId, Boolean(targetInstructorId));

  const {
    data: relatedResult,
    isLoading: isRelatedLoading,
    isError: isRelatedError,
    refetch: refetchRelated,
  } = useRelatedCategoryCoursesQuery(categorySlug, Boolean(categorySlug));

  const relatedCourses = useMemo(() => {
    if (!relatedResult?.items) return [];
    const otherCourses = currentCourseId
      ? relatedResult.items.filter((c) => c.id !== currentCourseId)
      : relatedResult.items;
    return otherCourses.slice(0, MAX_RELATED_COURSES);
  }, [relatedResult, currentCourseId]);

  const otherCoursesTotal = useMemo(() => {
    if (!relatedResult) return 0;
    return Math.max(0, relatedResult.total - (currentCourseId ? 1 : 0));
  }, [relatedResult, currentCourseId]);

  const hasMoreRelated = otherCoursesTotal > MAX_RELATED_COURSES;

  const hasCourseStats = Boolean(coursesResult) && !isCoursesLoading && !isCoursesError;
  const totalCoursesCount = coursesResult?.total ?? 0;

  const totalEnrollmentsCount = useMemo(() => {
    if (!coursesResult?.items || coursesResult.items.length === 0) return 0;
    return coursesResult.items.reduce((acc, c) => acc + (c.studentCount ?? 0), 0);
  }, [coursesResult]);

  const averageRating = useMemo(() => {
    if (!coursesResult?.items) return null;
    const reviewCount = coursesResult.items.reduce((sum, course) => sum + course.reviewCount, 0);
    if (reviewCount === 0) return null;
    const weightedRating = coursesResult.items.reduce(
      (sum, course) => sum + course.rating * course.reviewCount, 0,
    );
    return weightedRating / reviewCount;
  }, [coursesResult]);

  return (
    <div
      role="tabpanel"
      id="tabpanel-instructor"
      aria-labelledby="tab-instructor"
      className="space-y-8 pt-2"
    >
      {/* 1. Profile Overview Card */}
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 sm:p-8 shadow-2xs space-y-6">
        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative size-20 sm:size-24 rounded-full overflow-hidden shrink-0 border-2 border-[#e5e7eb] bg-neutral-100 shadow-xs">
            {instructor?.avatarUrl ? (
              <Image
                src={instructor.avatarUrl}
                alt={fullName}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div className="size-full flex items-center justify-center text-neutral-600 font-extrabold text-2xl">
                {fullName.charAt(0)?.toUpperCase() || 'G'}
              </div>
            )}
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f3fcfc] border border-[#027D88]/20 px-2.5 py-0.5 text-xs font-semibold text-[#027D88]">
              <Icon icon="lucide:badge-check" className="size-3.5" />
              <span>Giảng viên chuyên gia được xác thực</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#161616] truncate">
              {profilePath ? <Link href={profilePath} className="hover:underline">{fullName}</Link> : fullName}
            </h2>
            {profilePath && (
              <Link href={profilePath} className="inline-flex min-h-11 items-center text-sm text-[#666666] hover:underline">
                @{instructor?.username}
              </Link>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-b border-[#f2f2f2] py-4">
          <div className="text-center sm:text-left space-y-0.5">
            <span className="text-xs text-[#666666]">Điểm đánh giá</span>
            <div className="flex items-center justify-center sm:justify-start gap-1 font-bold text-base text-[#161616]">
              <Icon icon="lucide:star" className="size-4 fill-[#ffd100] text-[#ffd100]" />
              <span>{!hasCourseStats ? '—' : averageRating === null ? 'Chưa có đánh giá' : `${averageRating.toFixed(1)} / 5.0`}</span>
            </div>
          </div>

          <div className="text-center sm:text-left space-y-0.5">
            <span className="text-xs text-[#666666]">Lượt ghi danh</span>
            <p className="font-bold text-base text-[#161616]">
              {hasCourseStats ? totalEnrollmentsCount.toLocaleString('vi-VN') : '—'}
            </p>
          </div>

          <div className="text-center sm:text-left space-y-0.5">
            <span className="text-xs text-[#666666]">Khóa học giảng dạy</span>
            <p className="font-bold text-base text-[#161616]">{hasCourseStats ? `${totalCoursesCount.toLocaleString('vi-VN')} khóa` : '—'}</p>
          </div>
        </div>

        {/* Biography & Philosophy */}
        <div className="space-y-3 text-xs sm:text-sm text-[#444444] leading-relaxed">
          <h3 className="text-base font-bold text-[#161616]">Về giảng viên</h3>
          <p className="whitespace-pre-wrap break-words">
            {instructorBio || 'Giảng viên chưa cập nhật phần giới thiệu.'}
          </p>
        </div>
      </div>

      {/* 2. Related Courses in the Current Category */}
      {categorySlug && (
        <section aria-label="Khóa học liên quan trong cùng danh mục" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b border-[#e5e7eb] pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-[#161616]">
                  Khóa học liên quan
                </h3>
                {categoryName && (
                  <p className="text-xs text-[#666666] truncate">
                    Cùng danh mục: <span className="font-semibold text-[#161616]">{categoryName}</span>
                  </p>
                )}
              </div>
              {!isRelatedError && otherCoursesTotal > 0 && (
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-bold text-[#666666]">
                  {otherCoursesTotal.toLocaleString('vi-VN')}
                </span>
              )}
            </div>
          </div>

          {/* Loading Skeletons */}
          {isRelatedLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={`skeleton-${i}`}
                  className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-[#e5e7eb] bg-white animate-pulse"
                >
                  <div className="w-full sm:w-[190px] aspect-[16/10] bg-neutral-200 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-4 w-20 bg-neutral-200 rounded" />
                    <div className="h-5 w-3/4 bg-neutral-200 rounded" />
                    <div className="h-3 w-40 bg-neutral-200 rounded" />
                    <div className="h-4 w-1/2 bg-neutral-200 rounded mt-4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Related Courses List */}
          {!isRelatedLoading && isRelatedError && (
            <PublicCoursesQueryError onRetry={() => { void refetchRelated(); }} />
          )}

          {!isRelatedLoading && !isRelatedError && relatedCourses.length > 0 && (
            <div className="space-y-3.5">
              {relatedCourses.map((c) => (
                <TeacherCourseRow key={c.id} course={c} />
              ))}
            </div>
          )}

          {/* View More Button */}
          {!isRelatedLoading && !isRelatedError && hasMoreRelated && (
            <div className="flex justify-center pt-1">
              <Link
                href={`/courses?category=${encodeURIComponent(categorySlug)}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#027D88] bg-white px-5 py-2.5 text-sm font-bold text-[#027D88] transition-colors hover:bg-[#f3fcfc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#027D88]"
              >
                <span>Xem thêm</span>
                <Icon icon="lucide:arrow-right" className="size-4" />
              </Link>
            </div>
          )}

          {/* Empty State */}
          {!isRelatedLoading && !isRelatedError && relatedCourses.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-white p-8 text-center space-y-3">
              <div className="size-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                <Icon icon="lucide:book-open" className="size-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#161616]">
                  Chưa có khóa học nào khác trong danh mục này
                </h4>
                <p className="text-xs text-[#666666] max-w-sm mx-auto leading-relaxed">
                  Hiện tại chưa có thêm khóa học nào cùng danh mục. Hãy khám phá các khóa học khác của giảng viên hoặc quay lại sau!
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
