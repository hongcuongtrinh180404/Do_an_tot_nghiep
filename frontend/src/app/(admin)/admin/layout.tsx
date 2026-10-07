import type { Metadata } from 'next';
import React from 'react';
import { AdminGuard, AdminLayout } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Quản Trị Hệ Thống | DATN Portal',
  description: 'Cổng quản trị hệ thống Đồ án tốt nghiệp',
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <AdminGuard>
      <AdminLayout>{children}</AdminLayout>
    </AdminGuard>
  );
}
