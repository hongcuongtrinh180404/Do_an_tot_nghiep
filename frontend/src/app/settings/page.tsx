import type { Metadata } from 'next';
import React from 'react';
import { PublicHeader, PublicFooter } from '@/features/course/components/public-discovery';
import { SettingsPageContent } from '@/features/profile';

export const metadata: Metadata = {
  title: 'Cài Đặt Tài Khoản | Mindly',
  description: 'Quản lý bảo mật tài khoản, địa chỉ email và mật khẩu đăng nhập',
};

export default function SettingsPage(): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />
      <main className="flex-1">
        <SettingsPageContent />
      </main>
      <PublicFooter />
    </div>
  );
}

