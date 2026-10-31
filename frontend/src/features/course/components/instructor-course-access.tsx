'use client';

import React from 'react';
import Link from 'next/link';
import { RoleEnum } from 'share-lib';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { buttonVariants } from '@/components/ui/button';

export function InstructorCourseAccess({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const isMounted = useIsMounted();
  const { data: user, isLoading, isError, refetch } = useCurrentUserQuery();

  if (!isMounted || isLoading) {
    return (
      <div role="status" className="px-4 py-16 text-center text-sm text-muted-foreground">
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-semibold">Không thể kiểm tra quyền truy cập</h1>
        <p className="text-sm text-muted-foreground">Vui lòng thử lại hoặc đăng nhập lại.</p>
        <button type="button" onClick={() => void refetch()} className={buttonVariants({ variant: 'outline' })}>
          Thử lại
        </button>
        <Link href="/login" className={buttonVariants({ variant: 'ghost' })}>Đăng nhập</Link>
      </div>
    );
  }

  if (user?.role !== RoleEnum.INSTRUCTOR) {
    return (
      <div className="px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-semibold">{user ? 'Không có quyền truy cập' : 'Vui lòng đăng nhập'}</h1>
        <p className="text-sm text-muted-foreground">
          Chỉ giảng viên được quản lý và tạo khóa học để bán.
        </p>
        <Link href={user ? '/' : '/login'} className={buttonVariants({ variant: 'outline' })}>
          {user ? 'Về trang chủ' : 'Đăng nhập'}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
