'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DeleteConfirmDialog, ActionConfirmDialog } from '@/components/shared/dialog';
import type { ICourse } from '../types/course.types';
import { CourseLevelEnum, CourseStatusEnum } from '../types/course.types';
import {
  useDeleteCourseMutation,
  useArchiveCourseMutation,
  useUnarchiveCourseMutation,
  useCourseSectionsQuery,
} from '../api/course.api';
import { useCancelCourseApprovalMutation } from '../api/course-approval.api';
import { formatCourseDescription } from '../utils/format-course-description.util';

interface CourseCardProps {
  course: ICourse;
}

const statusBadgeMap: Record<CourseStatusEnum, { label: string; className: string }> = {
  [CourseStatusEnum.DRAFT]: {
    label: 'Bản nháp',
    className: 'bg-amber-600/90 text-white',
  },
  [CourseStatusEnum.PENDING_APPROVAL]: {
    label: 'Chờ duyệt',
    className: 'bg-sky-600/90 text-white',
  },
  [CourseStatusEnum.PUBLISHED]: {
    label: 'Đã xuất bản',
    className: 'bg-emerald-600/90 text-white',
  },
  [CourseStatusEnum.ARCHIVED]: {
    label: 'Ngừng bán',
    className: 'bg-neutral-600/90 text-white',
  },
};

const levelMap: Record<CourseLevelEnum, string> = {
  [CourseLevelEnum.BEGINNER]: 'Cơ bản',
  [CourseLevelEnum.INTERMEDIATE]: 'Trung cấp',
  [CourseLevelEnum.ADVANCED]: 'Nâng cao',
  [CourseLevelEnum.ALL_LEVELS]: 'Mọi cấp độ',
};

function getCategoryIcon(name?: string | null): string {
  if (!name) return '💻';
  const lower = name.toLowerCase();
  if (lower.includes('thiết kế') || lower.includes('design') || lower.includes('figma') || lower.includes('đồ họa')) {
    return '🎨';
  }
  if (lower.includes('marketing') || lower.includes('seo') || lower.includes('kinh doanh') || lower.includes('kinh tế')) {
    return '📈';
  }
  if (lower.includes('ngoại ngữ') || lower.includes('tiếng') || lower.includes('language') || lower.includes('english')) {
    return '🌐';
  }
  if (lower.includes('âm nhạc') || lower.includes('music')) {
    return '🎵';
  }
  return '💻';
}

function formatPrice(price?: number): { text: string; isFree: boolean } {
  if (price === undefined || price === null || price === 0) {
    return { text: 'Miễn phí', isFree: true };
  }
  return {
    text: `${price.toLocaleString('vi-VN')} đ`,
    isFree: false,
  };
}

function formatCourseStructure(
  sectionsCount?: number,
  lessonsCount?: number,
  totalDuration?: number,
): string {
  const parts: string[] = [];

  if (typeof sectionsCount === 'number' && sectionsCount > 0) {
    parts.push(`${sectionsCount} chương`);
  }

  if (typeof lessonsCount === 'number' && lessonsCount > 0) {
    parts.push(`${lessonsCount} bài giảng`);
  }

  if (typeof totalDuration === 'number' && totalDuration > 0) {
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    if (hours > 0 && minutes > 0) {
      parts.push(`${hours} giờ ${minutes} phút`);
    } else if (hours > 0) {
      parts.push(`${hours} giờ`);
    } else if (minutes > 0) {
      parts.push(`${minutes} phút`);
    } else {
      parts.push('< 1 phút');
    }
  }

  if (parts.length === 0) {
    return 'Đang cập nhật nội dung bài giảng';
  }

  return parts.join(' • ');
}

