'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ICourseInstructorSummary } from 'share-lib';
import { CourseLevelEnum } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useInstructorPublicCoursesQuery } from '../../api/public-courses.api';
import type { IPublicCourseCard } from '../public-discovery/mock-discovery-data';

interface InstructorProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  instructor: ICourseInstructorSummary | null;
}

const levelMap: Record<CourseLevelEnum, string> = {
  [CourseLevelEnum.BEGINNER]: 'Cơ bản',
  [CourseLevelEnum.INTERMEDIATE]: 'Trung cấp',
  [CourseLevelEnum.ADVANCED]: 'Nâng cao',
  [CourseLevelEnum.ALL_LEVELS]: 'Mọi cấp độ',
};

function formatVND(price: number): string {
  if (price === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
}

export function InstructorProfileDialog({
  isOpen,
  onClose,
  instructor,
}: InstructorProfileDialogProps): React.JSX.Element | null {
  const [avatarError, setAvatarError] = useState(false);

  const { data, isLoading } = useInstructorPublicCoursesQuery(
    instructor?.id,
    isOpen && Boolean(instructor?.id),
  );

  if (!instructor) return null;

  const publicCourses: IPublicCourseCard[] = data?.items ?? [];
  const totalCourses = data?.total ?? publicCourses.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden sm:max-w-2xl">
        {/* Header with Accessibility Titles */}
        <DialogHeader className="p-6 pb-4 border-b border-neutral-100 bg-[#fbfbfb]">
          <DialogTitle className="text-lg font-bold text-[#161616]">
            Hồ sơ Giảng viên
          </DialogTitle>
          <DialogDescription className="text-xs text-[#666666]">
            Thông tin chi tiết và toàn bộ khóa học đã công khai của giảng viên
          </DialogDescription>

          {/* Instructor Bio Card */}
          <div className="mt-4 flex items-center gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
            <div className="relative size-14 rounded-full overflow-hidden shrink-0 border border-neutral-200 bg-[#f3fcfc]">
              {instructor.avatarUrl && !avatarError ? (
                <Image
                  src={instructor.avatarUrl}
                  alt={instructor.fullName}
                  fill
                  sizes="56px"
                  className="object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="size-full flex items-center justify-center text-[#027D88]">
                  <Icon icon="lucide:user" className="size-7" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-[#161616] truncate">
                  {instructor.fullName || 'Giảng viên Mindly'}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#f3fcfc] px-2 py-0.5 text-[11px] font-semibold text-[#027D88] border border-[#027D88]/20">
                  <Icon icon="lucide:badge-check" className="size-3.5 shrink-0" />
                  <span>Giảng viên Mindly</span>
                </span>
              </div>
              <p className="text-xs text-[#666666] mt-1 truncate">
                {instructor.email}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body: Public Courses List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#161616] flex items-center gap-1.5">
              <Icon icon="lucide:book-open" className="size-4 text-[#027D88]" />
              <span>Khóa học đã xuất bản ({totalCourses})</span>
            </h4>

            {instructor.fullName && (
              <Link
                href={`/courses?view=catalog&q=${encodeURIComponent(instructor.fullName)}`}
                onClick={onClose}
                className="text-xs font-semibold text-[#027D88] hover:underline flex items-center gap-1"
              >
                <span>Xem trên Catalog</span>
                <Icon icon="lucide:arrow-up-right" className="size-3.5" />
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-24 w-full animate-pulse rounded-xl border border-neutral-200 bg-neutral-100"
                />
              ))}
            </div>
          ) : publicCourses.length > 0 ? (
            <div className="space-y-3">
              {publicCourses.map((course) => (
                <article
                  key={course.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-neutral-200 hover:border-[#161616] transition-colors bg-white shadow-2xs group"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Thumbnail */}
                    <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-neutral-100 border border-neutral-200">
                      {course.thumbnailUrl ? (
                        <Image
                          src={course.thumbnailUrl}
                          alt={course.title}
                          fill
                          sizes="112px"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-neutral-400">
                          <Icon icon="lucide:book-open" className="size-6" />
                        </div>
                      )}
                    </div>

                    {/* Course Summary */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-semibold text-[#027D88] bg-[#f3fcfc] px-1.5 py-0.5 rounded">
                          {course.categoryName || 'Khóa học'}
                        </span>
                        <span className="text-[10px] text-[#666666]">
                          • {levelMap[course.level] || 'Mọi cấp độ'}
                        </span>
                      </div>

                      <h5 className="text-xs sm:text-sm font-bold text-[#161616] truncate group-hover:text-[#027D88] transition-colors">
                        <Link href={`/courses/${course.id}`} onClick={onClose}>
                          {course.title}
                        </Link>
                      </h5>

                      <p className="text-xs font-semibold text-[#027D88] mt-1">
                        {formatVND(course.price)}
                      </p>
                    </div>
                  </div>

                  {/* Action Link */}
                  <Link
                    href={`/courses/${course.id}`}
                    onClick={onClose}
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-1.5 px-3 text-xs transition-colors shrink-0 shadow-2xs w-full sm:w-auto"
                  >
                    <span>Xem khóa học</span>
                    <Icon icon="lucide:chevron-right" className="size-3.5" />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center rounded-xl border border-dashed border-neutral-200 bg-[#fbfbfb]">
              <div className="size-10 rounded-full bg-[#f3fcfc] text-[#027D88] flex items-center justify-center mx-auto mb-2 border border-[#027D88]/20">
                <Icon icon="lucide:book-open" className="size-5" />
              </div>
              <p className="text-xs font-semibold text-[#161616]">
                Chưa có khóa học công khai nào khác
              </p>
              <p className="text-[11px] text-[#666666] mt-0.5">
                Giảng viên hiện chưa phát hành thêm khóa học nào trên nền tảng.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 flex items-center justify-end gap-2 bg-[#fbfbfb]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-200 hover:bg-neutral-100 text-[#161616] font-semibold text-xs py-2 px-4 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

