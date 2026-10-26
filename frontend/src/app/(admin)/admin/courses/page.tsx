import type { Metadata } from 'next';
import React from 'react';
import { AdminTabPlaceholder } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Quản Lý & Phê Duyệt Khóa Học | DATN Portal Admin',
  description: 'Kiểm duyệt chất lượng nội dung và trạng thái xuất bản các khóa học',
};

export default function AdminCoursesPage(): React.JSX.Element {
  return (
    <AdminTabPlaceholder
      title="Quản lý & Phê duyệt Khóa học"
      description="Kiểm duyệt, quản lý nội dung và trạng thái xuất bản của các khóa học trên nền tảng."
      icon="lucide:book-open-check"
      badge="Khóa học"
      stats={[
        { label: 'Chờ phê duyệt', value: '--', hint: 'Khóa học mới gửi duyệt', icon: 'lucide:clock' },
        { label: 'Đang xuất bản', value: '--', hint: 'Khóa học công khai', icon: 'lucide:check-circle-2' },
        { label: 'Bị từ chối / Khiếu nại', value: '--', hint: 'Cần giảng viên chỉnh sửa', icon: 'lucide:alert-circle' },
        { label: 'Tổng lượt đăng ký', value: '--', hint: 'Lượt học viên tham gia', icon: 'lucide:graduation-cap' },
      ]}
    />
  );
}
