import type { Metadata } from 'next';
import React from 'react';
import { LessonDetailContent } from '@/features/course';

export const metadata: Metadata = {
  title: 'Chi tiết bài học | Mindly - Nền tảng E-Learning AI',
  description: 'Xem thông tin và nội dung chi tiết bài giảng, video AI và tài liệu học tập',
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
    <main className="min-h-[100dvh] w-full bg-background text-foreground overflow-y-auto">
      <LessonDetailContent
        courseId={courseId}
        lessonId={lessonId}
        backUrl={`/courses/${courseId}`}
      />
    </main>
  );
}
