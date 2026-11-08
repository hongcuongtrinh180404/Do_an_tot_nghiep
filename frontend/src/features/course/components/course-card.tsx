'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { DeleteConfirmDialog, ActionConfirmDialog } from '@/components/shared/dialog';
import type { ICourse } from '../types/course.types';
import { CourseLevelEnum, CourseStatusEnum } from '../types/course.types';
import {
  useDeleteCourseMutation,
  useArchiveCourseMutation,
  useUnarchiveCourseMutation,
} from '../api/course.api';
import { useCancelCourseApprovalMutation } from '../api/course-approval.api';

interface CourseCardProps {
  course: ICourse;
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
    label: 'Ngừng bán',
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelApprovalDialogOpen, setIsCancelApprovalDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isUnarchiveDialogOpen, setIsUnarchiveDialogOpen] = useState(false);

  const deleteMutation = useDeleteCourseMutation();
  const cancelApprovalMutation = useCancelCourseApprovalMutation(course.id);
  const archiveMutation = useArchiveCourseMutation(course.id);
  const unarchiveMutation = useUnarchiveCourseMutation(course.id);

  const isPendingApproval = course.status === CourseStatusEnum.PENDING_APPROVAL;
  const isPublished = course.status === CourseStatusEnum.PUBLISHED;
  const isArchived = course.status === CourseStatusEnum.ARCHIVED;
  const studentsCount = course.studentsCount ?? 0;
  const hasStudents = studentsCount > 0;
  const canDelete = !isPendingApproval && !hasStudents;

  let deleteDisabledReason = '';
  if (isPendingApproval) {
    deleteDisabledReason = 'Khóa học đang chờ duyệt. Vui lòng rút yêu cầu duyệt trước khi xóa.';
  } else if (hasStudents) {
    deleteDisabledReason = `Khóa học đã có ${studentsCount} học viên đăng ký. Không thể xóa để bảo đảm quyền lợi học tập của học viên.`;
  }

  const statusInfo = statusMap[course.status] ?? {
    label: course.status,
    className: 'bg-muted text-muted-foreground border-border/50',
  };
  const levelText = levelMap[course.level] ?? 'Mọi cấp độ';
  const priceInfo = formatPrice(course.price);
  const createdDate = formatDate(course.createdAt);

  const handleDelete = () => {
    deleteMutation.mutate(course.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
      },
    });
  };

  const handleCancelApproval = () => {
    cancelApprovalMutation.mutate(undefined, {
      onSuccess: () => {
        setIsCancelApprovalDialogOpen(false);
      },
    });
  };

  const handleArchive = () => {
    archiveMutation.mutate(undefined, {
      onSuccess: () => {
        setIsArchiveDialogOpen(false);
      },
    });
  };

  const handleUnarchive = () => {
    unarchiveMutation.mutate(undefined, {
      onSuccess: () => {
        setIsUnarchiveDialogOpen(false);
      },
    });
  };

  return (
    <>
      <Card className="border-border/50 bg-card/60 shadow-xs hover:border-foreground/30 hover:shadow-sm transition-all flex flex-col justify-between h-full group">
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
          <Link href={`/courses/${course.id}?mode=edit`} className="block group-hover:text-foreground/90">
            <h3
              className="text-base font-semibold text-foreground line-clamp-2 leading-snug tracking-tight hover:underline transition-colors"
              title={course.title}
            >
              {course.title}
            </h3>
          </Link>

          {/* Slug */}
          <p className="flex items-center gap-1 text-xs text-muted-foreground truncate tracking-tight">
            <Icon icon="lucide:link" className="size-3 shrink-0 text-muted-foreground/60" />
            <span className="truncate">{course.slug}</span>
          </p>

          {/* Category Badge */}
          {course.category ? (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/40 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {course.category.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.category.imageUrl}
                  alt=""
                  className="size-3.5 shrink-0 rounded object-contain"
                />
              ) : (
                <Icon icon="lucide:folder" className="size-3 shrink-0" />
              )}
              <span className="truncate">{course.category.name}</span>
            </span>
          ) : null}
        </CardHeader>

        <CardContent className="py-2">
          {/* Short Description */}
          {course.shortDescription ? (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
              {course.shortDescription}
            </p>
          ) : null}

          {/* Price & Students Metrics */}
          <div className="flex items-center justify-between pt-1">
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

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-muted/40 px-2 py-0.5 rounded-md border border-border/30">
              <Icon icon="lucide:users" className="size-3.5 text-muted-foreground/80" />
              <span>{studentsCount} học viên</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-3 pb-3 border-t border-border/40 flex flex-col gap-2.5 text-xs text-muted-foreground">
          {/* Top row: Creation Date & Student Preview */}
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Icon icon="lucide:calendar" className="size-3.5 text-muted-foreground/70" />
              <span>{createdDate}</span>
            </div>

            {isPublished && (
              <Link
                href={`/courses/${course.id}`}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md hover:bg-muted/80 transition-colors inline-flex items-center gap-1 font-medium focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                title="Xem thử với tư cách học viên"
                aria-label={`Xem thử khóa học "${course.title}" với tư cách học viên`}
              >
                <Icon icon="lucide:eye" className="size-3 text-muted-foreground/80" />
                <span>Xem thử</span>
              </Link>
            )}
          </div>

          {/* Bottom row: Action Buttons */}
          <div className="w-full flex items-center justify-between pt-1 border-t border-border/30 gap-1.5">
            {/* Left Actions: Withdraw Approval / Archive / Unarchive */}
            <div className="flex items-center gap-1">
              {isPendingApproval && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCancelApprovalDialogOpen(true)}
                  className="h-7 text-xs px-2 gap-1 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30"
                  title="Rút lại yêu cầu phê duyệt để mở khóa chỉnh sửa hoặc xóa"
                >
                  <Icon icon="lucide:undo-2" className="size-3" />
                  <span>Rút duyệt</span>
                </Button>
              )}

              {isPublished && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsArchiveDialogOpen(true)}
                  className="h-7 text-xs px-2 gap-1 text-zinc-700 dark:text-zinc-300 bg-zinc-500/10 hover:bg-zinc-500/20 border-zinc-500/30"
                  title="Ngừng bán khóa học (học viên đã mua vẫn học bình thường)"
                >
                  <Icon icon="lucide:pause-circle" className="size-3" />
                  <span>Ngừng bán</span>
                </Button>
              )}

              {isArchived && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUnarchiveDialogOpen(true)}
                  className="h-7 text-xs px-2 gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30"
                  title="Mở bán lại khóa học trên danh mục công khai"
                >
                  <Icon icon="lucide:play-circle" className="size-3" />
                  <span>Mở bán lại</span>
                </Button>
              )}

              {/* Delete Button */}
              <span
                className="inline-block"
                title={canDelete ? 'Xóa khóa học' : deleteDisabledReason}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canDelete}
                  onClick={() => setIsDeleteDialogOpen(true)}
                  aria-label={canDelete ? `Xóa khóa học ${course.title}` : `Không thể xóa: ${deleteDisabledReason}`}
                  className={`h-7 text-xs px-2 gap-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden ${
                    canDelete
                      ? 'text-destructive hover:bg-destructive/10 border-destructive/30'
                      : 'opacity-50 cursor-not-allowed text-muted-foreground'
                  }`}
                >
                  <Icon icon="lucide:trash-2" className="size-3" />
                  <span>Xóa</span>
                </Button>
              </span>
            </div>

            {/* Right Action: Edit Link */}
            <Link
              href={`/courses/${course.id}?mode=edit`}
              className="inline-flex items-center gap-1 text-xs text-foreground/80 hover:text-foreground font-semibold px-2 py-1 rounded-md hover:bg-muted/60 transition-colors shrink-0 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Icon icon="lucide:pencil" className="size-3" />
              <span>Chỉnh sửa</span>
              <Icon icon="lucide:chevron-right" className="size-3" />
            </Link>
          </div>
        </CardFooter>
      </Card>

      {/* 1. Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Xác nhận xóa khóa học"
        itemName={course.title}
        description={`Bạn có chắc chắn muốn xóa khóa học "${course.title}" không? Toàn bộ chương, bài học, tài liệu và sơ đồ tư duy liên quan sẽ được xóa. Thao tác này không thể hoàn tác.`}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        confirmText="Xác nhận xóa"
      />

      {/* 2. Cancel Approval Dialog */}
      <ActionConfirmDialog
        open={isCancelApprovalDialogOpen}
        onOpenChange={setIsCancelApprovalDialogOpen}
        title="Hủy yêu cầu phê duyệt"
        itemName={course.title}
        variant="warning"
        icon="lucide:undo-2"
        description={`Bạn có chắc chắn muốn rút lại yêu cầu phê duyệt cho khóa học "${course.title}"?`}
        noticeText="Khóa học sẽ chuyển về trạng thái Bản nháp và mở khóa toàn bộ quyền chỉnh sửa nội dung cũng như cho phép xóa khóa học."
        onConfirm={handleCancelApproval}
        isLoading={cancelApprovalMutation.isPending}
        confirmText="Xác nhận rút duyệt"
      />

      {/* 3. Archive (Ngừng bán) Dialog */}
      <ActionConfirmDialog
        open={isArchiveDialogOpen}
        onOpenChange={setIsArchiveDialogOpen}
        title="Xác nhận ngừng bán khóa học"
        itemName={course.title}
        variant="info"
        icon="lucide:pause-circle"
        description={`Khóa học "${course.title}" sẽ được chuyển sang chế độ "Ngừng bán" (Lưu trữ) và ẩn khỏi danh mục công khai.`}
        noticeText={`Học viên mới sẽ không thể mua, nhưng tất cả ${studentsCount} học viên đã mua trước đó vẫn được giữ nguyên 100% quyền học tập bình thường.`}
        onConfirm={handleArchive}
        isLoading={archiveMutation.isPending}
        confirmText="Xác nhận ngừng bán"
      />

      {/* 4. Unarchive (Mở bán lại) Dialog */}
      <ActionConfirmDialog
        open={isUnarchiveDialogOpen}
        onOpenChange={setIsUnarchiveDialogOpen}
        title="Xác nhận mở bán lại khóa học"
        itemName={course.title}
        variant="success"
        icon="lucide:play-circle"
        description={`Bạn có muốn mở bán lại khóa học "${course.title}"?`}
        noticeText="Khóa học sẽ xuất hiện trở lại trên danh mục công khai để học viên mới có thể tìm kiếm và đăng ký tham gia khóa học."
        onConfirm={handleUnarchive}
        isLoading={unarchiveMutation.isPending}
        confirmText="Mở bán lại"
      />
    </>
  );
}
