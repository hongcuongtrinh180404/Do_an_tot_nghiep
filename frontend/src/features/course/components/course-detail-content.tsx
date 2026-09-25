'use client';

import React from 'react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { useCourseDetailQuery } from '../api/course.api';
import { CourseLevelEnum, CourseStatusEnum } from '../types/course.types';
import { CourseDetailSkeleton } from './course-detail-skeleton';

interface CourseDetailContentProps {
  courseId: string;
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

export function CourseDetailContent({ courseId }: CourseDetailContentProps): React.JSX.Element {
  const { data: course, isLoading, isError, error, refetch } = useCourseDetailQuery(courseId);

  if (isLoading) {
    return <CourseDetailSkeleton />;
  }

  if (isError || !course) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: { message?: string };
      };
    };
    const status = axiosError?.response?.status;
    const isForbidden = status === 403;
    const isNotFound = status === 404;

    const errorTitle = isForbidden
      ? 'Không có quyền truy cập'
      : isNotFound
        ? 'Khóa học không tồn tại'
        : 'Không thể tải thông tin khóa học';

    const errorDescription = isForbidden
      ? 'Bạn không có quyền xem thông tin khóa học này.'
      : isNotFound
        ? 'Khóa học bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.'
        : 'Đã xảy ra sự cố khi tải dữ liệu từ máy chủ. Vui lòng thử lại sau.';

    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link
          href="/instructor/courses"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <Icon icon="lucide:arrow-left" className="size-3.5 mr-1.5" />
          Quay lại danh sách khóa học
        </Link>

        <Card className="border-destructive/30 bg-destructive/5 p-6 rounded-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Icon icon="lucide:alert-circle" className="size-6 shrink-0 text-destructive" />
              <div>
                <h4 className="font-semibold text-base text-foreground">{errorTitle}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {errorDescription}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/instructor/courses"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Về danh sách
              </Link>
              <button
                type="button"
                onClick={() => {
                  void refetch();
                }}
                className={buttonVariants({ size: 'sm' })}
              >
                <Icon icon="lucide:refresh-cw" className="size-3.5 mr-1.5" />
                Thử lại
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const statusInfo = statusMap[course.status] ?? {
    label: course.status,
    className: 'bg-muted text-muted-foreground border-border/50',
  };
  const levelText = levelMap[course.level] ?? 'Mọi cấp độ';
  const priceInfo = formatPrice(course.price);
  const createdDate = formatDate(course.createdAt);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/40">
        <Link
          href="/instructor/courses"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <Icon icon="lucide:arrow-left" className="size-3.5 mr-1.5" />
          Quay lại danh sách khóa học
        </Link>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Trang Chủ
          </Link>
          <span>/</span>
          <Link href="/instructor/courses" className="hover:text-foreground transition-colors">
            Khóa Học Của Tôi
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {course.title}
          </span>
        </div>
      </div>

      {/* Hero Overview Card */}
      <Card className="border-border/50 bg-card/60 shadow-xs">
        <CardHeader className="space-y-4 pb-6">
          {/* Status & Level Badges */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.className}`}
            >
              {statusInfo.label}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-md border border-border/40 font-medium">
              <Icon icon="lucide:layers" className="size-3" />
              {levelText}
            </span>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
              {course.title}
            </h1>
            {/* Slug badge */}
            <div className="mt-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground bg-muted/60 border border-border/50 px-2.5 py-1 rounded-md">
                <Icon icon="lucide:link" className="size-3 text-muted-foreground/70 shrink-0" />
                <span>{course.slug}</span>
              </span>
            </div>
          </div>
        </CardHeader>

        {/* Quick Stats Grid */}
        <CardContent className="pt-4 border-t border-border/40">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Price */}
            <div className="p-3 rounded-lg bg-muted/25 border border-border/30">
              <span className="text-xs text-muted-foreground block mb-1">Học phí</span>
              <span
                className={`text-sm sm:text-base font-semibold ${
                  priceInfo.isFree
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-foreground'
                }`}
              >
                {priceInfo.text}
              </span>
            </div>

            {/* Level */}
            <div className="p-3 rounded-lg bg-muted/25 border border-border/30">
              <span className="text-xs text-muted-foreground block mb-1">Trình độ</span>
              <span className="text-sm sm:text-base font-semibold text-foreground">
                {levelText}
              </span>
            </div>

            {/* Status */}
            <div className="p-3 rounded-lg bg-muted/25 border border-border/30">
              <span className="text-xs text-muted-foreground block mb-1">Trạng thái</span>
              <span className="text-sm sm:text-base font-semibold text-foreground">
                {statusInfo.label}
              </span>
            </div>

            {/* Created At */}
            <div className="p-3 rounded-lg bg-muted/25 border border-border/30">
              <span className="text-xs text-muted-foreground block mb-1">Ngày tạo</span>
              <span className="text-sm sm:text-base font-semibold text-foreground">
                {createdDate}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Short Description Section */}
      <Card className="border-border/50 bg-card/60 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Icon icon="lucide:file-text" className="size-4 text-muted-foreground" />
            Mô tả ngắn gọn
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {course.shortDescription?.trim() ? (
            <p className="text-sm text-foreground/90 leading-relaxed">
              {course.shortDescription}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              Chưa có mô tả ngắn
            </p>
          )}
        </CardContent>
      </Card>

      {/* Full Description Section */}
      <Card className="border-border/50 bg-card/60 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Icon icon="lucide:align-left" className="size-4 text-muted-foreground" />
            Nội dung mô tả chi tiết
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {course.description?.trim() ? (
            <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans">
              {course.description}
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              Chưa có nội dung mô tả chi tiết
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
