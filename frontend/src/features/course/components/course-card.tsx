import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import type { ICourse } from '../types/course.types';
import { CourseLevelEnum, CourseStatusEnum } from '../types/course.types';

interface CourseCardProps {
  course: ICourse;
}

const statusMap: Record<CourseStatusEnum, { label: string; className: string }> = {
  [CourseStatusEnum.DRAFT]: {
    label: 'Bản nháp',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  },
  [CourseStatusEnum.PUBLISHED]: {
    label: 'Đã xuất bản',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  },
  [CourseStatusEnum.ARCHIVED]: {
    label: 'Lưu trữ',
    className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  },
};

const levelMap: Record<CourseLevelEnum, string> = {
  [CourseLevelEnum.BEGINNER]: 'Cơ bản',
  [CourseLevelEnum.INTERMEDIATE]: 'Trung cấp',
  [CourseLevelEnum.ADVANCED]: 'Nâng cao',
  [CourseLevelEnum.ALL_LEVELS]: 'Mọi cấp độ',
};

function formatPrice(price?: number): { text: string; isFree: boolean } {
  if (price === undefined || price === null || price === 0) {
    return { text: 'Miễn phí', isFree: true };
  }
  return {
    text: new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price),
    isFree: false,
  };
}

function formatDate(dateValue: Date | string): string {
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return '';
  }
}

export function CourseCard({ course }: CourseCardProps): React.JSX.Element {
  const statusInfo = statusMap[course.status] ?? {
    label: course.status,
    className: 'bg-muted text-muted-foreground border-border/50',
  };
  const levelText = levelMap[course.level] ?? 'Mọi cấp độ';
  const priceInfo = formatPrice(course.price);
  const createdDate = formatDate(course.createdAt);

  return (
    <Card className="cursor-default border-border/50 bg-card/60 shadow-xs hover:border-border transition-colors flex flex-col justify-between">
      <CardHeader className="space-y-2 pb-3">
        {/* Status & Level Badges */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.className}`}
          >
            {statusInfo.label}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40 font-medium">
            <Icon icon="lucide:layers" className="size-3" />
            {levelText}
          </span>
        </div>

        {/* Title */}
        <h3
          className="text-base font-semibold text-foreground line-clamp-2 leading-snug tracking-tight"
          title={course.title}
        >
          {course.title}
        </h3>

        {/* Slug */}
        <p className="flex items-center gap-1 text-xs text-muted-foreground font-mono truncate">
          <Icon icon="lucide:link" className="size-3 shrink-0 text-muted-foreground/60" />
          <span className="truncate">{course.slug}</span>
        </p>
      </CardHeader>

      <CardContent className="py-2">
        {/* Short Description (if present) */}
        {course.shortDescription ? (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
            {course.shortDescription}
          </p>
        ) : null}

        {/* Price Display */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-muted-foreground">Học phí:</span>
          <span
            className={`text-sm font-semibold ${
              priceInfo.isFree
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-foreground'
            }`}
          >
            {priceInfo.text}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-3 pb-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Icon icon="lucide:calendar" className="size-3.5 text-muted-foreground/70" />
          <span>Ngày tạo: {createdDate}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
