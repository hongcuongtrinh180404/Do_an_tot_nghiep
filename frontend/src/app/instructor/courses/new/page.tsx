import type { Metadata } from 'next';
import React from 'react';
import { CreateCourseHeader, CreateCourseForm } from '@/features/course';

export const metadata: Metadata = {
  title: 'Tạo khóa học mới | DATN Portal',
  description: 'Biên soạn và thiết lập thông tin cơ bản cho khóa học mới dành cho giảng viên',
};

export default function CreateCoursePage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <CreateCourseHeader />
        <CreateCourseForm />
      </div>
    </main>
  );
}
