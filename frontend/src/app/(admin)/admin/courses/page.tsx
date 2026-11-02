import type { Metadata } from 'next';
import React from 'react';
import { AdminCoursesView } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Quản Lý & Phê Duyệt Khóa Học | DATN Portal Admin',
  description: 'Kiểm duyệt chất lượng nội dung và trạng thái xuất bản các khóa học',
};

export default function AdminCoursesPage(): React.JSX.Element {
  return <AdminCoursesView />;
}
