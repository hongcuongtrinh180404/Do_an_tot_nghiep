import type { Metadata } from 'next';
import * as React from 'react';
import { InstructorDetailView } from '@/features/admin/revenue';

export const metadata: Metadata = {
  title: 'Chi Tiết Doanh Thu Giảng Viên | Mindly Admin',
  description: 'Thống kê chi tiết doanh thu, khóa học, giao dịch và quản lý hoa hồng của giảng viên',
};

interface AdminInstructorRevenueDetailPageProps {
  params: Promise<{
    instructorId: string;
  }>;
}

export default async function AdminInstructorRevenueDetailPage({
  params,
}: AdminInstructorRevenueDetailPageProps): Promise<React.JSX.Element> {
  const resolvedParams = await params;

  return (
    <React.Suspense
      fallback={
        <div className="flex-1 p-8 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
          Đang tải chi tiết doanh thu giảng viên...
        </div>
      }
    >
      <InstructorDetailView instructorId={resolvedParams.instructorId} />
    </React.Suspense>
  );
}

