'use client';

import * as React from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  type InstructorTeachingCourse,
  type CourseLevel,
  type TeachingCourseStatus,
} from '../constants/mock-instructor-data';

interface InstructorTeachingCardProps {
  course: InstructorTeachingCourse;
}

export function InstructorTeachingCard({ course }: InstructorTeachingCardProps): React.JSX.Element {
  const [imageError, setImageError] = React.useState(false);

  // Format giá bán
  const formattedPrice = React.useMemo(() => {
    if (course.price === 0) return 'Miễn phí';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(course.price);
  }, [course.price]);

  // Format doanh thu
  const formattedRevenue = React.useMemo(() => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(course.revenue);
  }, [course.revenue]);

  // Badge cấp độ
  const renderLevelBadge = (level: CourseLevel) => {
    switch (level) {
      case 'BEGINNER':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
            Cơ bản
          </span>
        );
      case 'INTERMEDIATE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            Trung cấp
          </span>
        );
      case 'ADVANCED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
            Nâng cao
          </span>
        );
    }
  };

  // Badge trạng thái xuất bản
  const renderStatusBadge = (status: TeachingCourseStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
            <Icon icon="lucide:check-circle-2" className="size-3 text-emerald-500" />
            <span>Đã xuất bản</span>
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
            <Icon icon="lucide:hourglass" className="size-3 text-amber-500" />
            <span>Chờ phê duyệt</span>
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/80 shadow-xs">
            <Icon icon="lucide:file-edit" className="size-3" />
            <span>Bản nháp</span>
          </span>
        );
    }
  };

  const handleViewDetails = () => {
    toast.info(`[Giao diện mẫu] Xem chi tiết khóa học: "${course.title}".`);
  };

  return (
    <div className="group relative rounded-xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 transition-all duration-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Cụm Thumbnail & Thông tin khóa học */}
      <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
        {/* Ảnh Thumbnail 16:9 thu nhỏ w-20 h-12 */}
        <div className="relative w-20 h-12 rounded-lg overflow-hidden shrink-0 bg-muted/80 border border-border/50 flex items-center justify-center">
          {!imageError ? (
            <Image
              src={course.thumbnailUrl}
              alt={course.title}
              fill
              unoptimized
              sizes="80px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <Icon icon="lucide:video" className="size-5 text-muted-foreground/60" />
          )}
        </div>

        {/* Nội dung chi tiết */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className="font-semibold text-sm sm:text-base text-foreground truncate max-w-full hover:text-primary transition-colors cursor-pointer"
              title={course.title}
            >
              {course.title}
            </h4>
            {renderLevelBadge(course.level)}
          </div>

          {/* Dòng meta: Giá bán, Học viên, Doanh thu, Đánh giá sao */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{formattedPrice}</span>
            <span className="text-border">•</span>
            <span className="inline-flex items-center gap-1">
              <Icon icon="lucide:users" className="size-3 text-muted-foreground" />
              <span>{course.studentCount} học viên</span>
            </span>
            <span className="text-border">•</span>
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Icon icon="lucide:badge-dollar-sign" className="size-3 text-emerald-500" />
              <span>Doanh thu: {formattedRevenue}</span>
            </span>
            {course.rating > 0 && (
              <>
                <span className="text-border">•</span>
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                  <Icon icon="lucide:star" className="size-3 fill-amber-500 text-amber-500" />
                  <span>
                    {course.rating.toFixed(1)} ({course.reviewCount})
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cụm Trạng thái xuất bản & Nút Hành động */}
      <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-border/40 shrink-0">
        <div>{renderStatusBadge(course.status)}</div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleViewDetails}
          className="text-xs font-medium gap-1.5 cursor-pointer shadow-xs text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Icon icon="lucide:external-link" className="size-3.5" />
          <span>Chi tiết</span>
        </Button>
      </div>
    </div>
  );
}
