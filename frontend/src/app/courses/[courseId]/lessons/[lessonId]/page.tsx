import type { Metadata } from 'next';
import React from 'react';
import { LessonDetailContent } from '@/features/course';

export const metadata: Metadata = {
  title: 'Chi tiết bài học | DATN Portal',
  description: 'Xem thông tin và nội dung chi tiết bài học',
};

interface CourseLessonDetailPageProps {
  params: Promise<{
    courseId: string;
    lessonId: string;
  }>;
}

export default async function CourseLessonDetailPage({
  params,
}: CourseLessonDetailPageProps): Promise<React.JSX.Element> {
  const { courseId, lessonId } = await params;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <LessonDetailContent
        courseId={courseId}
        lessonId={lessonId}
        backUrl={`/instructor/courses/${courseId}`}
      />
    </main>
  );
}
