import type { Metadata } from 'next';
import React from 'react';
import { ProfilePageContent } from '@/features/profile';

export const metadata: Metadata = {
  title: 'Hồ Sơ Cá Nhân | DATN Portal',
  description: 'Quản lý thông tin tài khoản và ảnh đại diện cá nhân lưu trữ Cloudinary',
};

export default function ProfilePage(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <ProfilePageContent />
    </main>
  );
}
