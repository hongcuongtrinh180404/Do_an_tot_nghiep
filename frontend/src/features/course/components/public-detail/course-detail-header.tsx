'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CourseLevelEnum } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import type { IPublicCourseDetailResponse } from '../../api/enrollment.api';

interface CourseDetailHeaderProps {
  course: IPublicCourseDetailResponse;
  totalLessonsCount: number;
  totalDurationFormatted: string;
}

const levelLabels: Record<CourseLevelEnum, { name: string; dots: number }> = {
  [CourseLevelEnum.BEGINNER]: { name: 'Cơ bản', dots: 1 },
  [CourseLevelEnum.INTERMEDIATE]: { name: 'Trung cấp', dots: 2 },
  [CourseLevelEnum.ADVANCED]: { name: 'Nâng cao', dots: 3 },
  [CourseLevelEnum.ALL_LEVELS]: { name: 'Mọi trình độ', dots: 1 },
};

export function CourseDetailHeader({
  course,
  totalLessonsCount,
  totalDurationFormatted,
}: CourseDetailHeaderProps): React.JSX.Element {
  const levelInfo = levelLabels[course.level] || { name: 'Cơ bản', dots: 1 };

  return (
    <header className="space-y-4">
      {/* 1. Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1.5 text-xs text-[#666666]">
        <Link href="/" className="hover:text-[#161616] transition-colors">
          Trang chủ
        </Link>
        <span aria-hidden="true" className="text-neutral-400">/</span>
        <Link href="/courses" className="hover:text-[#161616] transition-colors">
          Khóa học
        </Link>
        {course.category && (
          <>
            <span aria-hidden="true" className="text-neutral-400">/</span>
            <Link
              href={`/courses?category=${encodeURIComponent(course.category.slug)}`}
              className="hover:text-[#161616] transition-colors"
            >
              {course.category.name}
            </Link>
          </>
        )}
        <span aria-hidden="true" className="text-neutral-400">/</span>
        <span className="text-[#161616] font-medium truncate max-w-[280px] sm:max-w-[420px]" aria-current="page">
          {course.title}
        </span>
      </nav>

      {/* 2. Top Badges */}
      <div className="pt-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Best Seller Badge */}
          <span className="inline-flex items-center gap-1 rounded bg-[#ffd100] px-2.5 py-1 text-xs font-bold text-[#161616] uppercase tracking-wide">
            <Icon icon="lucide:award" className="size-3.5" />
            <span>Best Seller</span>
          </span>

          {/* Category Badge */}
          {course.category && (
            <span className="rounded bg-[#161616] px-2.5 py-1 text-xs font-semibold text-white">
              {course.category.name}
            </span>
          )}

          {/* Level Badge with Dots */}
          <div
            className="inline-flex items-center gap-1.5 rounded bg-neutral-100 px-2.5 py-1 text-xs font-medium text-[#161616] border border-[#e5e7eb]"
            title={`Trình độ: ${levelInfo.name}`}
          >
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((dot) => (
                <span
                  key={dot}
                  className={`size-1.5 rounded-full ${
                    dot <= levelInfo.dots ? 'bg-[#027D88]' : 'bg-neutral-300'
                  }`}
                />
              ))}
            </div>
            <span>{levelInfo.name}</span>
          </div>
        </div>
      </div>

      {/* 3. Main Course Title */}
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#161616] tracking-tight leading-tight">
        {course.title}
      </h1>

      {/* 4. Instructor Byline */}
      <div className="flex items-center gap-3 pt-0.5">
        <div className="relative size-8 rounded-full overflow-hidden shrink-0 border border-[#e5e7eb] bg-neutral-100">
          {course.instructor?.avatarUrl ? (
            <Image
              src={course.instructor.avatarUrl}
              alt={course.instructor.fullName}
              fill
              sizes="32px"
              className="object-cover"
            />
          ) : (
            <div className="size-full flex items-center justify-center text-neutral-600 font-bold text-xs">
              {course.instructor?.fullName?.charAt(0) || 'G'}
            </div>
          )}
        </div>
        <div className="text-xs sm:text-sm text-[#666666]">
          <span>Khóa học bởi </span>
          <strong className="text-[#161616] font-bold">
            {course.instructor?.fullName || 'Giảng viên Mindly'}
          </strong>
          <span className="hidden sm:inline text-neutral-400"> • </span>
          <span className="block sm:inline text-neutral-500 text-xs">Chuyên gia đào tạo công nghệ</span>
        </div>
      </div>

      {/* 5. Key Statistics Bar */}
      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1 text-xs text-[#666666]">
        {/* Rating */}
        {course.reviewCount && course.reviewCount > 0 ? (
          <div className="flex items-center gap-1 font-bold text-[#161616]">
            <Icon icon="lucide:star" className="size-4 fill-[#ffd100] text-[#ffd100]" />
            <span>{(course.ratingAvg ?? 0).toFixed(1)}</span>
            <span className="font-normal text-[#666666]">({course.reviewCount} đánh giá)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 font-medium text-[#666666]">
            <Icon icon="lucide:star" className="size-4 text-neutral-300" />
            <span>Chưa có đánh giá</span>
          </div>
        )}

        <span aria-hidden="true" className="text-neutral-300">•</span>

        {/* Student Count */}
        <div className="flex items-center gap-1.5">
          <Icon icon="lucide:users" className="size-4 text-[#666666]" />
          <span>15.409 học viên</span>
        </div>

        <span aria-hidden="true" className="text-neutral-300">•</span>

        {/* Lesson & Duration */}
        <div className="flex items-center gap-1.5">
          <Icon icon="lucide:play-circle" className="size-4 text-[#666666]" />
          <span>
            {totalLessonsCount} bài giảng ({totalDurationFormatted})
          </span>
        </div>

        <span aria-hidden="true" className="text-neutral-300">•</span>

        {/* Trình độ */}
        <div className="flex items-center gap-1.5">
          <Icon icon="lucide:bar-chart-2" className="size-4 text-[#666666]" />
          <span>Trình độ: {levelInfo.name}</span>
        </div>
      </div>
    </header>
  );
}
