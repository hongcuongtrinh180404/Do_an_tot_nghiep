import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { PublicHeader, PublicFooter } from '@/features/course/components/public-discovery';
import { CourseCatalogView } from '@/features/course/components/catalog/course-catalog-view';

export const metadata: Metadata = {
  title: 'Tất cả khóa học | Mindly - Nền tảng E-Learning AI',
  description:
    'Duyệt toàn bộ khóa học công nghệ thông tin, marketing, thiết kế đồ họa, ngoại ngữ... tích hợp bộ công cụ trợ lý AI thông minh: tóm tắt Mindmap trực quan và In-video Quiz.',
};

function CatalogSkeleton(): React.JSX.Element {
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#fbfbfb] animate-pulse">
      <div className="h-36 bg-white border-b border-neutral-200" />
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        <div className="hidden lg:block w-72 h-96 bg-neutral-200/60 rounded-xl" />
        <div className="flex-1 space-y-4">
          <div className="h-10 bg-neutral-200/60 rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 pt-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-72 bg-neutral-200/60 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CoursesPageContent(): React.JSX.Element {
  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden flex flex-col bg-background text-foreground">
      {/* 1. Global Navigation Header */}
      <PublicHeader />

      {/* 2. Main Catalog View */}
      <main className="flex-1 flex flex-col">
        <CourseCatalogView />
      </main>

      {/* 3. Global Footer */}
      <PublicFooter />
    </div>
  );
}

export default function CoursesPage(): React.JSX.Element {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CoursesPageContent />
    </Suspense>
  );
}

