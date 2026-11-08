import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import { CourseDetailContent } from '@/features/course';
import { PublicHeader, PublicFooter } from '@/features/course/components/public-discovery';
import { PublicCourseDetailView } from '@/features/course/components/public-detail/public-course-detail-view';
import { parseCourseViewMode } from '@/features/course/utils/course-view-mode.util';

export const metadata: Metadata = {
  title: 'Chi tiết khóa học | Mindly - Nền tảng E-Learning AI',
  description: 'Xem thông tin chi tiết bài giảng, sơ đồ tư duy và đăng ký học tập',
};

interface CourseDetailPageProps {
  params: Promise<{
    courseId: string;
  }>;
  searchParams?: Promise<{
    mode?: string | string[];
  }>;
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: CourseDetailPageProps): Promise<React.JSX.Element> {
  const { courseId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isEditMode = parseCourseViewMode(resolvedSearchParams.mode) === 'edit';

  if (isEditMode) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <CourseDetailContent courseId={courseId} />
      </main>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background text-foreground">
      <Suspense fallback={<div className="h-16 w-full bg-neutral-900" />}>
        <PublicHeader />
      </Suspense>

      <main className="flex-1">
        <PublicCourseDetailView courseId={courseId} />
      </main>

      <PublicFooter />
    </div>
  );
}
