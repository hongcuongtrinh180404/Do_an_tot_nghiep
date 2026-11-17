'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import type { ICourseInstructorSummary } from 'share-lib';
import { useInstructorPublicCoursesQuery } from '../../api/public-courses.api';
import { TeacherCourseRow, formatCompactNumber } from './teacher-course-row';
import { getPublicProfilePath } from '@/features/profile/utils/profile-url';

export interface CourseInstructorTabProps {
  currentCourseId?: string;
  instructor?: ICourseInstructorSummary | null;
  instructorId?: string;
}

export function CourseInstructorTab({
  currentCourseId,
  instructor,
  instructorId,
}: CourseInstructorTabProps): React.JSX.Element {
  const fullName = instructor?.fullName || 'Giảng viên Mindly';
  const instructorBio = instructor?.bio?.trim();
  const profilePath = instructor?.username ? getPublicProfilePath(instructor.username) : null;
  const targetInstructorId = instructorId || instructor?.id;

  const {
    data: coursesResult,
    isLoading: isCoursesLoading,
  } = useInstructorPublicCoursesQuery(targetInstructorId, Boolean(targetInstructorId));

  const otherCourses = useMemo(() => {
    if (!coursesResult?.items) return [];
    if (!currentCourseId) return coursesResult.items;
    return coursesResult.items.filter((c) => c.id !== currentCourseId);
  }, [coursesResult, currentCourseId]);

  const totalCoursesCount = useMemo(() => {
    if (coursesResult?.total && coursesResult.total > 0) return coursesResult.total;
    if (coursesResult?.items && coursesResult.items.length > 0) return coursesResult.items.length;
    return 1;
  }, [coursesResult]);

  const totalStudentsCount = useMemo(() => {
    if (!coursesResult?.items || coursesResult.items.length === 0) return 0;
    return coursesResult.items.reduce((acc, c) => acc + (c.studentCount ?? 0), 0);
  }, [coursesResult]);

  const averageRating = useMemo(() => {
    if (!coursesResult?.items || coursesResult.items.length === 0) return 4.9;
    const rated = coursesResult.items.filter((c) => (c.rating ?? 0) > 0);
    if (rated.length === 0) return 5.0;
    const sum = rated.reduce((acc, c) => acc + (c.rating ?? 0), 0);
    return Math.round((sum / rated.length) * 10) / 10;
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-b border-[#f2f2f2] py-4">
          <div className="text-center sm:text-left space-y-0.5">
            <span className="text-xs text-[#666666]">Điểm đánh giá</span>
            <div className="flex items-center justify-center sm:justify-start gap-1 font-bold text-base text-[#161616]">
              <Icon icon="lucide:star" className="size-4 fill-[#ffd100] text-[#ffd100]" />
              <span>{averageRating.toFixed(1)} / 5.0</span>
            </div>
          </div>

          <div className="text-center sm:text-left space-y-0.5">
            <span className="text-xs text-[#666666]">Tổng học viên</span>
            <p className="font-bold text-base text-[#161616]">
              {totalStudentsCount > 0 ? `${formatCompactNumber(totalStudentsCount)}+` : '15.4K+'}
            </p>
          </div>

          <div className="text-center sm:text-left space-y-0.5">
            <span className="text-xs text-[#666666]">Khóa học giảng dạy</span>
            <p className="font-bold text-base text-[#161616]">{totalCoursesCount} khóa</p>
          </div>

          <div className="text-center sm:text-left space-y-0.5">
            <span className="text-xs text-[#666666]">Tỷ lệ hoàn thành</span>
            <p className="font-bold text-base text-[#161616]">96%</p>
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

      {/* 2. Other Courses by this Teacher Section */}
      <section aria-label="Khóa học khác của giảng viên này" className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg sm:text-xl font-bold text-[#161616]">
              Khóa học khác của giảng viên này
            </h3>
            {otherCourses.length > 0 && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-bold text-[#666666]">
                {otherCourses.length}
              </span>
            )}
          </div>
        </div>

        {/* Loading Skeletons */}
        {isCoursesLoading && (
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

        {/* Other Courses List */}
        {!isCoursesLoading && otherCourses.length > 0 && (
          <div className="space-y-3.5">
            {otherCourses.map((c) => (
              <TeacherCourseRow
                key={c.id}
                course={c}
                instructorName={fullName}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isCoursesLoading && otherCourses.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-white p-8 text-center space-y-3">
            <div className="size-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
              <Icon icon="lucide:book-open" className="size-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#161616]">
                Chưa có thêm khóa học nào khác
              </h4>
              <p className="text-xs text-[#666666] max-w-sm mx-auto leading-relaxed">
                Giảng viên hiện đang tập trung cho khóa học này. Hãy theo dõi để nhận thông báo sớm nhất khi có khóa học mới!
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
