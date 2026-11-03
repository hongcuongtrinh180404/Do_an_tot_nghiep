import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { VerifyEmailChangeContent, AuthCardWrapper } from '@/features/auth';
import { Icon } from '@/components/ui/icon';

export const metadata: Metadata = {
  title: 'Xác Nhận Thay Đổi Email | Mindly',
  description: 'Xác nhận và kích hoạt địa chỉ email mới cho tài khoản Mindly của bạn',
};

function VerifyEmailChangeFallback(): React.JSX.Element {
  return (
    <AuthCardWrapper
      headerTitle="Đang Tải..."
      headerDescription="Vui lòng đợi trong giây lát"
      backButtonLabel="Gặp sự cố?"
      backButtonText="Quay lại đăng nhập"
      backButtonHref="/login"
    >
      <div className="py-8 space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon icon="lucide:loader-2" className="size-6 animate-spin" />
        </div>
        <p className="text-xs text-muted-foreground">Đang tải thông tin xác nhận...</p>
      </div>
    </AuthCardWrapper>
  );
}

export default function VerifyEmailChangePage(): React.JSX.Element {
  return (
    <Suspense fallback={<VerifyEmailChangeFallback />}>
      <VerifyEmailChangeContent />
    </Suspense>
  );
}

