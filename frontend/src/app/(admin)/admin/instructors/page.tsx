import type { Metadata } from 'next';
import React from 'react';
import { AdminInstructorsView } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Phê Duyệt Giảng Viên | DATN Portal Admin',
  description: 'Kiểm duyệt hồ sơ đăng ký giảng viên và thiết lập điều khoản thỏa thuận',
};

export default function AdminInstructorsPage(): React.JSX.Element {
  return <AdminInstructorsView />;
}
