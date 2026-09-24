import type { Metadata } from 'next';
import React from 'react';
import { CourseManagementContent } from '@/features/course';

export const metadata: Metadata = {
  title: 'Khóa học của tôi | DATN Portal',
  description: 'Quản lý danh sách khóa học dành cho giảng viên',
};

export default function InstructorCoursesPage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <CourseManagementContent />
    </main>
  );
}
