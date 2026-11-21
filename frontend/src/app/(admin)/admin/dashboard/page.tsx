import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import { AdminDashboardView } from '@/features/admin/dashboard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tổng quan | DATN Portal Admin',
  description: 'Trung tâm điều khiển và báo cáo các chỉ số vận hành tổng thể hệ thống',
};

export default function AdminDashboardPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex-1 p-8 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
          Đang tải dữ liệu tổng quan quản trị...
        </div>
      }
    >
      <AdminDashboardView />
    </Suspense>
  );
}
