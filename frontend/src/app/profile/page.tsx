import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import { PublicHeader, PublicFooter } from '@/features/course/components/public-discovery';
import { ProfilePageContent } from '@/features/profile';

export const metadata: Metadata = {
  title: 'Hồ Sơ Cá Nhân | Mindly',
  description: 'Quản lý thông tin tài khoản, ảnh đại diện và thông tin cá nhân',
};

export default function ProfilePage(): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Suspense fallback={<div className="h-16 w-full bg-neutral-900" />}>
        <PublicHeader />
      </Suspense>
      <main className="flex-1">
        <ProfilePageContent />
      </main>
      <PublicFooter />
    </div>
  );
}
