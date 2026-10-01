import type { Metadata } from 'next';
import React from 'react';
import { LessonDetailContent } from '@/features/course';

export const metadata: Metadata = {
  title: 'Chi tiết bài học | DATN Portal',
  description: 'Xem thông tin và nội dung chi tiết bài học',
};

interface InstructorLessonDetailPageProps {
  params: Promise<{
    id: string;
    lessonId: string;
  }>;
}

export default async function InstructorLessonDetailPage({
  params,
}: InstructorLessonDetailPageProps): Promise<React.JSX.Element> {
  const { id, lessonId } = await params;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <LessonDetailContent
        courseId={id}
        lessonId={lessonId}
        backUrl={`/instructor/courses/${id}`}
      />
    </main>
  );
}
