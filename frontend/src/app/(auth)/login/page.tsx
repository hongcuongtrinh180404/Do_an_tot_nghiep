import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Đăng Nhập | Cổng Quản Lý Đồ Án Tốt Nghiệp',
  description: 'Đăng nhập vào hệ thống quản lý đồ án tốt nghiệp đại học',
};

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense fallback={<p role="status">Đang tải trang đăng nhập…</p>}>
      <LoginForm />
    </Suspense>
  );
}
