'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { RatingStars } from '@/components/shared/rating/rating-stars';
import type { ICourseReviewStats, ICourse } from 'share-lib';

interface TeachingReviewStatsSectionProps {
  stats?: ICourseReviewStats | null;
  isLoading?: boolean;
  courses: ICourse[];
  selectedCourseId: string;
  onCourseChange: (id: string) => void;
}

export function TeachingReviewStatsSection({
  stats,
  isLoading = false,
  courses,
  selectedCourseId,
  onCourseChange,
}: TeachingReviewStatsSectionProps): React.JSX.Element {
  const averageRating = stats?.averageRating ?? 0;
  const totalReviews = stats?.totalReviews ?? 0;
  const distribution = stats?.distribution ?? [
    { stars: 5, count: 0, percentage: 0 },
    { stars: 4, count: 0, percentage: 0 },
    { stars: 3, count: 0, percentage: 0 },
    { stars: 2, count: 0, percentage: 0 },
    { stars: 1, count: 0, percentage: 0 },
  ];

  return (
    <div className="bg-card rounded-xl border border-border/70 p-5 shadow-2xs space-y-5">
      {/* Section Header & Subtitle & Course Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Thống kê đánh giá
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Theo dõi chất lượng đào tạo thông qua điểm số và phân bổ đánh giá hợp lệ từ học viên.
          </p>
        </div>

        {/* Course Filter Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Khóa học:</span>
          <div className="w-64 max-w-full">
            <Select<string>
              value={selectedCourseId}
              onValueChange={(val) => {
                if (val) onCourseChange(val);
              }}
            >
              <SelectTrigger className="h-9 text-xs px-3 font-medium bg-background border-border/80">
                <span className="truncate">
                  {selectedCourseId === 'all'
                    ? 'Tất cả khóa học'
                    : courses.find((c) => c.id === selectedCourseId)?.title || 'Chọn khóa học'}
                </span>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-64 max-h-60">
                <SelectItem value="all" className="text-xs font-semibold">
                  Tất cả khóa học ({courses.length})
                </SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id} className="text-xs">
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Breakdown Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center py-4">
          <div className="text-center md:border-r border-border/60 md:pr-6 space-y-2">
            <div className="h-12 w-24 bg-muted/60 animate-pulse rounded-lg mx-auto" />
            <div className="h-4 w-32 bg-muted/60 animate-pulse rounded mx-auto" />
            <div className="h-3 w-40 bg-muted/50 animate-pulse rounded mx-auto" />
          </div>
          <div className="md:col-span-2 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-3.5 bg-muted/60 animate-pulse rounded" />
            ))}
          </div>
        </div>
      ) : totalReviews > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center py-2">
          {/* Big Score Summary */}
          <div className="text-center md:border-r border-border/60 md:pr-6 space-y-2">
            <div className="text-4xl sm:text-5xl font-black text-foreground tracking-tight tabular-nums">
              {averageRating.toFixed(1)}
            </div>
            <RatingStars rating={averageRating} size="lg" className="justify-center" />
            <p className="text-xs text-muted-foreground font-medium">
              Dựa trên <strong className="text-foreground">{totalReviews.toLocaleString('vi-VN')}</strong> lượt đánh giá hợp lệ
            </p>
          </div>

          {/* 5-Star Distribution Bars */}
          <div className="md:col-span-2 space-y-2.5">
            {distribution.map((item) => (
              <div key={item.stars} className="flex items-center gap-3 text-xs">
                {/* Star label */}
                <div className="w-14 flex items-center gap-1 font-medium text-foreground shrink-0">
                  <span className="w-3 text-right tabular-nums">{item.stars}</span>
                  <Icon icon="lucide:star" className="size-3.5 fill-[#ffd100] text-[#ffd100]" />
                </div>

                {/* Progress bar */}
                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#027D88] transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                  />
                </div>

                {/* Percentage */}
                <span className="w-12 text-right text-xs font-semibold text-foreground tabular-nums shrink-0">
                  {item.percentage}%
                </span>

                {/* Count */}
                <span className="w-16 text-right text-[11px] text-muted-foreground tabular-nums shrink-0">
                  ({item.count.toLocaleString('vi-VN')} lượt)
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-10 text-center space-y-2">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Icon icon="lucide:star-off" className="size-6 text-muted-foreground/70" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Chưa có đánh giá nào
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {selectedCourseId === 'all'
              ? 'Tất cả các khóa học của bạn hiện chưa nhận được đánh giá hợp lệ từ học viên.'
              : 'Khóa học này chưa có lượt đánh giá nào được phê duyệt.'}
          </p>
        </div>
      )}
    </div>
  );
}
