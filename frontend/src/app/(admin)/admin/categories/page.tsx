import type { Metadata } from 'next';
import React from 'react';
import { CategoriesView } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Quản Lý Danh Mục & Phân Loại | DATN Portal Admin',
  description: 'Danh sách phân loại sản phẩm và số lượng khóa học liên kết',
};

export default function AdminCategoriesPage(): React.JSX.Element {
  return <CategoriesView />;
}
