import type { Metadata } from 'next';
import * as React from 'react';
import { UserDetailsView } from '@/features/admin';

export const metadata: Metadata = {
  title: 'Chi Tiết Người Dùng | DATN Portal Admin',
  description: 'Thông tin chi tiết và cập nhật tài khoản người dùng hệ thống',
};

interface AdminUserDetailPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function AdminUserDetailPage({
  params,
}: AdminUserDetailPageProps): Promise<React.JSX.Element> {
  const resolvedParams = await params;

  return <UserDetailsView userId={resolvedParams.userId} />;
}
