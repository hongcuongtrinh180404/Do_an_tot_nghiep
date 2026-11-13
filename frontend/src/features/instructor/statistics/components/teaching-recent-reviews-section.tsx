'use client';

import * as React from 'react';
import Image from 'next/image';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { RatingStars } from '@/components/shared/rating/rating-stars';
import type { IReview, ICourse } from 'share-lib';
import { formatDateTimeVn } from '@/features/admin/revenue/utils/revenue-format.util';
import type { IPaginatedResult } from '../api/teaching-stats.api';

interface TeachingRecentReviewsSectionProps {
  data?: IPaginatedResult<IReview>;
  isLoading?: boolean;
  courses: ICourse[];
  selectedCourseId: string;
  onCourseChange: (id: string) => void;
  selectedRating?: number;
  onRatingChange: (rating?: number) => void;
  sort: 'created_desc' | 'created_asc';
  onSortChange: (sort: 'created_desc' | 'created_asc') => void;
  page: number;
  onPageChange: (page: number) => void;
}

const STAR_PILLS: { value?: number; label: string }[] = [
  { value: undefined, label: 'Tất cả sao' },
  { value: 5, label: '5 sao' },
  { value: 4, label: '4 sao' },
  { value: 3, label: '3 sao' },
  { value: 2, label: '2 sao' },
  { value: 1, label: '1 sao' },
];

export function TeachingRecentReviewsSection({
  data,
  isLoading = false,
  courses,
  selectedCourseId,
  onCourseChange,
  selectedRating,
  onRatingChange,
  sort,
  onSortChange,
  page,
  onPageChange,
}: TeachingRecentReviewsSectionProps): React.JSX.Element {
  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="bg-card rounded-xl border border-border/70 p-5 shadow-2xs space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Đánh giá gần đây
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Lắng nghe ý kiến đóng góp từ học viên để không ngừng hoàn thiện nội dung và chất lượng giảng dạy.
          </p>
        </div>
        <div className="text-xs text-muted-foreground font-medium shrink-0">
          Tổng cộng: <strong className="text-foreground">{total}</strong> nhận xét
        </div>
      </div>

      {/* Toolbar: Course Filter, Star Filter Pills, and Sort */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Course Filter Dropdown & Star Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Course select */}
          <div className="w-56 max-w-full">
            <Select<string>
              value={selectedCourseId}
              onValueChange={(val) => {
                if (val) {
                  onCourseChange(val);
                  onPageChange(1);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs px-2.5 font-medium bg-background border-border/80">
                <span className="truncate">
                  {selectedCourseId === 'all'
                    ? 'Tất cả khóa học'
                    : courses.find((c) => c.id === selectedCourseId)?.title || 'Chọn khóa học'}
                </span>
              </SelectTrigger>
              <SelectContent align="start" className="min-w-56 max-h-60">
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

          {/* Star pills */}
          <div className="flex flex-wrap items-center gap-1">
            {STAR_PILLS.map((pill) => {
              const isSelected = selectedRating === pill.value;
              return (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => {
                    onRatingChange(pill.value);
                    onPageChange(1);
                  }}
                  className={`h-8 px-2.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                    isSelected
                      ? 'bg-foreground text-background border-foreground font-semibold'
                      : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/70'
                  }`}
                >
                  {pill.value ? (
                    <>
                      <span>{pill.value}</span>
                      <Icon icon="lucide:star" className="size-3 fill-amber-500 text-amber-500" />
                    </>
                  ) : (
                    <span>{pill.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
          <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">Sắp xếp:</span>
          <div className="w-36">
            <Select<string>
              value={sort}
              onValueChange={(val) => {
                if (val) {
                  onSortChange(val as 'created_desc' | 'created_asc');
                  onPageChange(1);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs px-2.5 font-medium bg-background border-border/80">
                <span className="truncate">
                  {sort === 'created_desc' ? 'Mới nhất' : 'Cũ nhất'}
                </span>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-36">
                <SelectItem value="created_desc" className="text-xs">
                  Mới nhất
                </SelectItem>
                <SelectItem value="created_asc" className="text-xs">
                  Cũ nhất
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Reviews Cards List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-border/60 bg-muted/20 animate-pulse space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted/60 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-32 bg-muted/60 rounded" />
                  <div className="h-3 w-48 bg-muted/50 rounded" />
                </div>
              </div>
              <div className="h-4 w-24 bg-muted/60 rounded" />
              <div className="h-3.5 w-full bg-muted/50 rounded" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-border/80 bg-muted/20 space-y-2">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Icon icon="lucide:message-square-off" className="size-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Không có nhận xét nào
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Không tìm thấy đánh giá nào phù hợp với bộ lọc hiện tại. Thử đổi mức sao hoặc chọn tất cả khóa học.
            </p>
          </div>
        ) : (
          items.map((review) => {
            const userName = review.user?.fullName || 'Học viên';
            const initial = userName.charAt(0).toUpperCase() || 'H';
            const courseTitle = review.course?.title || 'Khóa học';
            const hasComment = Boolean(review.comment && review.comment.trim());

            return (
              <div
                key={review.id}
                className="p-4 rounded-xl border border-border/60 bg-background hover:border-border transition-colors space-y-2.5"
              >
                {/* Header: User Avatar, Name, Date, Course badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative size-9 rounded-full bg-muted overflow-hidden shrink-0 border border-border/40 flex items-center justify-center text-xs font-bold text-foreground">
                      {review.user?.avatarUrl ? (
                        <Image
                          src={review.user.avatarUrl}
                          alt={userName}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      ) : (
                        <span>{initial}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {userName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateTimeVn(review.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Course Pill */}
                  <div className="shrink-0 self-start sm:self-auto">
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-muted/80 text-muted-foreground font-medium border border-border/50 max-w-[260px] truncate">
                      <Icon icon="lucide:book-open" className="size-3 text-primary shrink-0" />
                      <span className="truncate">{courseTitle}</span>
                    </span>
                  </div>
                </div>

                {/* Rating Stars */}
                <div className="flex items-center gap-2 pt-0.5">
                  <RatingStars rating={review.rating} size="sm" />
                  <span className="text-xs font-bold text-foreground tabular-nums">
                    {review.rating}.0
                  </span>
                </div>

                {/* Comment Content */}
                {hasComment ? (
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap pt-0.5">
                    {review.comment}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/80 italic flex items-center gap-1.5 pt-0.5">
                    <Icon icon="lucide:info" className="size-3.5 shrink-0 text-muted-foreground/60" />
                    <span>Học viên chỉ gửi đánh giá điểm sao, không nhập nhận xét bằng văn bản.</span>
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            Hiển thị trang <strong className="text-foreground">{page}</strong> trên <strong className="text-foreground">{totalPages}</strong>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
              className="h-8 px-2.5 text-xs"
            >
              <Icon icon="lucide:chevron-left" className="size-3.5 mr-1" />
              Trước
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-xs text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={page === p ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onPageChange(p)}
                      className="size-8 p-0 text-xs font-medium"
                    >
                      {p}
                    </Button>
                  </React.Fragment>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
              className="h-8 px-2.5 text-xs"
            >
              Sau
              <Icon icon="lucide:chevron-right" className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

