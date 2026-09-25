import type { Metadata } from 'next';
import React from 'react';
import { CourseDetailContent } from '@/features/course';

export const metadata: Metadata = {
  title: 'Chi tiết khóa học | DATN Portal',
  description: 'Xem thông tin chi tiết khóa học của giảng viên',
};

interface InstructorCourseDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InstructorCourseDetailPage({
  params,
}: InstructorCourseDetailPageProps): Promise<React.JSX.Element> {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <CourseDetailContent courseId={id} />
    </main>
  );
}