function getCategoryThemedBackground(categoryName?: string | null): {
  bgClass: string;
  badgeEmoji: string;
  badgeLabel: string;
} {
  if (!categoryName) {
    return {
      bgClass: 'bg-gradient-to-br from-slate-900 via-neutral-900 to-slate-950',
      badgeEmoji: '💻',
      badgeLabel: 'Công nghệ thông tin',
    };
  }

  const lower = categoryName.toLowerCase();
  if (lower.includes('thiết kế') || lower.includes('design') || lower.includes('figma') || lower.includes('đồ họa')) {
    return {
      bgClass: 'bg-gradient-to-br from-[#121826] via-[#1e1b4b] to-[#0f172a]',
      badgeEmoji: '🎨',
      badgeLabel: categoryName,
    };
  }

  if (lower.includes('marketing') || lower.includes('seo') || lower.includes('kinh doanh') || lower.includes('kinh tế')) {
    return {
      bgClass: 'bg-gradient-to-br from-[#0284c7] via-[#0369a1] to-[#0c4a6e]',
      badgeEmoji: '📈',
      badgeLabel: categoryName,
    };
  }

  if (lower.includes('ngoại ngữ') || lower.includes('tiếng') || lower.includes('language') || lower.includes('english')) {
    return {
      bgClass: 'bg-gradient-to-br from-[#047857] via-[#065f46] to-[#064e3b]',
      badgeEmoji: '🌐',
      badgeLabel: categoryName,
    };
  }

  return {
    bgClass: 'bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]',
    badgeEmoji: '💻',
    badgeLabel: categoryName,
  };
}

