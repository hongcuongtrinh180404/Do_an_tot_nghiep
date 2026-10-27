'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CourseLevelEnum } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import type { IPublicCourseCard } from './mock-discovery-data';

interface CourseCardProps {
  course: IPublicCourseCard;
}

export function CourseCard({ course }: CourseCardProps): React.JSX.Element {
  // Level Dots calculation (Domestika pattern)
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
              className={`size-1.5 rounded-full ${
                dotIndex <= filledCount ? 'bg-white' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-white/95">{levelText}</span>
      </div>
    );
  };

  // Format currency in VNĐ
  const formatVND = (price: number): string => {
    if (price === 0) return 'Miễn phí';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const discountPercent =
    course.originalPrice && course.originalPrice > course.price
      ? Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100)
      : null;

  return (
    <article data-ui="card" className="group flex h-full flex-col rounded-lg border border-[#e5e7eb] bg-white overflow-hidden transition-colors hover:border-[#161616]">
      
      {/* 16:9 Thumbnail Cover with Facts (Domestika Pattern) */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#f2f2f2]">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#f2f2f2] text-[#666666]">
            <Icon icon="lucide:book-open" className="size-10" />
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5">
          {course.isFeatured && (
            <span className="rounded bg-[#ffd100] px-2 py-0.5 text-xs font-bold text-[#161616] uppercase">
              Best Seller
            </span>
          )}
          <span className="rounded bg-[#161616]/85 px-2 py-0.5 text-xs font-semibold text-white">
            {course.categoryName}
          </span>
        </div>

        {/* Bottom Bar: Level dots + Video Duration */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-[#161616]/80 px-3 py-2 text-xs text-white">
          {renderLevelDots(course.level)}
          
          <div className="flex items-center gap-1 text-xs font-medium text-white/95">
            <Icon icon="lucide:clock" className="size-3 text-white/80" />
            <span>{course.durationFormatted}</span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4">
        
        {/* Title: strict 2 lines clamp */}
        <h3 className="line-clamp-2 text-sm sm:text-base font-bold text-[#161616] leading-snug group-hover:text-[#027D88] transition-colors min-h-[2.5rem]">
          <Link href={`/courses/${course.id}`}>
            {course.title}
          </Link>
        </h3>

        {/* Instructor */}
        <div className="mt-2 flex items-center gap-2">
          {course.instructorAvatar && (
            <div className="relative size-5 rounded-full overflow-hidden shrink-0 border border-[#e5e7eb]">
              <Image
                src={course.instructorAvatar}
                alt={course.instructorName}
                fill
                sizes="20px"
                className="object-cover"
              />
            </div>
          )}
          <span className="truncate text-xs text-[#161616] font-medium">
            {course.instructorName}
          </span>
        </div>

        {/* Stats: Rating + Student Count */}
        <div className="mt-2 flex items-center gap-3 text-xs text-[#666666]">
          <div className="flex items-center gap-1 font-semibold text-[#161616]">
            <Icon icon="lucide:star" className="size-3.5 fill-[#ffd100] text-[#ffd100]" />
            <span>{course.rating.toFixed(1)}</span>
            <span className="text-xs font-normal text-[#666666]">({course.reviewCount})</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1 text-xs">
            <Icon icon="lucide:users" className="size-3.5" />
            <span>{course.studentCount.toLocaleString('vi-VN')} học viên</span>
          </div>
        </div>

        {/* AI Capabilities Indicator */}
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#027d88] bg-[#f3fcfc] rounded p-1.5 font-medium">
          <Icon icon="lucide:sparkles" className="size-3.5 text-[#027d88] shrink-0" />
          <span className="truncate">Tích hợp Mindmap AI & Quiz dừng video</span>
        </div>

        {/* Footer Area: Discount info & Teal Buy Button (Domestika Pattern) */}
        <div data-ui="card-footer" className="mt-auto pt-3 border-t border-[#e5e7eb] flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            {discountPercent !== null && course.originalPrice ? (
              <>
                <span className="font-bold text-[#dc2626]">
                  {discountPercent}% Giảm
                </span>
                <span className="text-[#666666] line-through font-normal">
                  {formatVND(course.originalPrice)}
                </span>
              </>
            ) : (
              <span className="text-xs text-[#666666] font-medium">Khóa học chọn lọc</span>
            )}
          </div>

          <Link
            href={`/courses/${course.id}`}
            className="w-full flex items-center justify-center gap-2 rounded bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-2.5 px-3 text-xs sm:text-sm transition-colors shadow-none"
          >
            <Icon icon="lucide:shopping-cart" className="size-4 shrink-0 text-white" />
            <span>
              {course.price === 0 ? 'Đăng ký miễn phí' : `Mua ${formatVND(course.price)}`}
            </span>
          </Link>
        </div>

      </div>
    </article>
  );
}
