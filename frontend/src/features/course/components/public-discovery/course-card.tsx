'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CourseLevelEnum, type ICourseLearningProgress } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import type { IPublicCourseCard } from '../../types/public-course.types';
import { useUserCourseOwnership } from '../../hooks/use-user-course-ownership';

export interface CourseCardProps {
  course: IPublicCourseCard;
  /**
   * Tùy chọn truyền trực tiếp trạng thái sở hữu (hữu ích cho unit test hoặc khi component cha đã có sẵn context).
   * Nếu không truyền, CourseCard sẽ tự động tra cứu từ hook `useUserCourseOwnership`.
   */
  isEnrolled?: boolean;
  /**
   * Tiến độ học tập của người dùng (khi hiển thị trong Khóa học của tôi)
   */
  progress?: ICourseLearningProgress | null;
  /**
   * ID bài học dở dang để nút hành động dẫn trực tiếp vào phòng học
   */
  resumeLessonId?: string | null;
  /**
   * Callback khi người dùng nhấp vào thông tin giảng viên (ví dụ mở dialog xem hồ sơ)
   */
  onInstructorClick?: (instructorId?: string) => void;
}

export function CourseCard({
  course,
  isEnrolled: propIsEnrolled,
  progress,
  resumeLessonId,
  onInstructorClick,
}: CourseCardProps): React.JSX.Element {
  const { isCourseOwned, isCheckingOwnership } = useUserCourseOwnership();
  const isEnrolled = typeof propIsEnrolled === 'boolean' ? propIsEnrolled : isCourseOwned(course);
  // Level Dots calculation
  const renderLevelDots = (level: CourseLevelEnum): React.JSX.Element => {
    let filledCount = 1;
    let levelText = 'Cơ bản';

    if (level === CourseLevelEnum.INTERMEDIATE) {
      filledCount = 2;
      levelText = 'Trung cấp';
    } else if (level === CourseLevelEnum.ADVANCED) {
      filledCount = 3;
      levelText = 'Nâng cao';
    } else if (level === CourseLevelEnum.ALL_LEVELS) {
      filledCount = 1;
      levelText = 'Mọi trình độ';
    }

    return (
      <div className="flex items-center gap-1.5" title={`Cấp độ: ${levelText}`}>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3].map((dotIndex) => (
            <span
              key={`dot-${dotIndex}`}
              className={`size-1.5 rounded-full ${dotIndex <= filledCount ? 'bg-white' : 'bg-white/40'
                }`}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-white/95">{levelText}</span>
      </div>
    );
  };

  // Format currency in VNĐ with "đ" symbol matching design
  const formatVND = (price: number): string => {
    if (price === 0) return 'Miễn phí';
    return `${price.toLocaleString('vi-VN')} đ`;
  };

  const hasDiscount = Boolean(
    course.originalPrice &&
    course.originalPrice > course.price &&
    course.price > 0
  );

  const discountPercent =
    hasDiscount && course.originalPrice
      ? Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100)
      : null;

  const isBestSeller = Boolean(
    course.isFeatured ??
    (course.studentCount >= 5 || (course.reviewCount > 0 && course.rating >= 4.5))
  );

  return (
    <article
      data-ui="card"
      className="group flex h-full flex-col rounded-xl border border-[#e5e7eb] bg-white overflow-hidden shadow-xs transition-all duration-200 hover:border-[#027D88]/40 hover:shadow-md"
    >
      {/* 16:9 Thumbnail Cover with Overlays */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#f2f2f2]">
        <Link
          href={`/courses/${course.id}`}
          aria-label={`Xem chi tiết khóa học ${course.title}`}
          className="relative block size-full focus-visible:outline-2 focus-visible:outline-[#027D88]"
        >
          {course.thumbnailUrl ? (
            <Image
              src={course.thumbnailUrl}
              alt={course.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-[#f2f2f2] text-[#666666]">
              <Icon icon="lucide:book-open" className="size-10 text-muted-foreground/60" />
            </div>
          )}
        </Link>

        {/* Top-Left Badges */}
        <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5 pointer-events-none">
          {isBestSeller && (
            <span className="rounded bg-[#ffd100] px-2 py-0.5 text-[11px] font-bold text-[#161616] uppercase tracking-wide shadow-xs">
              BEST SELLER
            </span>
          )}
          {course.categoryName && (
            <span className="rounded bg-[#161616]/85 backdrop-blur-xs px-2.5 py-0.5 text-xs font-semibold text-white shadow-xs">
              {course.categoryName}
            </span>
          )}
        </div>

        {/* Top-Right Red Corner Ribbon */}
        {hasDiscount && discountPercent !== null && (
          <div className="absolute top-0 right-0 z-20 size-24 overflow-hidden pointer-events-none">
            <div className="absolute top-[18px] -right-[34px] w-[130px] rotate-45 bg-[#c62828] py-0.5 text-center shadow-md">
              <span className="text-[11px] font-black uppercase tracking-wider text-white">
                GIẢM {discountPercent}%
              </span>
            </div>
          </div>
        )}

        {/* Bottom Bar: Level dots + Video Duration */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-[#161616]/80 px-3 py-1.5 text-xs text-white pointer-events-none">
          {renderLevelDots(course.level)}

          <div className="flex items-center gap-1.5 text-xs font-medium text-white/95">
            <Icon icon="lucide:clock" className="size-3.5 text-white/80" />
            <span>{course.durationFormatted || 'Nhiều bài học'}</span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title: 2 lines clamp */}
        <h3 className="line-clamp-2 text-sm sm:text-base font-bold text-[#161616] leading-snug group-hover:text-[#027D88] transition-colors">
          <Link href={`/courses/${course.id}`}>
            {course.title}
          </Link>
        </h3>

        {/* Instructor */}
        <div className="mt-1.5 flex items-center gap-2">
          {onInstructorClick ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onInstructorClick(course.instructorId);
              }}
              className="group/inst flex items-center gap-2 text-left hover:opacity-85 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#027D88] rounded-md py-0.5"
              title="Xem hồ sơ & danh sách khóa học của giảng viên"
            >
              {course.instructorAvatar ? (
                <div className="relative size-5 rounded-full overflow-hidden shrink-0 border border-[#e5e7eb]">
                  <Image
                    src={course.instructorAvatar}
                    alt={course.instructorName}
                    fill
                    sizes="20px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex size-5 items-center justify-center rounded-full bg-muted border border-[#e5e7eb] text-[10px] font-semibold text-muted-foreground">
                  {course.instructorName ? course.instructorName.charAt(0).toUpperCase() : 'G'}
                </div>
              )}
              <span className="truncate text-xs font-medium text-[#161616] group-hover/inst:text-[#027D88] group-hover/inst:underline transition-colors">
                {course.instructorName || 'Chuyên gia Mindly'}
              </span>
            </button>
          ) : (
            <>
              {course.instructorAvatar ? (
                <div className="relative size-5 rounded-full overflow-hidden shrink-0 border border-[#e5e7eb]">
                  <Image
                    src={course.instructorAvatar}
                    alt={course.instructorName}
                    fill
                    sizes="20px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex size-5 items-center justify-center rounded-full bg-muted border border-[#e5e7eb] text-[10px] font-semibold text-muted-foreground">
                  {course.instructorName ? course.instructorName.charAt(0).toUpperCase() : 'G'}
                </div>
              )}
              <span className="truncate text-xs font-medium text-[#161616]">
                {course.instructorName || 'Chuyên gia Mindly'}
              </span>
            </>
          )}
        </div>

        {/* Stats: Rating + Student Count */}
        <div className="mt-2 flex items-center gap-2 text-xs text-[#666666]">
          {course.reviewCount > 0 ? (
            <div className="flex items-center gap-1 font-semibold text-[#161616]">
              <Icon icon="lucide:star" className="size-3.5 fill-[#ffd100] text-[#ffd100]" />
              <span>{course.rating.toFixed(1)}</span>
              <span className="text-xs font-normal text-[#666666]">({course.reviewCount})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-[#666666]">
              <Icon icon="lucide:star" className="size-3.5 text-neutral-300" />
              <span>Chưa có đánh giá</span>
            </div>
          )}
          <span>•</span>
          <div className="flex items-center gap-1 text-xs">
            <Icon icon="lucide:users" className="size-3.5 text-[#666666]" />
            <span>{course.studentCount.toLocaleString('vi-VN')} học viên</span>
          </div>
        </div>

        {/* Learning Progress (if progress is provided) */}
        {progress ? (
          <div className="mt-3 pt-2.5 border-t border-neutral-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#161616]">
                {progress.status === 'COMPLETED'
                  ? 'Đã hoàn thành'
                  : progress.status === 'IN_PROGRESS'
                    ? 'Đang học'
                    : 'Chưa bắt đầu'}
              </span>
              <span className="font-bold text-[#027D88] tabular-nums">
                {progress.progressPercent !== null && progress.progressPercent !== undefined
                  ? `${progress.progressPercent.toLocaleString('vi-VN', {
                    minimumFractionDigits: progress.progressPercent % 1 === 0 ? 0 : 2,
                    maximumFractionDigits: 2,
                  })}%`
                  : 'Chưa xác định'}
              </span>
            </div>
            {progress.progressPercent !== null && (
              <div
                role="progressbar"
                aria-label="Tiến độ khóa học theo số bài hoàn thành"
                aria-valuenow={progress.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-gradient-to-r from-[#027D88] to-[#00a3af] rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, progress.progressPercent))}%`,
                  }}
                />
              </div>
            )}
            <p className="text-[11px] text-[#666666] tabular-nums">
              {progress.totalLessons > 0
                ? `${progress.completedLessons}/${progress.totalLessons} bài học hoàn thành`
                : 'Khóa học chưa có bài video'}
            </p>
          </div>
        ) : null}

        {/* Bottom Integrated Action Button */}
        <div data-ui="card-footer" className="mt-auto pt-3.5">
          {isCheckingOwnership && propIsEnrolled === undefined ? (
            <div
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-400 font-semibold py-2.5 px-3 text-xs sm:text-sm animate-pulse"
              aria-label="Đang kiểm tra quyền sở hữu khóa học"
            >
              <Icon icon="lucide:loader-2" className="size-4 animate-spin text-[#027D88]" />
              <span>Đang kiểm tra...</span>
            </div>
          ) : isEnrolled ? (
            <Link
              href={
                resumeLessonId
                  ? `/courses/${course.id}/lessons/${resumeLessonId}`
                  : `/courses/${course.id}`
              }
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-2.5 px-3 text-xs sm:text-sm transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#027D88]"
            >
              <Icon icon="lucide:play-circle" className="size-4 shrink-0 text-white" />
              <span>
                {resumeLessonId || (progress && progress.status === 'IN_PROGRESS')
                  ? 'Tiếp tục học'
                  : 'Vào học'}
              </span>
            </Link>
          ) : (
            <Link
              href={`/courses/${course.id}`}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-2.5 px-3 text-xs sm:text-sm transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#027D88]"
            >
              <Icon icon="lucide:shopping-cart" className="size-4 shrink-0 text-white" />
              <span>
                {course.price === 0 ? 'Đăng ký miễn phí' : 'Mua ngay'}
              </span>
              <span>•</span>
              <span className="text-sm font-extrabold tracking-tight">
                {formatVND(course.price)}
              </span>
              {hasDiscount && course.originalPrice && (
                <span className="text-xs font-normal text-white/70 line-through">
                  {formatVND(course.originalPrice)}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
