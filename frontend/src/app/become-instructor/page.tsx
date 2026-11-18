import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PublicHeader } from '@/features/course/components/public-discovery/public-header';
import { PublicFooter } from '@/features/course/components/public-discovery/public-footer';
import { BecomeInstructorView } from '@/features/instructor-application/components/become-instructor-view';

export const metadata: Metadata = {
  title: 'Trở thành giảng viên | Mindly',
  description:
    'Chia sẻ kiến thức trên Mindly với bài giảng video, sơ đồ tư duy và câu hỏi tương tác. Tìm hiểu cách đăng ký trở thành giảng viên.',
};

export default function BecomeInstructorPage(): React.JSX.Element {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-white text-[#161616]">
      <Suspense fallback={<div className="h-[68px] sm:h-[72px] bg-[#161616]" />}>
        <PublicHeader />
      </Suspense>
      <Suspense fallback={
        <main className="flex-1 px-6 py-20" aria-busy="true">
          <h1 className="text-3xl font-bold">Trở thành giảng viên</h1>
          <p role="status" className="mt-4">Đang tải thông tin đăng ký…</p>
        </main>
      }>
        <BecomeInstructorView />
      </Suspense>
      <PublicFooter />
    </div>
  );
}
