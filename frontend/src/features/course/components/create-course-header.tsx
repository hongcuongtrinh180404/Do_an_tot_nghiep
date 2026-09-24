import React from 'react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

export function CreateCourseHeader(): React.JSX.Element {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
      <div>
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 flex-wrap">
          <Link
            href="/"
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Icon icon="lucide:home" className="size-3.5" />
            Trang Chủ
          </Link>
          <span>/</span>
          <Link
            href="/instructor/courses"
            className="hover:text-foreground transition-colors"
          >
            Giảng Viên
          </Link>
          <span>/</span>
          <Link
            href="/instructor/courses"
            className="hover:text-foreground transition-colors"
          >
            Khóa Học Của Tôi
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Tạo Mới</span>
        </div>

        {/* Title & Description */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Tạo khóa học mới
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Điền các thông tin cơ bản để bắt đầu khởi tạo khóa học và xây dựng lộ trình học tập
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Link
          href="/instructor/courses"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <Icon icon="lucide:arrow-left" className="size-3.5 mr-1.5" />
          Quay lại danh sách
        </Link>
      </div>
    </div>
  );
}
