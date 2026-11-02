'use client';

import React from 'react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { useCourseDetailQuery } from '../api/course.api';
import { CourseLevelEnum, CourseStatusEnum } from '../types/course.types';
import { CourseDetailSkeleton } from './course-detail-skeleton';
import { CourseSectionsList } from './course-sections-list';
import { CourseMediaPreview } from './course-media-preview';
import { CourseApprovalDialog } from './course-approval-dialog';
import { useCourseApprovalNavigation, type CourseCurriculumHandle } from '../hooks/use-course-approval-navigation';
import approvalStyles from './course-approval.module.css';
import {
  CourseTitleInlineEdit,
  CoursePriceInlinePopover,
  CourseLevelInlineSelect,
  CourseCategoryInlineSelect,
  CourseShortDescInlineCard,
  CourseDescInlineCard,
} from './inline';

interface CourseDetailContentProps {
  courseId: string;
}

const statusMap: Record<CourseStatusEnum, { label: string; className: string }> = {
  [CourseStatusEnum.DRAFT]: {
    label: 'Bản nháp',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  },
  [CourseStatusEnum.PENDING_APPROVAL]: {
    label: 'Chờ duyệt',
    className: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
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
  [CourseLevelEnum.ALL_LEVELS]: 'Tất cả cấp độ',
};

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
  const rootRef = React.useRef<HTMLDivElement>(null);
  const curriculumRef = React.useRef<CourseCurriculumHandle>(null);
  const approvalNavigation = useCourseApprovalNavigation(rootRef, curriculumRef);

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
      <div className="w-full max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
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

  const isLocked = course.status === CourseStatusEnum.PENDING_APPROVAL;
  const statusInfo = statusMap[course.status] ?? {
    label: course.status,
    className: 'bg-muted text-muted-foreground border-border/50',
  };
  const levelText = levelMap[course.level] ?? 'Mọi cấp độ';
  const createdDate = formatDate(course.createdAt);

  return (
    <div ref={rootRef} className={`${approvalStyles.scope} w-full max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6`}>
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

      {/* 1. Locked Status Alert Banner */}
      {isLocked && (
        <div
          role="status"
          className="flex items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-950 dark:text-sky-100 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0 text-sky-600 dark:text-sky-400">
              <Icon icon="lucide:lock" className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span>Khóa học đang chờ phê duyệt</span>
                <span className="text-[11px] font-medium bg-sky-500/20 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/30">
                  Đang khóa chỉnh sửa
                </span>
              </h4>
              <p className="text-xs text-sky-800/80 dark:text-sky-200/80 mt-0.5">
                Khóa học đang trong quá trình kiểm duyệt của Quản trị viên. Tất cả chức năng chỉnh sửa nội dung tạm thời bị khóa cho đến khi có phản hồi hoặc kết quả phê duyệt.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Rejection / Changes Requested Alert Banner */}
      {course.status === CourseStatusEnum.DRAFT && course.rejectionReason && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-100 shadow-xs"
        >
          <div className="flex items-start gap-3 w-full">
            <div className="size-9 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400 mt-0.5">
              <Icon icon="lucide:alert-triangle" className="size-5" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Quản trị viên yêu cầu chỉnh sửa khóa học
                </h4>
                <span className="text-[11px] font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Cần cập nhật
                </span>
              </div>
              <div className="text-xs sm:text-sm text-foreground bg-background/90 border border-amber-500/25 rounded-lg p-3 font-medium leading-relaxed">
                <span className="font-semibold text-amber-800 dark:text-amber-300 mr-1.5">Lý do:</span>
                {course.rejectionReason}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Vui lòng xem lại và cập nhật khóa học theo yêu cầu trên, sau đó nhấn nút <strong>&quot;Yêu cầu phê duyệt&quot;</strong> để gửi lại cho Quản trị viên.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hero Overview Card */}
      <Card className="border-border/50 bg-card/60 shadow-xs overflow-visible">
        <CardHeader className="space-y-4 pb-6">
          {/* Status & Level Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-course-status=""
                tabIndex={-1}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.className}`}
              >
                {statusInfo.label}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-md border border-border/40 font-medium">
                <Icon icon="lucide:layers" className="size-3" />
                {levelText}
              </span>
              {course.category ? (
                <span className="inline-flex max-w-[220px] items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-md border border-border/40 font-medium">
                  {course.category.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.category.imageUrl}
                      alt=""
                      className="size-3.5 shrink-0 rounded object-contain"
                    />
                  ) : (
                    <Icon icon="lucide:tag" className="size-3 shrink-0" />
                  )}
                  <span className="truncate">{course.category.name}</span>
                </span>
              ) : null}
            </div>
            <CourseApprovalDialog
              key={course.id}
              course={course}
              onNavigateToMissing={approvalNavigation.navigate}
              onOpenChecklist={approvalNavigation.cancel}
            />
          </div>

          {/* Title */}
          <CourseTitleInlineEdit course={course} disabled={isLocked} />
        </CardHeader>

        {/* Quick Stats Grid */}
        <CardContent className="pt-4 border-t border-border/40">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Price Popover */}
            <CoursePriceInlinePopover course={course} disabled={isLocked} />

            {/* Level Select */}
            <CourseLevelInlineSelect course={course} disabled={isLocked} />

            {/* Category Select */}
            <CourseCategoryInlineSelect course={course} disabled={isLocked} />

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
      <CourseShortDescInlineCard course={course} disabled={isLocked} />

      {/* Full Description Section */}
      <CourseDescInlineCard course={course} disabled={isLocked} />

      {/* Course Media (Thumbnail & Trailer with MinIO Upload) */}
      <CourseMediaPreview
        courseId={course.id}
        thumbnailUrl={course.thumbnailUrl}
        trailerUrl={course.trailerUrl}
        readOnly={isLocked}
      />

      {/* Course Curriculum / Sections Section */}
      <CourseSectionsList courseId={courseId} approvalRef={curriculumRef} readOnly={isLocked} />
    </div>
  );
}
