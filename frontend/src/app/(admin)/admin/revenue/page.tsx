import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import { RevenueView } from '@/features/admin/revenue';

export const metadata: Metadata = {
  title: 'Quản Lý Đơn Hàng, Giao Dịch & Doanh Thu | Mindly Admin',
  description: 'Thống kê doanh thu toàn hệ thống, biến động giao dịch SePay và quản lý hoa hồng giảng viên',
};

export default function AdminRevenuePage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex-1 p-8 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
          Đang tải trung tâm doanh thu...
        </div>
      }
    >
      <RevenueView />
    </Suspense>
  );
}

