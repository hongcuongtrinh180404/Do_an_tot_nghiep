import React from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

export function CourseHeader(): React.JSX.Element {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
      <div>
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
          <Link
            href="/"
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Icon icon="lucide:home" className="size-3.5" />
            Trang Chủ
          </Link>
          <span>/</span>
          <span>Giảng Viên</span>
          <span>/</span>
          <span className="text-foreground font-medium">Khóa Học Của Tôi</span>
        </div>

        {/* Title & Description */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Khóa học của tôi
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Quản lý danh sách các khóa học bạn đang giảng dạy và xây dựng nội dung bài giảng
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Link
          href="/"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <Icon icon="lucide:arrow-left" className="size-3.5 mr-1.5" />
          Về Trang Chủ
        </Link>
        <Button size="sm">
          <Icon icon="lucide:plus" className="size-3.5 mr-1" />
          Tạo khóa học
        </Button>
      </div>
    </div>
  );
}
