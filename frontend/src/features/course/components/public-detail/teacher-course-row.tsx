'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@/components/ui/icon';
import type { IPublicCourseCard } from '../../types/public-course.types';

export interface TeacherCourseRowProps {
  course: IPublicCourseCard;
  instructorName?: string;
}

export function formatCompactNumber(num?: number | null): string {
  if (!num || num <= 0) return '0';
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return num.toLocaleString('vi-VN');
}

export function formatCoursePrice(price?: number | null): string {
  if (price === 0 || price === undefined || price === null) return 'Miễn phí';
  return `${price.toLocaleString('vi-VN')} đ`;
}

export function TeacherCourseRow({
  course,
  instructorName,
}: TeacherCourseRowProps): React.JSX.Element {
  const teacherName = instructorName || course.instructorName || 'Giảng viên Mindly';
  const isBestSeller = Boolean(
    course.isFeatured ||
    course.studentCount >= 5 ||
    (course.reviewCount > 0 && course.rating >= 4.5),
  );

  const hasReviews = course.reviewCount > 0;
  const displayRating = course.rating;
  const filledStars = hasReviews ? Math.min(5, Math.max(0, Math.round(displayRating))) : 0;
  const hasDiscount = Boolean(
    course.originalPrice &&
    course.originalPrice > course.price &&
    course.price > 0,
  );

  return (
    <article
      data-ui="teacher-course-row"
      className="group flex flex-col sm:flex-row items-stretch gap-4 p-3.5 sm:p-4 rounded-xl border border-[#e5e7eb] bg-white hover:border-[#027D88]/40 hover:shadow-xs transition-all duration-200"
    >
      {/* Course Thumbnail */}
      <Link
        href={`/courses/${course.id}`}
        aria-label={`Xem chi tiết khóa học ${course.title}`}
        className="relative w-full sm:w-[170px] md:w-[190px] aspect-[16/10] rounded-lg overflow-hidden shrink-0 bg-neutral-100 focus-visible:outline-2 focus-visible:outline-[#027D88]"
      >
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            sizes="(max-width: 640px) 100vw, 190px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-neutral-100 text-neutral-400">
            <Icon icon="lucide:book-open" className="size-8" />
          </div>
        )}
      </Link>

      {/* Course Content Details */}
      <div className="flex-1 flex flex-col justify-between min-w-0 space-y-2.5">
        <div className="space-y-1.5">
          {/* Best Seller Badge */}
          {isBestSeller && (
            <div>
              <span className="inline-flex items-center rounded bg-[#ffd100] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#161616] shadow-2xs">
                BEST SELLER
              </span>
            </div>
          )}

          {/* Title */}
          <h4 className="text-sm sm:text-base font-bold text-[#161616] leading-snug group-hover:text-[#027D88] transition-colors line-clamp-2">
            <Link
              href={`/courses/${course.id}`}
              className="focus-visible:outline-none focus-visible:underline"
            >
              {course.title}
            </Link>
          </h4>

          {/* Teacher Line */}
          <p className="text-xs text-[#666666] font-medium">
            Khóa học bởi <span className="text-[#161616] font-semibold">{teacherName}</span>
          </p>
        </div>

        {/* Meta Stats Row */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3 text-xs text-[#666666] pt-1 border-t border-neutral-100">
          <div className="flex flex-wrap items-center gap-3">
            {/* Student Count */}
            <div
              className="inline-flex items-center gap-1 font-medium text-[#444444]"
              title={`Tổng số học viên: ${course.studentCount ?? 0}`}
            >
              <Icon icon="lucide:user" className="size-3.5 text-[#666666]" />
              <span>{formatCompactNumber(course.studentCount)}</span>
            </div>

            {/* Rating Stars */}
            {hasReviews ? (
              <div
                className="inline-flex items-center gap-1.5"
                title={`Đánh giá: ${displayRating.toFixed(1)} / 5 sao (${course.reviewCount ?? 0} đánh giá)`}
              >
                <span className="font-extrabold text-[#161616]">{displayRating.toFixed(1)}</span>
                <div className="flex items-center gap-0.5 text-[#ffd100]" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((starIndex) => (
                    <Icon
                      key={`star-${starIndex}`}
                      icon="lucide:star"
                      className={`size-3.5 ${starIndex <= filledStars ? 'fill-[#ffd100] text-[#ffd100]' : 'text-neutral-300'
                        }`}
                    />
                  ))}
                </div>
                <span className="text-neutral-400">({formatCompactNumber(course.reviewCount)})</span>
              </div>
            ) : (
              <span>Chưa có đánh giá</span>
            )}
          </div>

          {/* Price Tag */}
          <div className="flex items-center gap-2">
            {hasDiscount && course.originalPrice && (
              <span className="text-xs text-neutral-400 line-through">
                {formatCoursePrice(course.originalPrice)}
              </span>
            )}
            <span className="font-bold text-xs sm:text-sm text-[#027D88]">
              {formatCoursePrice(course.price)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
