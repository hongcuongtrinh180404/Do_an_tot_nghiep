import type { Metadata } from 'next';
import React from 'react';
import { AdminTabPlaceholder } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Quản Lý Khuyến Mãi & Mã Giảm Giá | DATN Portal Admin',
  description: 'Quản lý chiến dịch ưu đãi học phí và mã giảm giá',
};

export default function AdminPromotionsPage(): React.JSX.Element {
  return (
    <AdminTabPlaceholder
      title="Quản lý Khuyến mãi & Mã giảm giá"
      description="Quản lý chiến dịch ưu đãi, mã giảm giá voucher và chính sách giá đặc biệt."
      icon="lucide:ticket-percent"
      badge="Ưu đãi & Voucher"
      stats={[
        { label: 'Mã đang hiệu lực', value: '--', hint: 'Khả dụng trên hệ thống', icon: 'lucide:tag' },
        { label: 'Lượt đã áp dụng', value: '--', hint: 'Học viên đã dùng', icon: 'lucide:badge-percent' },
        { label: 'Chiến dịch chạy', value: '--', hint: 'Đang diễn ra', icon: 'lucide:sparkles' },
        { label: 'Tổng chiết khấu', value: '--', hint: 'Giá trị ưu đãi', icon: 'lucide:gift' },
      ]}
    />
  );
}
