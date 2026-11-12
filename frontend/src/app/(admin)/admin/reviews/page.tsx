import type { Metadata } from 'next';
import React from 'react';
import { AdminReviewsView } from '@/features/admin/reviews';

export const metadata: Metadata = {
  title: 'Kiểm Duyệt & Quản Lý Đánh Giá | DATN Portal Admin',
  description: 'Giám sát, tìm kiếm, lọc và kiểm duyệt đánh giá khóa học từ học viên',
};

export default function AdminReviewsPage(): React.JSX.Element {
  return (
    <div className="flex flex-col flex-1 min-h-0 h-full p-4 md:p-6 space-y-4">
      {/* Title & Description */}
      <div className="shrink-0 space-y-1">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
          Quản Lý & Kiểm Duyệt Đánh Giá Khóa Học
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Theo dõi toàn bộ đánh giá học viên trên hệ thống, xử lý phản ánh vi phạm và ẩn/khôi phục đánh giá minh bạch.
        </p>
      </div>

      {/* Main Interactive Table & Views */}
      <AdminReviewsView />
    </div>
  );
}
