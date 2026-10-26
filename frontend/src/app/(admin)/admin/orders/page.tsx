import type { Metadata } from 'next';
import React from 'react';
import { AdminTabPlaceholder } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Quản Lý Đơn Hàng, Giao Dịch & Doanh Thu | DATN Portal Admin',
  description: 'Theo dõi đơn hàng, biến động giao dịch SePay và tổng hợp số liệu doanh thu',
};

export default function AdminOrdersPage(): React.JSX.Element {
  return (
    <AdminTabPlaceholder
      title="Quản lý Đơn hàng, Giao dịch & Doanh thu"
      description="Theo dõi đơn hàng, biến động giao dịch SePay và tổng hợp số liệu doanh thu."
      icon="lucide:receipt"
      badge="Tài chính & Doanh thu"
      stats={[
        { label: 'Đơn hàng hôm nay', value: '--', hint: 'Đăng ký mới', icon: 'lucide:shopping-bag' },
        { label: 'Giao dịch SePay', value: '--', hint: 'Thanh toán thành công', icon: 'lucide:badge-check' },
        { label: 'Doanh thu tháng', value: '--', hint: 'Tổng kết chu kỳ', icon: 'lucide:trending-up' },
        { label: 'Tỷ lệ hoàn tất', value: '--', hint: 'Giao dịch không lỗi', icon: 'lucide:percent' },
      ]}
    />
  );
}
