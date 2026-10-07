import type { Metadata } from 'next';
import React from 'react';
import { AdminUsersPlaceholder } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Quản Lý Người Dùng | DATN Portal Admin',
  description: 'Trang quản lý danh sách người dùng và phân quyền hệ thống',
};

export default function AdminUsersPage(): React.JSX.Element {
  return <AdminUsersPlaceholder />;
}
