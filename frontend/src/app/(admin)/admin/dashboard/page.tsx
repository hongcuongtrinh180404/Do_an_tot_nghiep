import type { Metadata } from 'next';
import React from 'react';
import { AdminTabPlaceholder } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Tổng quan | DATN Portal Admin',
  description: 'Trung tâm điều khiển và báo cáo các chỉ số vận hành tổng thể hệ thống',
};

export default function AdminDashboardPage(): React.JSX.Element {
  return (
    <AdminTabPlaceholder
      title="Tổng quan"
      description="Trung tâm điều khiển, theo dõi và báo cáo các chỉ số vận hành tổng thể hệ thống."
      icon="lucide:layout-dashboard"
      badge="Bảng điều khiển"
      stats={[
        { label: 'Tổng doanh thu', value: '--', hint: 'Đang kết nối cổng SePay', icon: 'lucide:dollar-sign' },
        { label: 'Tổng người dùng', value: '--', hint: 'Theo dõi thời gian thực', icon: 'lucide:users' },
        { label: 'Khóa học hoạt động', value: '--', hint: 'Đã xuất bản trên sàn', icon: 'lucide:book-open' },
        { label: 'Giao dịch hôm nay', value: '--', hint: 'Biến động thanh toán', icon: 'lucide:activity' },
      ]}
    />
  );
}
