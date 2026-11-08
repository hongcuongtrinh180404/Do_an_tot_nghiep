import type { Metadata } from 'next';
import React from 'react';
import { LessonDetailContent } from '@/features/course';
import { getCourseUrl, parseCourseViewMode } from '@/features/course/utils/course-view-mode.util';

export const metadata: Metadata = {
  title: 'Chi tiết bài học | Mindly - Nền tảng E-Learning AI',
  description: 'Xem thông tin và nội dung chi tiết bài giảng, video AI và tài liệu học tập',
};

interface CourseLessonDetailPageProps {
  params: Promise<{
    courseId: string;
    lessonId: string;
  }>;
  searchParams?: Promise<{ mode?: string | string[] }>;
}

export default async function CourseLessonDetailPage({
  params,
  searchParams,
}: CourseLessonDetailPageProps): Promise<React.JSX.Element> {
  const { courseId, lessonId } = await params;
  const mode = parseCourseViewMode((await searchParams)?.mode);

  return (
    <main className="min-h-[100dvh] w-full bg-background text-foreground overflow-y-auto">
      <LessonDetailContent
        key={`${lessonId}:${mode}`}
        courseId={courseId}
        lessonId={lessonId}
        mode={mode}
        backUrl={getCourseUrl(courseId, mode)}
      />
    </main>
  );
}
