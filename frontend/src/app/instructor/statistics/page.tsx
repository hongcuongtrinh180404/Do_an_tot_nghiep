import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { PublicHeader, PublicFooter } from '@/features/course/components/public-discovery';
import { InstructorCourseAccess } from '@/features/course/components/instructor-course-access';
import { TeachingStatsView } from '@/features/instructor/statistics';

export const metadata: Metadata = {
  title: 'Thống kê giảng dạy | Mindly - Nền tảng E-Learning AI',
  description:
    'Báo cáo và thống kê chuyên sâu về doanh thu khóa học, thu nhập sau hoa hồng, số lượt mua và đánh giá học viên dành riêng cho Giảng viên Mindly.',
};

function TeachingStatsSkeleton(): React.JSX.Element {
  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-8 space-y-8 animate-pulse">
      <div className="h-16 bg-muted/60 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-muted/60 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-muted/60 rounded-xl" />
      <div className="h-64 bg-muted/60 rounded-xl" />
    </div>
  );
}

export default function InstructorTeachingStatisticsPage(): React.JSX.Element {
  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-clip flex flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="flex-1 flex flex-col bg-gradient-to-b from-background via-background to-muted/20">
        <InstructorCourseAccess>
          <Suspense fallback={<TeachingStatsSkeleton />}>
            <TeachingStatsView />
          </Suspense>
        </InstructorCourseAccess>
      </main>
      <PublicFooter />
    </div>
  );
}

