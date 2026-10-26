'use client';

import * as React from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { type EnrolledCourseItem } from '../constants/mock-enrolled-courses';

interface UserEnrolledCourseCardProps {
  course: EnrolledCourseItem;
}

export function UserEnrolledCourseCard({ course }: UserEnrolledCourseCardProps): React.JSX.Element {
  const [imageError, setImageError] = React.useState(false);

  // Format ngày mua theo chuẩn vi-VN
  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(course.purchaseDate);
      if (isNaN(d.getTime())) return course.purchaseDate;
      return d.toLocaleDateString('vi-VN');
    } catch {
      return course.purchaseDate;
    }
  }, [course.purchaseDate]);

  // Format số tiền theo chuẩn vi-VN
  const formattedPrice = React.useMemo(() => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(course.price);
  }, [course.price]);

  // Xác định badge trạng thái học tập
  const renderStatusBadge = () => {
    if (course.progressPercent === 100) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
          <Icon icon="lucide:trophy" className="size-3 text-emerald-500" />
          <span>Hoàn thành</span>
        </span>
      );
    }

    if (course.progressPercent > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shadow-xs">
          <Icon icon="lucide:play-circle" className="size-3 text-sky-500" />
          <span>Đang học</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/80 shadow-xs">
        <Icon icon="lucide:clock-3" className="size-3" />
        <span>Chưa học</span>
      </span>
    );
  };

  // Demo feedback khi bấm nút gỡ quyền
  const handleRevokeDemo = () => {
    toast.info(`[Giao diện mẫu] Đã bấm gỡ quyền truy cập: "${course.title}". Chưa áp dụng logic xử lý.`);
  };

  return (
    <div className="group relative rounded-xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 transition-all duration-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Cụm Thông Tin Khóa Học (Thumbnail + Nội Dung) */}
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
          <div className="flex items-center gap-2">
            <h4
              className="font-semibold text-sm sm:text-base text-foreground truncate max-w-full hover:text-primary transition-colors cursor-pointer"
              title={course.title}
            >
              {course.title}
            </h4>
          </div>

          {/* Dòng meta: Ngày mua, Số tiền, Trạng thái thanh toán */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>Mua ngày: {formattedDate}</span>
            <span className="text-border">•</span>
            <span className="font-medium text-foreground">{formattedPrice}</span>
            <span className="text-border">•</span>
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Đã kích hoạt
            </span>
          </div>

          {/* Thanh Tiến Độ Học Tập (Linear Progress Bar) */}
          <div className="pt-1 max-w-md">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[11px] text-muted-foreground">Tiến độ khóa học:</span>
              <span className="font-mono text-xs font-medium text-foreground">
                {course.progressPercent}%{' '}
                <span className="text-muted-foreground font-normal">
                  ({course.completedLessons}/{course.totalLessons} bài học)
                </span>
              </span>
            </div>
            {/* Thanh bar thanh mảnh - Gradient Xanh ngọc / Teal (Tuân thủ Purple Ban) */}
            <div
              role="progressbar"
              aria-valuenow={course.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 w-full bg-muted rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${course.progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cụm Trạng Thái & Nút Hành Động Phía Bên Phải */}
      <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-border/40 shrink-0">
        {/* Status Badge */}
        <div>{renderStatusBadge()}</div>

        {/* Nút Gỡ quyền truy cập (Revoke Button) - Chỉ hiển thị UI */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRevokeDemo}
          className="text-destructive hover:bg-destructive/10 hover:border-destructive/30 border-border/80 text-xs font-medium gap-1.5 cursor-pointer shadow-xs"
          title="Gỡ quyền truy cập (Dùng khi hoàn tiền hoặc hủy đơn)"
        >
          <Icon icon="lucide:shield-ban" className="size-3.5 text-destructive" />
          <span>Gỡ quyền truy cập</span>
        </Button>
      </div>
    </div>
  );
}
