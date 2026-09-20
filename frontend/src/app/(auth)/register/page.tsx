import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Đăng Ký Tài Khoản | Cổng Quản Lý Đồ Án Tốt Nghiệp',
  description: 'Tạo tài khoản mới để tham gia hệ thống quản lý đồ án tốt nghiệp',
};

export default function RegisterPage(): React.JSX.Element {
  return <RegisterForm />;
}
