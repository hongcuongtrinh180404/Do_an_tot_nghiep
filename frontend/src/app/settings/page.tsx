import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import { PublicHeader, PublicFooter } from '@/features/course/components/public-discovery';
import { SettingsPageContent } from '@/features/profile';

export const metadata: Metadata = {
  title: 'Cài Đặt Tài Khoản | Mindly',
  description: 'Quản lý bảo mật tài khoản, địa chỉ email và mật khẩu đăng nhập',
};

export default function SettingsPage(): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Suspense fallback={<div className="h-16 w-full bg-neutral-900" />}>
        <PublicHeader />
      </Suspense>
      <main className="flex-1">
        <SettingsPageContent />
      </main>
      <PublicFooter />
    </div>
  );
}
