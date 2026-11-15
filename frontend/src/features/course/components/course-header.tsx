import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

export function CourseHeader(): React.JSX.Element {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">
          <Link
            href="/"
            className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors flex items-center gap-1"
          >
            <Icon icon="lucide:home" className="size-3.5" />
            <span>Trang Chủ</span>
          </Link>
          <span className="text-neutral-300 dark:text-neutral-600">/</span>
          <span className="text-neutral-900 dark:text-neutral-100 font-medium">Khóa Học Của Tôi</span>
        </div>

        {/* Title & Description */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Khóa học của tôi
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Quản lý danh sách các khóa học bạn đang giảng dạy và xây dựng nội dung bài giảng
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-colors"
        >
          <Icon icon="lucide:arrow-left" className="size-3.5" />
          <span>Về Trang Chủ</span>
        </Link>
        <Link
          href="/courses/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold transition-colors shadow-xs"
        >
          <Icon icon="lucide:plus" className="size-3.5" />
          <span>Tạo khóa học</span>
        </Link>
      </div>
    </div>
  );
}

