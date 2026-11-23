'use client';

import * as React from 'react';
import Image from 'next/image';
import { LearningStatusEnum, OrderStatusEnum, type IAdminUserEnrolledCourse } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

interface UserEnrolledCourseCardProps {
  course: IAdminUserEnrolledCourse;
}

const PAYMENT_LABELS: Record<OrderStatusEnum, string> = {
  [OrderStatusEnum.PAID]: 'Đã thanh toán',
  [OrderStatusEnum.PENDING]: 'Chờ thanh toán',
  [OrderStatusEnum.CANCELLED]: 'Đơn đã hủy',
  [OrderStatusEnum.EXPIRED]: 'Đơn hết hạn',
};

export function UserEnrolledCourseCard({ course }: UserEnrolledCourseCardProps): React.JSX.Element {
  const [imageError, setImageError] = React.useState(false);

  // Format ngày mua theo chuẩn vi-VN
  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date(course.paidAt ?? course.enrolledAt);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('vi-VN');
    } catch {
      return '—';
    }
  }, [course.paidAt, course.enrolledAt]);

  // Format số tiền theo chuẩn vi-VN
  const formattedPrice = React.useMemo(() => {
    if (course.isFree) return 'Miễn phí';
    if (course.price === null) return 'Chưa có dữ liệu số tiền';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(course.price);
  }, [course.price, course.isFree]);

  // Xác định badge trạng thái học tập
  const renderStatusBadge = () => {
    if (course.status === LearningStatusEnum.COMPLETED) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
          <Icon icon="lucide:trophy" className="size-3 text-emerald-500" />
          <span>Hoàn thành</span>
        </span>
      );
    }

    if (course.status === LearningStatusEnum.IN_PROGRESS) {
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

  return (
    <div className="group relative rounded-xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 transition-all duration-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Cụm Thông Tin Khóa Học (Thumbnail + Nội Dung) */}
      <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
        {/* Ảnh Thumbnail 16:9 thu nhỏ w-20 h-12 */}
        <div className="relative w-20 h-12 rounded-lg overflow-hidden shrink-0 bg-muted/80 border border-border/50 flex items-center justify-center">
          {course.thumbnailUrl && !imageError ? (
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
              className="font-semibold text-sm sm:text-base text-foreground truncate max-w-full"
              title={course.title}
            >
              {course.title}
            </h4>
          </div>

          {/* Dòng meta: Ngày mua, Số tiền, Trạng thái thanh toán */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{course.paidAt ? 'Thanh toán ngày' : 'Đăng ký ngày'}: {formattedDate}</span>
            <span className="text-border">•</span>
            <span className="font-medium text-foreground">{formattedPrice}</span>
            <span className="text-border">•</span>
            <span className={`inline-flex items-center gap-1 font-medium ${
              course.isFree || course.paymentStatus === OrderStatusEnum.PAID
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              <span className="size-1.5 rounded-full bg-current" />
              {course.isFree ? 'Đăng ký miễn phí'
                : course.paymentStatus ? PAYMENT_LABELS[course.paymentStatus] : 'Chưa xác minh thanh toán'}
            </span>
          </div>

          {/* Thanh Tiến Độ Học Tập (Linear Progress Bar) */}
          <div className="pt-1 max-w-md">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs mb-1">
              <span className="text-[11px] text-muted-foreground">Tiến độ khóa học:</span>
              <span className="font-mono text-xs font-medium text-foreground">
                {course.progressPercent === null ? '—' : `${course.progressPercent}%`}{' '}
                <span className="text-muted-foreground font-normal">
                  {course.totalLessons > 0
                    ? `(${course.completedLessons}/${course.totalLessons} bài video)`
                    : '(Chưa có bài video để tính tiến độ)'}
                </span>
              </span>
            </div>
            {/* Thanh bar thanh mảnh - Gradient Xanh ngọc / Teal (Tuân thủ Purple Ban) */}
            <div
              role="progressbar"
              aria-label={`Tiến độ học ${course.title}`}
              aria-valuenow={course.progressPercent ?? undefined}
              aria-valuetext={course.progressPercent === null ? 'Chưa có bài video để tính tiến độ' : undefined}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 w-full bg-muted rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${course.progressPercent ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cụm Trạng Thái & Nút Hành Động Phía Bên Phải */}
      <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-border/40 shrink-0">
        {/* Status Badge */}
        <div>{renderStatusBadge()}</div>

        {/* Reading real data must not pretend that an unsupported revoke operation succeeded. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className="text-destructive border-border/80 text-xs font-medium gap-1.5 shadow-xs"
          title="Thu hồi quyền học chưa được hỗ trợ tại trang này"
        >
          <Icon icon="lucide:shield-ban" className="size-3.5 text-destructive" />
          <span>Gỡ quyền truy cập</span>
        </Button>
      </div>
    </div>
  );
}