export function CourseCard({ course }: CourseCardProps): React.JSX.Element {
  const [imageError, setImageError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelApprovalDialogOpen, setIsCancelApprovalDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isUnarchiveDialogOpen, setIsUnarchiveDialogOpen] = useState(false);

  const { data: sections } = useCourseSectionsQuery(course.id);
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

  const statusBadge = statusBadgeMap[course.status] ?? {
    label: course.status,
    className: 'bg-neutral-600 text-white',
  };
  const levelText = levelMap[course.level] ?? 'Mọi cấp độ';
  const priceInfo = formatPrice(course.price);
  const structureText = formatCourseStructure(
    sections?.length,
    course.lessonsCount,
    course.totalDuration,
  );
  const hasValidThumbnail = Boolean(course.thumbnailUrl && course.thumbnailUrl.trim() && !imageError);
  const theme = getCategoryThemedBackground(course.category?.name);
  const courseSummary = formatCourseDescription(course.description, course.title);

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
      <div className="border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-card rounded-xl overflow-hidden shadow-2xs hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
        <div className="p-4 sm:p-5 flex flex-col md:flex-row items-stretch gap-5">
          {/* Left: Thumbnail with badges */}
          <div className="relative w-full md:w-[240px] lg:w-[260px] shrink-0 aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 group">
            {hasValidThumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.thumbnailUrl!}
                alt={course.title}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className={`w-full h-full ${theme.bgClass} flex flex-col items-center justify-center p-3 text-center select-none`}>
                <span className="text-3xl mb-1 drop-shadow-sm">{theme.badgeEmoji}</span>
                <span className="text-white font-bold text-sm tracking-wide line-clamp-1 drop-shadow-xs">
                  {course.title}
                </span>
                <span className="text-white/80 text-xs font-medium mt-0.5">
                  {theme.badgeLabel}
                </span>
              </div>
            )}

            {/* Top-Left: Status Badge */}
            <div className="absolute top-2.5 left-2.5 z-10">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight shadow-xs ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
            </div>

            {/* Top-Right: Level Badge */}
            <div className="absolute top-2.5 right-2.5 z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium tracking-tight bg-black/60 text-white backdrop-blur-xs">
                <Icon icon="lucide:layers" className="size-3.5 text-neutral-300" />
                <span>{levelText}</span>
              </span>
            </div>
          </div>

          {/* Center: Course Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
            <div className="space-y-2">
              {/* Title & Category */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  href={`/courses/${course.id}?mode=edit`}
                  className="group/title block min-w-0"
                >
                  <h3
                    className="text-lg sm:text-xl font-bold text-neutral-950 dark:text-neutral-50 group-hover/title:text-[#027D88] dark:group-hover/title:text-[#2dd4bf] transition-colors line-clamp-1 tracking-tight"
                    title={course.title}
                  >
                    {course.title}
                  </h3>
                </Link>

                {/* Category Tag */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs sm:text-sm font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700/60 shrink-0">
                  {course.category?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.category.imageUrl}
                      alt=""
                      className="size-4 object-contain rounded-xs"
                    />
                  ) : (
                    <span className="text-sm">{getCategoryIcon(course.category?.name)}</span>
                  )}
                  <span>{course.category?.name ?? 'Công nghệ thông tin'}</span>
                </div>
              </div>

              {/* Short Description */}
              <p
                className="text-sm sm:text-[15px] text-neutral-700 dark:text-neutral-300 line-clamp-1 leading-relaxed"
                title={courseSummary}
              >
                {courseSummary}
              </p>
            </div>

            {/* Consolidated Meta Line: Structure • Students • Rating */}
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <Icon icon="lucide:book-open" className="size-4 text-neutral-500 dark:text-neutral-400" />
                <span className="text-neutral-700 dark:text-neutral-200">{structureText}</span>
              </span>
              <span className="text-neutral-400 dark:text-neutral-600">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Icon icon="lucide:users" className="size-4 text-neutral-500 dark:text-neutral-400" />
                <span className="text-neutral-700 dark:text-neutral-200">{studentsCount} học viên</span>
              </span>
              <span className="text-neutral-400 dark:text-neutral-600">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Icon icon="lucide:star" className="size-4 text-amber-500 fill-amber-500" />
                <span className="text-neutral-900 dark:text-neutral-100 font-bold">
                  {course.ratingAvg && course.ratingAvg > 0 ? course.ratingAvg.toFixed(1) : '5.0'}
                </span>
                <span className="text-neutral-600 dark:text-neutral-400">({course.reviewCount ?? 0} đánh giá)</span>
              </span>
            </div>
          </div>

          {/* Right: Pricing (Top) & Grouped Actions (Bottom) */}
          <div className="w-full md:w-auto shrink-0 flex md:flex-col items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800">
            {/* Price Area */}
            <div className="text-left md:text-right">
              <span className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium mr-1.5">
                Học phí:
              </span>
              <span
                className={`text-lg sm:text-2xl font-extrabold tracking-tight ${priceInfo.isFree
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-neutral-950 dark:text-neutral-50'
                  }`}
              >
                {priceInfo.text}
              </span>
            </div>

            {/* Actions: Direct 'Chỉnh sửa' button and '⋯' dropdown menu */}
            <div className="flex items-center gap-2">
              <Link
                href={`/courses/${course.id}?mode=edit`}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs sm:text-sm font-semibold transition-colors shadow-2xs"
              >
                <Icon icon="lucide:pencil" className="size-4" />
                <span>Chỉnh sửa</span>
              </Link>

              <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      aria-label={`Thao tác khác cho khóa học ${course.title}`}
                      className="size-9 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                    >
                      <Icon icon="lucide:more-horizontal" className="size-4.5" />
                    </button>
                  }
                />
                <PopoverContent
                  align="end"
                  side="bottom"
                  sideOffset={6}
                  className="w-40 p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-lg text-xs flex flex-col gap-0.5 z-50"
                >
                  {/* 1. Xem thử */}
                  <Link
                    href={`/courses/${course.id}`}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Icon icon="lucide:eye" className="size-4 text-neutral-500 shrink-0" />
                    <span>Xem thử</span>
                  </Link>

                  {/* 2. Ngưng bán / Mở bán lại */}
                  {isPublished ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsArchiveDialogOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-left cursor-pointer"
                    >
                      <Icon icon="lucide:pause-circle" className="size-4 text-neutral-500 shrink-0" />
                      <span>Ngưng bán</span>
                    </button>
                  ) : isArchived ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsUnarchiveDialogOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-left cursor-pointer"
                    >
                      <Icon icon="lucide:play-circle" className="size-4 text-neutral-500 shrink-0" />
                      <span>Mở bán lại</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Chỉ áp dụng khi khóa học đang xuất bản"
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-400 opacity-50 cursor-not-allowed rounded-lg text-left"
                    >
                      <Icon icon="lucide:pause-circle" className="size-4 text-neutral-400 shrink-0" />
                      <span>Ngưng bán</span>
                    </button>
                  )}

                  {/* Rút duyệt nếu đang chờ duyệt */}
                  {isPendingApproval && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsCancelApprovalDialogOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors text-left cursor-pointer"
                    >
                      <Icon icon="lucide:undo-2" className="size-4 text-amber-600 shrink-0" />
                      <span>Rút duyệt</span>
                    </button>
                  )}

                  {/* 3. Xóa */}
                  <button
                    type="button"
                    disabled={!canDelete}
                    title={canDelete ? 'Xóa khóa học' : deleteDisabledReason}
                    onClick={() => {
                      if (!canDelete) return;
                      setIsMenuOpen(false);
                      setIsDeleteDialogOpen(true);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${canDelete
                      ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer'
                      : 'text-neutral-400 opacity-50 cursor-not-allowed'
                      }`}
                  >
                    <Icon icon="lucide:trash-2" className="size-4 text-red-600 shrink-0" />
                    <span>Xóa</span>
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
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
